const CACHE_NAME = 'flightplan-cache-v1';
const FILES_TO_CACHE = [
    '/flightplanningV1.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    // Falls du externe CSS/JS-Dateien hast, ebenfalls hier auflisten
];

self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Caching files...');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(
                keyList.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('Removing old cache', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', evt => {
    evt.respondWith(
        caches.match(evt.request).then(resp => {
            return resp || fetch(evt.request);
        })
    );
});
