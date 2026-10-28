// Guarda la app en el celular para que abra sin internet.
// Al publicar una versión nueva del index.html, subí el número de VERSION.
const VERSION = 'v6';
const CACHE = 'mis-cuentas-' + VERSION;
const FILES = ['./', './index.html', './lock.js', './nav.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

// cache:'reload' evita que se cuele una copia vieja guardada por el navegador.
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('mis-cuentas-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Responde primero desde el celular y, si hay internet, actualiza en segundo plano.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const hit = await c.match(key, { ignoreSearch: true });
      const net = fetch(req.mode === 'navigate' ? './index.html' : req.url, { cache: 'no-cache' })
        .then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => hit);
      if (hit) { e.waitUntil(net); return hit; }
      return net;
    })
  );
});
