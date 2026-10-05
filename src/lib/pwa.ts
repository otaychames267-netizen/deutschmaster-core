/**
 * PWA plumbing: service-worker registration + a tiny external store around the browser's install prompt.
 *
 * `beforeinstallprompt` can fire before React hydrates, so `initPwa()` is called once from the root module
 * (client only) and the deferred event is kept here until a component asks for it.
 * Everything touching `window` / storage is guarded: this module is also imported on the server.
 */
import { useSyncExternalStore } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<InstallChoice> };

export interface PwaState {
  /** The browser handed us an install prompt (Chrome / Edge / Samsung Internet on Android + desktop). */
  canPrompt: boolean;
  /** Running as an installed app already (standalone window), or the user just installed it. */
  installed: boolean;
  /** iPhone / iPad: no install prompt exists, the user has to use Share → Add to Home Screen. */
  ios: boolean;
}

const DISMISS_KEY = "pwa-install-banner-dismissed-at";
const DISMISS_DAYS = 14;

const SERVER_STATE: PwaState = { canPrompt: false, installed: false, ios: false };
let state: PwaState = SERVER_STATE;
let deferred: BeforeInstallPromptEvent | null = null;
let initialised = false;
const listeners = new Set<() => void>();

function emit(next: Partial<PwaState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Idempotent, client only. Safe to call from module scope. */
export function initPwa() {
  if (typeof window === "undefined" || initialised) return;
  initialised = true;
  emit({ installed: isStandalone(), ios: isIos() });

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own banner / menu entry instead of the browser's mini-infobar
    deferred = e as BeforeInstallPromptEvent;
    emit({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit({ canPrompt: false, installed: true });
  });
  window.matchMedia("(display-mode: standalone)").addEventListener("change", (e) => emit({ installed: e.matches }));
}

/** Shows the browser's install dialog. Resolves to "unavailable" when there is no deferred prompt (e.g. iOS). */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferred) return "unavailable";
  const evt = deferred;
  deferred = null; // a prompt event can only be used once
  emit({ canPrompt: false });
  try {
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") emit({ installed: true });
    return outcome;
  } catch {
    return "unavailable";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

export function isBannerDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function dismissBanner() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* private mode: the banner simply comes back next visit */ }
}

/** Production only: a service worker in dev would serve stale modules. See public/sw.js for what it does (and deliberately does not) cache. */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || import.meta.env.DEV) return;
  const register = () => { navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => { /* offline fallback is a nicety, never fatal */ }); };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
