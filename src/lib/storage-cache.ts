/**
 * storage-cache.ts — cut Supabase Storage egress for private media.
 *
 * Every createSignedUrl() call returns a URL with a fresh token, so the
 * browser's HTTP cache (and Supabase's CDN) treat each page visit as a brand
 * new file and re-download it in full. Two layers fix that:
 *
 * 1. getCachedSignedUrl — reuses the same signed URL for a bucket/path until
 *    shortly before it expires (memory + localStorage), so repeat views hit
 *    the browser HTTP cache instead of Storage. Used for images and PDFs.
 * 2. getCachedBlob — keeps the downloaded bytes in the Cache Storage API,
 *    keyed by bucket/path (not by the signed URL), so a Hören track is
 *    downloaded from Storage once per device, not once per play/page visit.
 *
 * Access control is unchanged: a signed URL is still required (and RLS still
 * enforced) the first time a file is fetched. clearMediaCache() runs on
 * sign-out so cached premium media doesn't outlive the session.
 */
import { supabase } from "@/integrations/supabase/client";

const URL_STORE_KEY = "media-signed-urls-v1";
const MEDIA_CACHE_NAME = "media-cache-v1";
// Re-sign when less than this much lifetime is left, so a URL handed to an
// <img>/<iframe> never expires mid-view.
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

type UrlEntry = { url: string; expiresAt: number };

const memUrls = new Map<string, UrlEntry>();
const inflightUrls = new Map<string, Promise<string | null>>();
const inflightBlobs = new Map<string, Promise<Blob | null>>();

function readStore(): Record<string, UrlEntry> {
  try {
    return JSON.parse(localStorage.getItem(URL_STORE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, UrlEntry>) {
  try {
    const now = Date.now();
    for (const k of Object.keys(store)) if (store[k].expiresAt <= now) delete store[k];
    localStorage.setItem(URL_STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage full / unavailable — memory cache still works */
  }
}

export async function getCachedSignedUrl(
  bucket: string,
  path: string,
  ttlSeconds = 6 * 3600,
): Promise<string | null> {
  const key = `${bucket}/${path}`;
  const now = Date.now();
  const fresh = (e?: UrlEntry) => e && e.expiresAt - REFRESH_MARGIN_MS > now;

  const mem = memUrls.get(key);
  if (fresh(mem)) return mem!.url;
  if (typeof window !== "undefined") {
    const stored = readStore()[key];
    if (fresh(stored)) {
      memUrls.set(key, stored);
      return stored.url;
    }
  }

  const pending = inflightUrls.get(key);
  if (pending) return pending;
  const p = (async () => {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
    const url = data?.signedUrl ?? null;
    if (url) {
      const entry = { url, expiresAt: Date.now() + ttlSeconds * 1000 };
      memUrls.set(key, entry);
      if (typeof window !== "undefined") {
        const store = readStore();
        store[key] = entry;
        writeStore(store);
      }
    }
    return url;
  })().finally(() => inflightUrls.delete(key));
  inflightUrls.set(key, p);
  return p;
}

/** Synthetic, stable cache key — never a real fetchable URL. */
function blobCacheKey(bucket: string, path: string) {
  return `https://media-cache.invalid/${encodeURIComponent(bucket)}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

async function openMediaCache(): Promise<Cache | null> {
  try {
    return typeof caches !== "undefined" ? await caches.open(MEDIA_CACHE_NAME) : null;
  } catch {
    return null;
  }
}

/**
 * Download a private object once per device. `signTtlSeconds` is the lifetime
 * of the signed URL used for the (rare) actual download.
 */
export async function getCachedBlob(
  bucket: string,
  path: string,
  signTtlSeconds = 90,
): Promise<Blob | null> {
  const key = blobCacheKey(bucket, path);
  const pending = inflightBlobs.get(key);
  if (pending) return pending;

  const p = (async () => {
    const cache = await openMediaCache();
    const hit = await cache?.match(key).catch(() => undefined);
    if (hit) return hit.blob();

    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, signTtlSeconds);
    if (!data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    const blob = await res.blob();
    await cache
      ?.put(
        key,
        new Response(blob, {
          headers: { "Content-Type": blob.type || "application/octet-stream" },
        }),
      )
      .catch(() => {});
    return blob;
  })().finally(() => inflightBlobs.delete(key));
  inflightBlobs.set(key, p);
  return p;
}

export async function clearMediaCache(): Promise<void> {
  memUrls.clear();
  try {
    localStorage.removeItem(URL_STORE_KEY);
  } catch {
    /* ignore */
  }
  try {
    if (typeof caches !== "undefined") await caches.delete(MEDIA_CACHE_NAME);
  } catch {
    /* ignore */
  }
}

/**
 * Cache-Control for uploads. Upload paths carry a timestamp and are never
 * overwritten, so objects are immutable — let browsers/CDN keep them a year
 * instead of Supabase's 1-hour default.
 */
export const IMMUTABLE_CACHE_CONTROL = "31536000";
