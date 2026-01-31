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

    MODULE: AUDIO ENGINE (Physical Layer + FEC)
*/

class AetherAudioEngine {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.oscillator = null;
        this.gainNode = null;
        this.isListening = false;
        
        // Config
        this.FREQ_PREAMBLE = 18000; 
        this.FREQ_ZERO = 18800;     
        this.FREQ_ONE = 19600;      
        this.BIT_DURATION = 0.050; 
        this.RAMP_TIME = 0.010;
        this.FFT_SIZE = 2048;
        this.MIN_DECIBEL = -85;
        
        // State
        this.rxBuffer = [];
        this.rxState = 'IDLE'; 
        this.lastDetectedBit = null;
        this.bitHoldTime = 0;
        
        // Callbacks
        this.onLog = (msg) => console.log(msg);
        this.onMessageReceived = (packet) => {};
        this.onCorrection = (count) => {}; 
    }

    async init() {
        if (!window.AudioContext) return false;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.onLog("[DSP]: Audio Context Ready.");
        return true;
    }

    async transmit(targetID, senderID, message) {
        if (this.ctx.state === 'suspended') await this.ctx.resume();

        if (this.isChannelBusy()) {
            this.onLog("[MAC]: Channel Busy.");
            return false;
        }

        const binTarget = this.hexToBin(targetID, 16);
        const binSender = this.hexToBin(senderID, 16);
        const binLen = this.intToBin(message.length, 8);
        const fecPayload = this.textToHammingStream(message);
        
        const fullPacket = 'P' + binTarget + binSender + binLen + fecPayload;

        const t0 = this.ctx.currentTime + 0.1;
        this.createOscillator();
        this.oscillator.start(t0);

        let cursor = t0;
        
        // Preamble
        this.playTone(this.FREQ_PREAMBLE, cursor, this.BIT_DURATION * 4);
        cursor += (this.BIT_DURATION * 4);

        // Data
        for (let i = 1; i < fullPacket.length; i++) {
            const bit = fullPacket[i];
            const freq = (bit === '1') ? this.FREQ_ONE : this.FREQ_ZERO;
            this.playTone(freq, cursor, this.BIT_DURATION);
            cursor += this.BIT_DURATION;
        }

        this.oscillator.stop(cursor);
        setTimeout(() => {
            this.onLog("[TX]: Complete.");
            this.oscillator.disconnect();
        }, (cursor - t0) * 1000 + 200);

        return true;
    }

    async startListening() {
        if (!this.ctx) await this.init();
        if (this.ctx.state === 'suspended') await this.ctx.resume();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { 
                echoCancellation: false, noiseSuppression: false, autoGainControl: false 
            }});
            const source = this.ctx.createMediaStreamSource(stream);
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = this.FFT_SIZE;
            this.analyser.smoothingTimeConstant = 0.2;
            source.connect(this.analyser);
            this.isListening = true;
            this.onLog("[RX]: Listening...");
            this.rxLoop();
        } catch (e) { this.onLog("[ERR]: Mic Denied."); }
    }
    
    rxLoop() {
        if (!this.isListening) return;
        requestAnimationFrame(() => this.rxLoop());
        const data = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(data);
        
        const p = data[this.getBinIndex(this.FREQ_PREAMBLE)];
        const z = data[this.getBinIndex(this.FREQ_ZERO)];
        const o = data[this.getBinIndex(this.FREQ_ONE)];
        
        let d = null;
        if (p > this.MIN_DECIBEL) d = 'P';
        else if (o > this.MIN_DECIBEL && o > z) d = '1';
        else if (z > this.MIN_DECIBEL && z > o) d = '0';
        this.processRxBit(d);
    }

    processRxBit(bit) {
        if (!bit) { this.bitHoldTime = 0; return; }
        this.bitHoldTime++; 
        if (this.bitHoldTime < 3) return; 

        if (this.rxState === 'IDLE') {
            if (bit === 'P') {
                this.rxState = 'COLLECTING';
                this.rxBuffer = [];
                this.onLog("[RX]: Sync...");
                this.bitHoldTime = -10; 
            }
        } else if (this.rxState === 'COLLECTING') {
            if (bit !== 'P' && bit !== this.lastDetectedBit) {
                this.rxBuffer.push(bit);
                this.lastDetectedBit = bit;
                this.bitHoldTime = -2; 
                if (this.rxBuffer.length > 2000) {
                    this.decodePacket(this.rxBuffer.join(''));
                    this.rxState = 'IDLE';
                }
            }
        }
    }

    decodePacket(rawBits) {
        if (rawBits.length < 40) return;
        const targetID = parseInt(rawBits.substr(0, 16), 2);
        const senderID = parseInt(rawBits.substr(16, 16), 2);
        const len = parseInt(rawBits.substr(32, 8), 2);
        
        const expectedBits = len * 14; 
        if (rawBits.length < (40 + expectedBits)) return;

        const fecData = rawBits.substr(40, expectedBits);
        const { decodedText, corrections } = this.hammingStreamToText(fecData);
        
        if (corrections > 0) this.onCorrection(corrections);

        this.onMessageReceived({
            target: targetID.toString(16).padStart(4, '0').toUpperCase(),
            sender: senderID.toString(16).padStart(4, '0').toUpperCase(),
            payload: decodedText,
            timestamp: new Date().toLocaleTimeString()
        });
    }

    /* --- HAMMING (7,4) --- */
    textToHammingStream(text) {
        let stream = '';
        for (let i = 0; i < text.length; i++) {
            const c = text.charCodeAt(i);
            stream += this.encodeHamming((c >> 4) & 0x0F) + this.encodeHamming(c & 0x0F);
        }
        return stream;
    }

    hammingStreamToText(stream) {
        let text = '';
        let corrections = 0;
        for (let i = 0; i < stream.length; i += 14) {
            const b1 = stream.substr(i, 7);
            const b2 = stream.substr(i + 7, 7);
            if (b2.length < 7) break;
            const d1 = this.decodeHamming(b1);
            const d2 = this.decodeHamming(b2);
            corrections += (d1.c ? 1 : 0) + (d2.c ? 1 : 0);
            text += String.fromCharCode((d1.d << 4) | d2.d);
        }
        return { decodedText: text, corrections: corrections };
    }

    encodeHamming(n) {
        const d1=(n>>3)&1, d2=(n>>2)&1, d3=(n>>1)&1, d4=n&1;
        const p1=d1^d2^d4, p2=d1^d3^d4, p3=d2^d3^d4;
        return `${p1}${p2}${d1}${p3}${d2}${d3}${d4}`;
    }

    decodeHamming(bits) {
        if (bits.length<7) return {d:0, c:false};
        const b = bits.split('').map(Number);
        const syn = ((b[3]^b[4]^b[5]^b[6])<<2) | ((b[1]^b[2]^b[5]^b[6])<<1) | (b[0]^b[2]^b[4]^b[6]);
        let c = false;
        if (syn!==0 && (syn-1)<7) { b[syn-1]^=1; c=true; }
        return {d:(b[2]<<3)|(b[4]<<2)|(b[5]<<1)|b[6], c:c};
    }
    
    /* Helpers */
    createOscillator() { 
        this.oscillator = this.ctx.createOscillator();
        this.gainNode = this.ctx.createGain();
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.ctx.destination);
        this.oscillator.type = 'sine';
        this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    playTone(f, t, d) { 
        this.oscillator.frequency.setValueAtTime(f, t);
        this.gainNode.gain.setTargetAtTime(1, t, this.RAMP_TIME);
        this.gainNode.gain.setTargetAtTime(0, t + d - this.RAMP_TIME, this.RAMP_TIME);
    }
    isChannelBusy() { 
        if (!this.analyser) return false;
        const d = new Float32Array(this.analyser.frequencyBinCount);
        this.analyser.getFloatFrequencyData(d);
        const n = Math.max(d[this.getBinIndex(this.FREQ_ZERO)], d[this.getBinIndex(this.FREQ_ONE)]);
        return n > -70;
    }
    getBinIndex(f) { return Math.floor(f * this.FFT_SIZE / this.ctx.sampleRate); }
    hexToBin(h, w) { return (parseInt(h, 16)||0).toString(2).padStart(w, '0'); }
    intToBin(i, w) { return i.toString(2).padStart(w, '0'); }
}