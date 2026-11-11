/* Offline cache. Precaches only same-origin files. No runtime requests
   to any other host — a missing file stays missing, we never "phone home". */
const CACHE = "chance-scale-v24";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css",
  "./js/boot.js",
  "./js/geo.js",
  "./js/data.js",
  "./js/scale-data.js",
  "./js/scale-en.js",
  "./js/store.js",
  "./js/audio.js",
  "./js/ui.js",
  "./js/i18n.js",
  "./js/coasts.js",
  "./js/art.js",
  "./js/firstplay.js",
  "./js/home.js",
  "./js/daily.js",
  "./js/parent.js",
  "./js/pickers.js",
  "./js/modes/flight.js",
  "./js/modes/race.js",
  "./js/modes/hike.js",
  "./js/modes/zoom.js",
  "./js/modes/numberline.js",
  "./js/modes/compare.js",
  "./js/modes/elevator.js",
  "./js/modes/cosmos.js",
  "./assets/icon-180.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    // Never fetch third-party resources. Fail closed.
    event.respondWith(Promise.resolve(new Response("", { status: 404 })));
    return;
  }
  const dest = event.request.destination;
  const isNavigate = event.request.mode === "navigate" || dest === "document";
  const path = url.pathname;
  const isCode = dest === "script" || dest === "style" || dest === "manifest"
    || /\.(js|css|webmanifest)$/.test(path) || path.endsWith("/sw.js");
  // Network-first for the page and JS/CSS so a new deploy shows up on the
  // first load, without wiping localStorage progress. Images stay cache-first.
  event.respondWith((async () => {
    if (isNavigate || isCode) {
      try {
        const fresh = await fetch(event.request, { cache: "no-store" });
        if (fresh && fresh.ok && event.request.method === "GET") {
          const cache = await caches.open(CACHE);
          cache.put(event.request, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(event.request, { ignoreSearch: true });
        if (cached) return cached;
        if (isNavigate) return caches.match("./index.html");
        throw new Error("offline and uncached");
      }
    }
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const fresh = await fetch(event.request);
      if (fresh && fresh.ok && event.request.method === "GET") {
        const cache = await caches.open(CACHE);
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    } catch {
      throw new Error("offline and uncached");
    }
  })());
});
