/**
 * Version watch — "a new version was released while this tab was open", handled BEFORE it turns into "Something went wrong".
 *
 * Root cause of the most frequent error reports (client_error_log, 7 days: ~230 chunk / "reading 'component'" errors from ~45 people, mostly phones and installed apps):
 * every deploy gives the JS route chunks new fingerprinted names and the old ones disappear. A tab (or installed app) that stays open for hours or days keeps the OLD
 * page; the next click asks for a route chunk that no longer exists and the router fails. chunk-recovery.ts reloads AFTER that failure (a flash of the error screen);
 * this module notices the new version early and turns the next click into a normal full page load instead — no error, no flash.
 *
 * How: the build id (VERCEL_GIT_COMMIT_SHA, baked in at build time by vite.config.ts) is compared with GET /api/version (the id of the deployment answering right now)
 * when the tab becomes visible, the device comes back online, and every few minutes while visible. If they differ, the NEXT navigation is done as window.location.assign()
 * (at most once per minute — if the ids still differ after a fresh load, e.g. a cached page, we must never loop). Nothing reloads by itself while a student is working.
 */
const BUILD_ID: string = ((import.meta.env as Record<string, string | undefined>).VITE_BUILD_ID ?? "").trim();
const COOLDOWN_KEY = "aura-version-reload-at";
const COOLDOWN_MS = 60_000;
const CHECK_EVERY_MS = 5 * 60_000;
const MIN_GAP_MS = 45_000;

let stale = false;
let lastCheckAt = 0;
let installed = false;

export function isStaleBuild(): boolean {
  return stale;
}

async function check(): Promise<void> {
  if (!BUILD_ID || typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastCheckAt < MIN_GAP_MS) return;
  lastCheckAt = now;
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { id?: unknown };
    if (typeof json?.id === "string" && json.id && json.id !== BUILD_ID) stale = true;
  } catch { /* offline / blocked: try again later */ }
}

/** True when this navigation should become a full page load: the page is outdated and we did not already do that in the last minute. */
function shouldHardNavigate(): boolean {
  if (!stale) return false;
  try {
    const last = Number(sessionStorage.getItem(COOLDOWN_KEY) ?? 0);
    if (Date.now() - last < COOLDOWN_MS) return false;
    sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    return false; // storage blocked: cannot remember that we did it, so never risk a loop
  }
  return true;
}

type NavigationEvent = { toLocation: { href: string }; hrefChanged?: boolean };
interface SubscribableRouter {
  subscribe: (event: "onBeforeNavigate", fn: (evt: NavigationEvent) => void) => () => void;
}

/** Client only, idempotent. Does nothing when the build has no id (local dev). */
export function initVersionWatch(router: SubscribableRouter): void {
  if (typeof window === "undefined" || installed || !BUILD_ID) return;
  installed = true;

  const onWake = () => { if (document.visibilityState === "visible") void check(); };
  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("online", onWake);
  window.setInterval(onWake, CHECK_EVERY_MS);
  window.setTimeout(onWake, 30_000);

  router.subscribe("onBeforeNavigate", (evt) => {
    if (evt.hrefChanged === false) return; // same URL (search-param churn, refresh of the same page)
    if (!shouldHardNavigate()) return;
    window.location.assign(evt.toLocation.href);
  });
}
