const CACHE = 'trackinfin-v11';
const NEVER_CACHE = [
  'googleapis.com','firebaseio.com','firebaseapp.com',
  'identitytoolkit','securetoken','groq','generativelanguage',
  'cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.add('/').catch(() => {})
    )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Never intercept Firebase/API/CDN calls
  if (NEVER_CACHE.some(x => url.includes(x))) return;

  // Navigation (HTML page) — always network first, never serve stale
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return r;
        })
        .catch(() =>
          caches.match('/').then(r =>
            r || new Response('You are offline. Please reconnect to use Trackinfin.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            })
          )
        )
    );
    return;
  }

  // Everything else — network first (not cache first)
  // This ensures JS/CSS always loads fresh when online
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.status === 200 && r.type !== 'opaque') {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
