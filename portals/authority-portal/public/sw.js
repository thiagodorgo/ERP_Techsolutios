// Ω5P PR-18a — service worker À MÃO (sem vite-plugin-pwa / D-Ω5P-PORTAL-06). Offline-tolerante: cacheia o shell
// (runtime caching, robusto a nomes de asset com hash do Vite) e NUNCA cacheia as chamadas do BFF (POST /portal/*
// — login/challenge). Sem precache de lista fixa → sobrevive a rebuilds sem manifest de precache.
const CACHE = "authority-portal-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/", "/index.html", "/manifest.webmanifest", "/icon.svg"]).catch(() => undefined)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // Só GET same-origin do shell é cacheável. POST /portal/* (login/challenge) NUNCA é interceptado/cacheado.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/portal/")) return;

  if (request.mode === "navigate") {
    // Navegação: rede primeiro (pega deploy novo); offline → shell em cache.
    event.respondWith(fetch(request).catch(() => caches.match("/index.html").then((r) => r || caches.match("/"))));
    return;
  }

  // Assets: stale-while-revalidate (rápido offline; atualiza em segundo plano).
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
