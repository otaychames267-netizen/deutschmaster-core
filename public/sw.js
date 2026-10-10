/* AuraLingovia service worker.
 *
 * Deliberately small. This is a paid, entitlement-gated platform, so the worker NEVER stores pages, API / server-function
 * responses, Supabase traffic, audio or any other exam content — only:
 *   1. an offline fallback page (shown when a navigation fails because there is no network),
 *   2. the app icons,
 *   3. the build's fingerprinted /assets/* files (immutable by name, so cache-first is always correct).
 * Everything else — every navigation, every cross-origin request, every non-GET — goes straight to the network untouched,
 * so a student can never see stale lessons or a stale subscription state because of this file.
 * Bump VERSION to drop old caches.
 */
const VERSION = "v1";
const CACHE = `aura-static-${VERSION}`;
const PRECACHE = ["/offline.html", "/pwa-icon-192.png", "/pwa-icon-512.png", "/favicon.svg"];
const MAX_ASSET_ENTRIES = 150;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("aura-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  const assetKeys = keys.filter((r) => new URL(r.url).pathname.startsWith("/assets/"));
  for (const r of assetKeys.slice(0, Math.max(0, assetKeys.length - MAX_ASSET_ENTRIES))) await cache.delete(r);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google Fonts, storage buckets, audio: never touched

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  if (url.pathname.startsWith("/assets/") || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok && res.type === "basic") { cache.put(req, res.clone()).then(() => trim(cache)); }
        return res;
      }),
    );
  }
  // anything else: not intercepted
});
