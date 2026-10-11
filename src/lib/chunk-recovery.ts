/**
 * Recovery from "a new version was deployed while this tab was open".
 *
 * Every deploy gives the JS bundles new fingerprinted names. A student whose tab (or installed app) still holds the OLD page then clicks a
 * link, the router asks for a route chunk that no longer exists ("Failed to fetch dynamically imported module"), nothing catches it and the
 * root error boundary shows "Something went wrong" — to exactly the students who happen to be online during a deploy. Reloading once fetches
 * the new page and everything works again, so that is what we do: automatically, at most once per minute (a reload loop is worse than the error).
 */
const KEY = "aura-chunk-reload-at";
const ERR_KEY = "aura-chunk-error-at";
const WINDOW_MS = 60_000;

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed/i;

/** What a failed route chunk turns into when the preload error was swallowed (event.preventDefault() while a reload starts): the lazy-import promise then
 * resolves to `undefined` and the router throws on it — "Cannot read properties of undefined (reading 'component')" (Chrome) / "d is undefined" (Firefox).
 * Production 2026-10-11: 24 such boundary errors right next to 35 chunk errors. They are the same event, so they are only treated as one when a chunk error
 * was seen in the last 15 s — a genuine "x is undefined" bug elsewhere is still reported as a bug. */
const SWALLOWED_CHUNK_SIDE_EFFECT = /^Cannot read propert(?:y|ies) of undefined \(reading 'component'\)$|^[\w$]{1,3} is undefined$/;
const SIDE_EFFECT_WINDOW_MS = 15_000;

export function isChunkLoadError(error: unknown): boolean {
  const msg = typeof error === "string" ? error : (error as { message?: unknown } | null)?.message;
  if (typeof msg !== "string") return false;
  if (CHUNK_ERROR.test(msg)) return true;
  if (SWALLOWED_CHUNK_SIDE_EFFECT.test(msg)) {
    try { return Date.now() - Number(sessionStorage.getItem(ERR_KEY) ?? 0) < SIDE_EFFECT_WINDOW_MS; } catch { return false; }
  }
  return false;
}

/** Reloads the page unless it already did within the last minute. Returns true when a reload was started. */
export function reloadOnceForNewVersion(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false; // storage blocked: we cannot remember that we reloaded, so never risk a reload loop
  }
  window.location.reload();
  return true;
}

/** Client only, idempotent. Vite fires `vite:preloadError` when a dynamically imported chunk (or its CSS) fails to load. */
let installed = false;
export function initChunkRecovery(onChunkError?: (error: unknown) => void) {
  if (typeof window === "undefined" || installed) return;
  installed = true;
  window.addEventListener("vite:preloadError", (event) => {
    try { sessionStorage.setItem(ERR_KEY, String(Date.now())); } catch { /* storage blocked: the side-effect match above just stays off */ }
    onChunkError?.((event as Event & { payload?: unknown }).payload ?? "vite:preloadError");
    // Only swallow the error when a reload really starts. Inside the one-minute cooldown the original chunk error must propagate, so the root boundary shows the
    // friendly "A new version is available — Reload" screen instead of letting the router crash on an undefined module.
    if (reloadOnceForNewVersion()) event.preventDefault();
  });
}
