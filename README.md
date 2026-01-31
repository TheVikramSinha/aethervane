# AetherVane: The Ultrasonic Ghost-Mesh Protocol

![Version](https://img.shields.io/badge/version-3.0.0_Crypto--Mesh-blue?style=flat-square)
![License](https://img.shields.io/badge/license-GPLv3-green?style=flat-square)
![Security](https://img.shields.io/badge/security-ECDH%20%2F%20AES--256-gold?style=flat-square)
![Platform](https://img.shields.io/badge/platform-PWA%20%7C%20Mobile%20%7C%20Desktop-lightgrey?style=flat-square)

> **"Silence is loud if you know how to listen."**

**AetherVane** is a browser-based, air-gapped mesh messenger that enables secure communication between devices using **ultrasonic sound waves** (18kHz–20kHz). It requires **no Internet, no Wi-Fi, no Bluetooth, and no Servers**.

It runs entirely client-side using the **Web Audio API** for signal processing and the **Web Crypto API** for military-grade End-to-End Encryption (E2EE).

---

## 🚀 Key Capabilities (v3.0)

### 1. 📡 Active Sonar Discovery
Stop guessing who is nearby. Click **Scan**, and AetherVane pings the local environment. Nearby devices automatically reply with an acoustic `ACK`, populating your "Nearby Shadows" list.

### 2. 🛡️ Self-Healing Protocol (FEC)
Acoustic environments are noisy. AetherVane implements **Hamming(7,4) Forward Error Correction**. It transmits redundant parity bits, allowing the receiver to mathematically detect and **repair corrupted bits** on the fly without asking for a retransmission.

### 3. 🔐 Military-Grade Encryption (Crypto-Mesh)
Default communications are open (like a walkie-talkie). However, users can initiate a **Secure Handshake**:
* **Key Exchange:** Uses **ECDH (Elliptic Curve Diffie-Hellman)** on the P-256 curve to derive a shared secret over the air.
* **Transport:** Messages are encrypted using **AES-GCM (256-bit)**.
* **Result:** Mathematically unbreakable forward secrecy. Even if the audio is recorded, it cannot be decrypted.

### 4. 👻 True Air-Gap
* **0% Data Leakage:** No external servers, analytics, or trackers.
* **PWA Ready:** Installs to the home screen. Works perfectly in Airplane Mode.

---

## 🛠️ Deployment Guide

### Prerequisites
* **HTTPS is Mandatory:** The `window.crypto` (Encryption) and `navigator.mediaDevices` (Microphone) APIs require a Secure Context (HTTPS) to function.
* **Hosting:** GitHub Pages is the recommended host as it provides HTTPS by default.

### Installation
1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/thevikramsinha/AetherVane.git](https://github.com/thevikramsinha/AetherVane.git)
    cd AetherVane
    ```
2.  **Verify Files:** Ensure `index.html`, `style.css`, `app.js`, `audio-engine.js`, `crypto-layer.js`, `manifest.json`, and `sw.js` are present.
3.  **Deploy:** Upload to your web server or enable GitHub Pages for the repository.
4.  **Launch:** Open the URL on two devices (smartphone or laptop).

---

## 📖 User Manual

### Phase 1: Connection
1.  **Volume Up:** Set device volume to ~80%. Ensure microphone permissions are granted.
2.  **Scan:** Click the **PING [SCAN]** button.
3.  **Discovery:** Nearby devices will appear in the "Nearby Shadows" list.

### Phase 2: Secure Handshake
1.  **Initiate:** Right-click (desktop) or long-press (mobile) on a Peer ID in the list.
2.  **Confirm:** Accept the "Start Secure Handshake" prompt.
3.  **Wait:** Both devices will exchange public keys via audio (approx. 20-30 seconds).
4.  **Verify:** The Peer ID will turn **GOLD** with a 🔒 icon.

### Phase 3: Communication
1.  **Select:** Click the Peer ID to target them.
2.  **Type:** Enter your message and press Send.
3.  **Status:** Secure messages are marked with `[🔒 AES-256]`.

---

## 💡 Example Use Cases

### Scenario A: The "Grid Down" Disaster
**Context:** A natural disaster has knocked out cellular towers and Wi-Fi in a dense urban area. First responders need to coordinate within a collapsed building.
**Solution:** Using AetherVane, responders can send text coordinates and status updates to each other through the rubble using sound, which often propagates through gaps better than high-frequency RF.

### Scenario B: The "Air-Gapped" Key Transfer
**Context:** A sysadmin needs to transfer a sensitive password from a cold-storage laptop (never connected to the internet) to a secure terminal.
**Solution:** Instead of risking a USB drive (which can carry malware), the admin types the password into AetherVane. The data is transmitted acoustically to the terminal. The air-gap remains physically violated only by sound.

### Scenario C: The "Protest" Blackout
**Context:** During civil unrest, the government shuts down the internet. Protesters need to organize locally without being tracked via cellular metadata.
**Solution:** AetherVane creates an ephemeral, local mesh network. Identities are random hex codes (`A1F9`), and keys are generated on the fly. Once the tab is closed, the identity vanishes.

---

## ⚖️ Legal & Compliance

### License: GNU GPL v3.0
This project is licensed under the **GNU General Public License v3.0**.
* **You may:** Use, modify, and distribute this software for private or commercial purposes.
* **You must:** Keep the source code open. If you modify AetherVane and distribute it, your modifications must also be released under GPLv3.
* **You cannot:** Close the source code or wrap it in a proprietary product without releasing the changes.

### Encryption Export Notice
This software includes cryptographic software (ECDH/AES). The country in which you currently reside may have restrictions on the import, possession, use, and/or re-export to another country, of encryption software. **BEFORE using any encryption software, please check your country's laws, regulations and policies concerning the import, possession, or use, and re-export of encryption software, to see if this is permitted.**

### Disclaimer of Warranty
**THERE IS NO WARRANTY FOR THE PROGRAM, TO THE EXTENT PERMITTED BY APPLICABLE LAW.**
The software is provided "AS IS" without warranty of any kind, either expressed or implied, including, but not limited to, the implied warranties of merchantability and fitness for a particular purpose. The entire risk as to the quality and performance of the program is with you.

---

## 👨‍💻 Author

**Vikram Kumar Sinha**
* **Website:** [thevikramsinha.github.io](https://thevikramsinha.github.io)
* **Repository:** [github.com/thevikramsinha/AetherVane](https://github.com/thevikramsinha/AetherVane)

---
*Generated for AetherVane v3.0 | The Quiet Revolution*
