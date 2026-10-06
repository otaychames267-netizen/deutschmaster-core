/**
 * Recovery from "a new version was deployed while this tab was open".
 *
 * Every deploy gives the JS bundles new fingerprinted names. A student whose tab (or installed app) still holds the OLD page then clicks a
 * link, the router asks for a route chunk that no longer exists ("Failed to fetch dynamically imported module"), nothing catches it and the
 * root error boundary shows "Something went wrong" — to exactly the students who happen to be online during a deploy. Reloading once fetches
 * the new page and everything works again, so that is what we do: automatically, at most once per minute (a reload loop is worse than the error).
 */
const KEY = "aura-chunk-reload-at";
const WINDOW_MS = 60_000;

const CHUNK_ERROR =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed/i;

export function isChunkLoadError(error: unknown): boolean {
  const msg = typeof error === "string" ? error : (error as { message?: unknown } | null)?.message;
  return typeof msg === "string" && CHUNK_ERROR.test(msg);
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
    onChunkError?.((event as Event & { payload?: unknown }).payload ?? "vite:preloadError");
    if (reloadOnceForNewVersion()) event.preventDefault();
  });
}
