/*
    AetherVane (The Ultrasonic Ghost-Mesh Protocol)
    Copyright (C) 2026 Vikram Kumar Sinha (thevikramsinha.github.io/aethervane/)
    
    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    MODULE: CRYPTOGRAPHY LAYER (ECDH + AES-GCM)
*/

class AetherCrypto {
    constructor() {
        this.keyPair = null; 
        this.sessionKeys = new Map(); 
    }

    async init() {
        try {
            this.keyPair = await window.crypto.subtle.generateKey(
                { name: "ECDH", namedCurve: "P-256" },
                true, ["deriveKey", "deriveBits"]
            );
            console.log("[CRYPTO]: Local Identity Key Generated.");
        } catch (e) {
            console.error("[CRYPTO]: Key Gen Failed", e);
        }
    }

    /* --- HANDSHAKE --- */

    async getPublicKeyRaw() {
        if (!this.keyPair) await this.init();
        const raw = await window.crypto.subtle.exportKey("raw", this.keyPair.publicKey);
        return this.bufToHex(raw);
    }

    async computeSharedSecret(peerPublicKeyHex) {
        try {
            const rawKey = this.hexToBuf(peerPublicKeyHex);
            const peerKey = await window.crypto.subtle.importKey(
                "raw", rawKey,
                { name: "ECDH", namedCurve: "P-256" },
                true, []
            );

            const sharedKey = await window.crypto.subtle.deriveKey(
                { name: "ECDH", public: peerKey },
                this.keyPair.privateKey,
                { name: "AES-GCM", length: 256 },
                false, ["encrypt", "decrypt"]
            );

            return sharedKey;
        } catch (e) {
            throw new Error("Invalid Public Key Received");
        }
    }

    /* --- ENCRYPTION --- */

    async encryptMessage(peerID, text) {
        const key = this.sessionKeys.get(peerID);
        if (!key) throw new Error("No secure session. Handshake required.");

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encodedText = new TextEncoder().encode(text);

        const ciphertext = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv }, key, encodedText
        );

        return this.bufToHex(iv) + ":" + this.bufToHex(ciphertext);
    }

    async decryptMessage(peerID, payloadStr) {
        const key = this.sessionKeys.get(peerID);
        if (!key) throw new Error("Key not found.");

        try {
            const parts = payloadStr.split(':');
            const iv = this.hexToBuf(parts[0]);
            const data = this.hexToBuf(parts[1]);

            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv }, key, data
            );

            return new TextDecoder().decode(decrypted);
        } catch (e) {
            throw new Error("Tampering Detected");
        }
    }

    /* --- UTILS --- */
    bufToHex(buffer) {
        return [...new Uint8Array(buffer)]
            .map(b => b.toString(16).padStart(2, '0')).join('');
    }

    hexToBuf(hex) {
        if (!hex) return new Uint8Array(0);
        return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    }
}