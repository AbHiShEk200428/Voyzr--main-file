const CACHE_NAME = 'voyzr-map-tiles';
const ASSETS_CACHE = 'voyzr-assets-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', async (event) => {
  if (event.data.type === 'DOWNLOAD_SECTOR') {
    const tiles = event.data.tiles;
    const cache = await caches.open(CACHE_NAME);
    let count = 0;

    for (const url of tiles) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch (e) {
        console.warn('Failed to cache tile:', url, e);
      }
      count++;
      
      // Notify client of progress every 10 tiles to avoid spamming
      if (count % 10 === 0 || count === tiles.length) {
        const clientsList = await clients.matchAll();
        clientsList.forEach(client => {
          client.postMessage({
            type: 'DOWNLOAD_PROGRESS',
            current: count,
            total: tiles.length
          });
        });
      }
    }

    const clientsList = await clients.matchAll();
    clientsList.forEach(client => {
      client.postMessage({ type: 'DOWNLOAD_COMPLETE' });
    });
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Intercept map tile requests
  if (url.hostname === 'maps.geoapify.com') {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).catch(() => {
            // Return a placeholder if offline and not in cache
            return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // Generic caching for other external assets (like markers)
  if (url.hostname === 'raw.githubusercontent.com' || url.hostname === 'cdnjs.cloudflare.com') {
    event.respondWith(
      caches.open(ASSETS_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          return response || fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => caches.match(request));
        });
      })
    );
  }
});
