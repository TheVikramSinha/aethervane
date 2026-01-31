/*
    AetherVane (The Ultrasonic Ghost-Mesh Protocol)
    Copyright (C) 2026 Vikram Kumar Sinha (thevikramsinha.github.io/aethervane/)
    License: GNU GPL v3.0
    
    MODULE: SERVICE WORKER (Offline Caching Layer)
*/

const CACHE_NAME = 'aethervane-core-v1.0.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './audio-engine.js',
    './app.js',
    './manifest.json',
    './assets/icon-192.png', 
    './assets/icon-512.png'
];

// 1. INSTALL: Cache the "Payload"
self.addEventListener('install', (event) => {
    console.log('[SW]: Installing AetherVane Core...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW]: Caching Application Shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting()) // Force activation immediately
    );
});

// 2. ACTIVATE: Cleanup Old Versions
self.addEventListener('activate', (event) => {
    console.log('[SW]: Activating New Version...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[SW]: Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim(); // Take control of all clients
});

// 3. FETCH: The Air-Gap Enforcer (Cache First, Network Fail)
self.addEventListener('fetch', (event) => {
    // We only handle GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cache if found
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // If not in cache, try network (only helpful during dev/updates)
                // In production air-gap, this will likely fail, which is intended.
                return fetch(event.request)
                    .catch(() => {
                        // Optional: Return a custom offline page if navigation fails
                        // For AetherVane, the SPA is already loaded, so this is rarely hit.
                        console.log('[SW]: Network unreachable. Staying offline.');
                    });
            })
    );
});