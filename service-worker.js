const CACHE_NAME = "food-codex-v6";
const ASSETS = [
  "./",
  "./inicio.html",
  "./nutricion.html",
  "./actividades_diarias.html",
  "./historial.html",
  "./food-codex-ui.css",
  "./alimentos.base.es.json",
  "./alimentos.base.es.bundle.js",
  "./alimentos.base.es.csv",
  "./manifest.webmanifest",
  "./pwa-register.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const req = event.request;

  // Navegacion: prioriza red y cae a cache/inicio si estas offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cachedPage = await caches.match(req);
          if (cachedPage) return cachedPage;
          return caches.match("./inicio.html");
        })
    );
    return;
  }

  // Assets/API locales: cache-first; sin fallback HTML para evitar romper CSS/JS/JSON.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && req.url.startsWith(self.location.origin)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => new Response("", { status: 503, statusText: "Offline" }));
    })
  );
});
