// VKU Field Survey Service Worker
// Cache-First strategy for App Shell assets & offline persistence

const CACHE_NAME = 'vku-survey-shell-v1';

// App shell assets to pre-cache during install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// 1. Install Event: Pre-cache App Shell assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install event: Caching App Shell assets');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      // Force the waiting service worker to become active immediately
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event: Clean up old cache versions & claim clients
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event: Purging obsolete caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// 3. Fetch Event: Cache-First strategy for static assets & App Shell
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle Mock API endpoints for survey sync
  if (url.pathname === '/api/surveys' && request.method === 'POST') {
    // If client is online and posting survey to API
    event.respondWith(
      request.clone().json().then((surveyData) => {
        // Return simulated server success response
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Survey synced successfully to VKU Facility Server',
            id: surveyData.id,
            receivedAt: new Date().toISOString()
          }),
          {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }).catch(() => {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid payload' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Non-GET requests should bypass cache
  if (request.method !== 'GET') {
    return;
  }

  // Cache-First Strategy for App Shell & static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Cache hit -> Return cached response immediately (sub-second offline boot)
        // Optionally update cache in background (Stale-While-Revalidate for app updates)
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse.clone());
            });
          }
        }).catch(() => {
          // Network offline, silent catch
        });

        return cachedResponse;
      }

      // Cache miss -> Fetch from network, then cache response
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Cache valid responses for future offline use
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Only cache http/https URLs and valid responses
          if (request.url.startsWith('http')) {
            cache.put(request, responseToCache);
          }
        });

        return networkResponse;
      }).catch((fetchError) => {
        // Network failed (Offline mode)
        // If navigation request (e.g. reload or open app), fallback to cached index.html
        if (request.mode === 'navigate') {
          return caches.match('/') || caches.match('/index.html');
        }

        throw fetchError;
      });
    })
  );
});

// 4. Background Sync API: Listen for 'sync-surveys' tag
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Sync event triggered:', event.tag);
  if (event.tag === 'sync-surveys') {
    event.waitUntil(
      // Notify active client windows to trigger sequential queue sync
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGERED' });
        });
      })
    );
  }
});
