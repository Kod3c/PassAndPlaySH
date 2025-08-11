// Secret Hitler PWA Service Worker
const CACHE_NAME = 'secret-hitler-v1';

// Get the base path for the app (handles subdirectory hosting)
function getBasePath() {
    // Try to get the base path from the registration scope
    if (self.registration && self.registration.scope) {
        const scope = self.registration.scope;
        const url = new URL(scope);
        return url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname;
    }
    return '';
}

const basePath = getBasePath();
const urlsToCache = [
    basePath + '/',
    basePath + '/index.html',
    basePath + '/styles/main.css',
    basePath + '/js/app.js',
    basePath + '/js/gameEngine.js',
    basePath + '/js/player-setup.js',
    basePath + '/js/setup-enhancement.js',
    basePath + '/pages/setup.html',
    basePath + '/pages/rules.html',
    basePath + '/manifest.json'
];

// Install event - cache files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event - serve from cache when offline and handle SPA routing
self.addEventListener('fetch', (event) => {
    // Only handle navigation requests (GET requests for HTML)
    if (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // If the request is for a page that doesn't exist in cache (like /setup, /game, etc.)
                    // redirect to index.html to let the SPA handle routing
                    if (!response) {
                        return caches.match(basePath + '/index.html');
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback to index.html for any errors
                    return caches.match(basePath + '/index.html');
                })
        );
    } else {
        // For non-navigation requests (CSS, JS, images), use normal caching
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Return cached version or fetch from network
                    return response || fetch(event.request);
                })
        );
    }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: basePath + '/icons/icon-192x192.png',
            badge: basePath + '/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: 1
            }
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(basePath + '/')
    );
});
