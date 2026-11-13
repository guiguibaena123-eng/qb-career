// Caminhos relativos: funciona tanto na raiz (npm run dev) quanto em /qb-career/ (GitHub Pages).
// Modo offline: guarda cada arquivo do jogo na primeira abertura e serve do cache depois.
const CACHE = 'qb-career-v141';
// Trilha dos menus: cache próprio, que não é apagado a cada versão (são ~27 MB; baixa só uma vez).
// Se as faixas mudarem, troque o nome (music-v2) para baixar de novo.
const MUSIC = 'qb-career-music-v1';
// Efeitos sonoros da partida (~1,5 MB): idem, cache próprio (troque para sfx-v2 se os sons mudarem).
const SFX = 'qb-career-sfx-v4';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'manifest.webmanifest', 'icons/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== MUSIC && k !== SFX).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// O player do iPhone lê o áudio em pedaços e recusa resposta inteira: entrega só o pedaço pedido.
async function partial(req) {
  const c = await caches.open(MUSIC);
  let res = await c.match(req.url);
  if (!res) {
    const full = await fetch(req.url);
    if (full.status !== 200) return full;
    await c.put(req.url, full.clone());
    res = full;
  }
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || '');
  const from = m && m[1] ? +m[1] : 0;
  const to = m && m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(from, to + 1), {
    status: 206,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Content-Length': String(to - from + 1),
      'Content-Range': `bytes ${from}-${to}/${buf.byteLength}`,
    },
  });
}

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
  const path = new URL(req.url).pathname;
  if (path.includes('/music/') && req.headers.has('range')) {
    e.respondWith(partial(req));
    return;
  }
  if (path.includes('/music/') || path.includes('/sfx/')) {
    e.respondWith(
      caches.open(path.includes('/sfx/') ? SFX : MUSIC).then((c) =>
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
