const CACHE = 'watermark-v3';
const FILES = ['/Watermark/', '/Watermark/index.html', '/Watermark/manifest.json', '/Watermark/sw.js', '/Watermark/icon.png'];

// Install: cache all app files
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(FILES);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k){ return k !== CACHE; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache, fall back to network
// For reverse geocoding (nominatim) always try network first
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Geocoding requests: network first, fail silently (coords still work offline)
  if (url.indexOf('nominatim.openstreetmap.org') > -1) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({address:{}}), {
          headers: {'Content-Type': 'application/json'}
        });
      })
    );
    return;
  }

  // App files: cache first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        // Cache any new files we encounter
        return caches.open(CACHE).then(function(cache) {
          cache.put(e.request, response.clone());
          return response;
        });
      });
    }).catch(function() {
      // Fully offline fallback — serve index.html
      return caches.match('/index.html');
    })
  );
});
