/*
    AetherVane (The Ultrasonic Ghost-Mesh Protocol)
    Copyright (C) 2026 Vikram Kumar Sinha (thevikramsinha.github.io/aethervane/)
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    See <https://www.gnu.org/licenses/> for more details.

    MODULE: APPLICATION CONTROLLER (UI & Protocol Logic)
*/

document.addEventListener('DOMContentLoaded', () => {
    const app = new AetherController();
    app.init();
});

class AetherController {
    constructor() {
        this.termOutput = document.getElementById('terminal-output');
        this.statusAudio = document.getElementById('audio-status');
        this.inputTarget = document.getElementById('target-id');
        this.inputMsg = document.getElementById('message-input');
        this.btnSend = document.getElementById('send-btn');
        this.btnListen = document.getElementById('listen-btn');
        this.btnScan = document.getElementById('scan-btn');
        this.btnInstall = document.getElementById('install-btn');
        this.peerList = document.getElementById('peer-list');

        this.engine = new AetherAudioEngine();
        this.crypto = new AetherCrypto();
        
        this.deviceID = this.generateDeviceID();
        this.knownPeers = new Set();
        this.securePeers = new Set(); 
        this.deferredPrompt = null;
        this.BROADCAST_ID = '0000';
        this.DISCOVERY_ID = 'FFFF';
    }

    async init() {
        this.logSystem(`Identity Assigned: <strong>${this.deviceID}</strong>`);
        await this.crypto.init();
        
        this.btnListen.addEventListener('click', () => this.toggleListening());
        this.btnSend.addEventListener('click', () => this.handleSend());
        this.btnScan.addEventListener('click', () => this.performScan());
        this.inputMsg.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleSend(); });
        this.btnInstall.addEventListener('click', () => this.installPWA());
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.btnInstall.style.display = 'block';
        });

        this.engine.onLog = (msg) => console.log(msg); // Keep console clean, specific sys-msgs below
        this.engine.onCorrection = (c) => this.logSystem(`FEC repaired ${c} bits.`);
        this.engine.onMessageReceived = (p) => this.handleIncomingPacket(p);
        
        document.title = `AetherVane [${this.deviceID}]`;
        this.inputTarget.placeholder = `My ID: ${this.deviceID}`;
    }

    /* --- PROTOCOL LOGIC --- */

    async handleIncomingPacket(packet) {
        const { target, sender, payload } = packet;
        const isMe = target === this.deviceID;

        // Sonar Logic
        if (target === this.DISCOVERY_ID && payload === "PING" && sender !== this.deviceID) {
            this.sendDiscoveryAck(sender);
            return;
        }
        if (isMe && payload === "ACK") {
            this.addPeer(sender);
            return;
        }

        // Handshake Logic (Request)
        if (isMe && payload.startsWith("KEY_REQ:")) {
            try {
                const sharedKey = await this.crypto.computeSharedSecret(payload.split(':')[1]);
                this.crypto.sessionKeys.set(sender, sharedKey);
                this.securePeers.add(sender);
                
                const myPubKey = await this.crypto.getPublicKeyRaw();
                await this.engine.transmit(sender, this.deviceID, `KEY_ACK:${myPubKey}`);
                
                this.markPeerSecure(sender);
                this.logSystem(`Secure handshake established with ${sender}.`);
            } catch (e) { console.error(e); }
            return;
        }

        // Handshake Logic (Reply)
        if (isMe && payload.startsWith("KEY_ACK:")) {
            try {
                const sharedKey = await this.crypto.computeSharedSecret(payload.split(':')[1]);
                this.crypto.sessionKeys.set(sender, sharedKey);
                this.securePeers.add(sender);
                
                this.markPeerSecure(sender);
                this.logSystem(`Connection to ${sender} is now encrypted.`);
            } catch (e) { console.error(e); }
            return;
        }

        // Message Logic
        if (isMe && payload.includes(':') && this.securePeers.has(sender)) {
            try {
                const plaintext = await this.crypto.decryptMessage(sender, payload);
                this.renderMessage(plaintext, 'in', `<span style="color:#ffd700">🔒 SECURE</span> from ${sender}`);
            } catch (e) {
                this.renderMessage("Decryption Error", 'in', `ERROR from ${sender}`);
            }
        } else if (isMe || target === this.BROADCAST_ID) {
            const meta = this.securePeers.has(sender) ? `⚠️ UNENCRYPTED` : `OPEN from ${sender}`;
            this.renderMessage(payload, 'in', meta);
            this.addPeer(sender);
        }
    }

    async handleSend() {
        const target = this.inputTarget.value.trim().toUpperCase();
        const msg = this.inputMsg.value.trim();
        if (!msg) return;
        
        this.setBusyState(true);
        try {
            let payload = msg;
            let meta = `To ${target}`;

            if (this.securePeers.has(target)) {
                payload = await this.crypto.encryptMessage(target, msg);
                meta += ` <span style="color:#ffd700">🔒 AES-256</span>`;
            }

            this.renderMessage(msg, 'out', meta);
            this.inputMsg.value = '';
            await this.engine.transmit(target, this.deviceID, payload);
        } catch (e) {
            this.logSystem(`Error: ${e.message}`);
        } finally {
            this.setBusyState(false);
        }
    }

    /* --- UI HELPERS --- */

    async toggleListening() {
        if (!this.engine.isListening) {
            this.btnListen.textContent = 'Starting...';
            await this.engine.startListening();
            this.btnListen.textContent = 'Receiver Active';
            this.btnListen.classList.add('active'); 
            this.statusAudio.textContent = 'LISTENING';
            this.statusAudio.classList.add('active');
        }
    }

    async performScan() {
        if (!this.engine.isListening) { this.logSystem("Enable Receiver First."); return; }
        this.btnScan.disabled = true;
        this.btnScan.innerHTML = `<span class="icon">⏳</span> Scanning...`;
        await this.engine.transmit(this.DISCOVERY_ID, this.deviceID, "PING");
        setTimeout(() => { this.btnScan.disabled = false; this.btnScan.innerHTML = `<span class="icon">📡</span> Scan`; }, 5000);
    }

    async sendDiscoveryAck(target) {
        setTimeout(async () => {
            await this.engine.transmit(target, this.deviceID, "ACK");
        }, Math.random() * 2000);
    }

    addPeer(id) {
        if (this.knownPeers.has(id)) return;
        this.knownPeers.add(id);
        
        const tag = document.createElement('div');
        tag.className = 'peer-tag';
        tag.dataset.id = id;
        tag.innerHTML = `<span>👤</span> ${id}`;
        
        tag.onclick = () => { this.inputTarget.value = id; this.inputMsg.focus(); };
        tag.oncontextmenu = (e) => { e.preventDefault(); this.initiateHandshake(id); };
        
        this.peerList.appendChild(tag);
        const empty = this.peerList.querySelector('.empty-state');
        if (empty) empty.remove();
    }

    async initiateHandshake(targetID) {
        if (!confirm(`Start Secure Handshake with ${targetID}?`)) return;
        try {
            const myKey = await this.crypto.getPublicKeyRaw();
            this.setBusyState(true);
            await this.engine.transmit(targetID, this.deviceID, `KEY_REQ:${myKey}`);
        } catch(e) { this.logSystem(e.message); } finally { this.setBusyState(false); }
    }

    markPeerSecure(id) {
        const tags = document.querySelectorAll('.peer-tag');
        tags.forEach(t => {
            if (t.dataset.id === id) {
                t.classList.add('secure');
                t.innerHTML = `<span>🔒</span> ${id}`;
            }
        });
    }

    renderMessage(text, direction, meta) {
        const div = document.createElement('div');
        div.className = `msg-row msg-${direction}`;
        div.innerHTML = `<span class="msg-meta">${meta}</span>${text}`;
        this.termOutput.appendChild(div);
        this.scrollToBottom();
    }

    logSystem(msg) {
        const div = document.createElement('div');
        div.className = 'sys-msg';
        div.innerHTML = msg;
        this.termOutput.appendChild(div);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const w = document.getElementById('terminal-output');
        w.scrollTop = w.scrollHeight;
    }

    setBusyState(isBusy) {
        this.btnSend.disabled = isBusy;
        this.statusAudio.textContent = isBusy ? 'TX BUSY' : 'LISTENING';
        if(isBusy) this.statusAudio.classList.add('busy');
        else this.statusAudio.classList.remove('busy');
    }

    generateDeviceID() {
        return Math.floor(Math.random() * 65534 + 1).toString(16).toUpperCase().padStart(4, '0');
    }

    async installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt = null;
            this.btnInstall.style.display = 'none';
        }
    }
}