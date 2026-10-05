const VERSION = '20261005141422';
const APPLI = 'senzu-appli-' + VERSION, CARTE = 'senzu-carte';
const FICHIERS = ['./', 'index.html', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png', 'apple-touch-icon.png'];
const BIBLIOTHEQUES = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css', 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.4/leaflet-maplibre-gl.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(APPLI).then(c => c.addAll(FICHIERS)
    .then(() => Promise.all(BIBLIOTHEQUES.map(u => c.add(new Request(u, {mode: 'cors'})).catch(() => null)))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(noms => Promise.all(noms.filter(n => n.startsWith('senzu-appli-') && n !== APPLI).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});
let ajouts = 0;
function limiter(c) {
  if (++ajouts % 50) return;
  c.keys().then(k => { for (let i = 0; i < k.length - 3000; i++) c.delete(k[i]); });
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(rep => {
      if (rep.ok) { const copie = rep.clone(); caches.open(APPLI).then(c => c.put('index.html', copie)); }
      return rep;
    }).catch(() => caches.match('index.html')));
    return;
  }
  if (u.origin === location.origin || u.hostname === 'unpkg.com') {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(rep => {
      if (rep.ok) { const copie = rep.clone(); caches.open(APPLI).then(c => c.put(r, copie)); }
      return rep;
    })));
    return;
  }
  if (u.hostname === 'tiles.openfreemap.org') {
    e.respondWith(caches.open(CARTE).then(c => c.match(r).then(m => {
      const reseau = fetch(r).then(rep => {
        if (rep.ok) { c.put(r, rep.clone()); limiter(c); }
        return rep;
      });
      if (m) { e.waitUntil(reseau.catch(() => null)); return m; }
      return reseau;
    })));
  }
});
