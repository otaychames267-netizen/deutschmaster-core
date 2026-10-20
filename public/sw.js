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

/* ── Web Push ───────────────────────────────────────────────────────────────────────────────────────────────────────
 * Payload (JSON, sent by /api/push-dispatch): { t: title, b: body, u: in-app path, g: tag }.
 * Only a notification is shown — nothing is cached or fetched here, so the "never store exam content" rule above holds.
 * Arabic text: dir/lang "auto" lets the OS lay it out right-to-left. */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* malformed payload: show the generic text below */ }
  const title = String(data.t || "AuraLingovia").slice(0, 120);
  event.waitUntil(
    self.registration.showNotification(title, {
      body: String(data.b || "").slice(0, 400),
      icon: "/pwa-icon-192.png",
      badge: "/pwa-icon-192.png",
      tag: typeof data.g === "string" ? data.g.slice(0, 100) : undefined,
      renotify: true, // a same-day merge reuses the tag: ring again
      dir: "auto",
      data: { url: typeof data.u === "string" ? data.u : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  // in-app paths only (single leading slash), same rule the bell applies
  const path = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          if ("navigate" in w) { try { await w.navigate(target); } catch { /* cross-document navigate not allowed: fall through to the focused window */ } }
          return;
        }
      }
      await self.clients.openWindow(target);
    }),
  );
});
