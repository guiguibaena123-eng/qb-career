// Caminhos relativos: funciona tanto na raiz (npm run dev) quanto em /qb-career/ (GitHub Pages).
// Modo offline: guarda cada arquivo do jogo na primeira abertura e serve do cache depois.
const CACHE = 'qb-career-v31';
// Trilha dos menus: cache próprio, que não é apagado a cada versão (são ~27 MB; baixa só uma vez).
// Se as faixas mudarem, troque o nome (music-v2) para baixar de novo.
const MUSIC = 'qb-career-music-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icons/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MUSIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Páginas: tenta a rede (versão nova) e cai no cache se estiver offline. Arquivos: cache primeiro.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }
  if (new URL(req.url).pathname.includes('/music/')) {
    e.respondWith(
      caches.open(MUSIC).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.status === 200) c.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
