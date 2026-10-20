/**
 * Web Push, client side. Opt-in is per ACCOUNT and per DEVICE:
 *   - the browser holds the push subscription (created only after the student taps "Enable"),
 *   - the database holds the same subscription against the student (register_push_subscription),
 *   - localStorage remembers "this account opted in on this device" so a second account on a shared phone is never
 *     subscribed without its own tap, and signing out detaches the device from the account it belonged to.
 * Everything is guarded: this module is also imported on the server.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";
import { usePwa } from "@/lib/pwa";

export type PushStatus =
  | "checking"     // first client render, before we have looked
  | "unsupported"  // this browser cannot do web push at all
  | "ios-install"  // iPhone/iPad: push only exists for the installed app (Add to Home Screen)
  | "denied"       // the student blocked notifications for this site in the browser
  | "off"          // available, not enabled for this account on this device
  | "on";

const optinKey = (uid: string) => `push-optin:${uid}`;
const syncedKey = (uid: string) => `push-synced-at:${uid}`;
const DISMISS_KEY = "push-prompt-dismissed-at";
const DISMISS_DAYS = 14;
const RESYNC_MS = 12 * 3600_000;

function ls<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

function pushCapable(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function keyBytes(): Uint8Array {
  const pad = "=".repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4);
  const b64 = (VAPID_PUBLIC_KEY + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  // The worker is only registered in production builds; without this guard `ready` would wait forever in dev.
  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("The app service worker is not ready yet. Reload the page and try again.")), 6000));
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
}

/** Creates (or reuses) the browser subscription and stores it for this account. Needs permission === "granted". */
async function subscribeAndRegister(): Promise<void> {
  const reg = await readyRegistration();
  const key = keyBytes();
  let sub = await reg.pushManager.getSubscription();
  if (sub && !sameKey(sub.options?.applicationServerKey, key)) { await sub.unsubscribe(); sub = null; } // key rotated
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key as BufferSource });
  const j = sub.toJSON();
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) throw new Error("The browser returned an incomplete push subscription.");
  const { error } = await (supabase as any).rpc("register_push_subscription", {
    p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_user_agent: navigator.userAgent,
  });
  if (error) throw new Error(error.message);
}

async function computeStatus(uid: string, ios: boolean, installed: boolean): Promise<PushStatus> {
  if (!pushCapable()) return ios && !installed ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  const on = Notification.permission === "granted" && ls(() => localStorage.getItem(optinKey(uid)) === "1", false) && !!(await currentSubscription());
  return on ? "on" : "off";
}

export function usePush(userId: string | undefined) {
  const { ios, installed } = usePwa();
  const [status, setStatus] = useState<PushStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) { setStatus("unsupported"); return; }
    setStatus(await computeStatus(userId, ios, installed));
  }, [userId, ios, installed]);

  useEffect(() => { void refresh(); }, [refresh]);

  /** Must run inside a click handler (browsers only show the permission prompt for a user gesture). */
  const enable = useCallback(async () => {
    if (!userId || !pushCapable()) return;
    setBusy(true); setError(null);
    try {
      const perm = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
      if (perm === "granted") {
        await subscribeAndRegister();
        ls(() => { localStorage.setItem(optinKey(userId), "1"); localStorage.setItem(syncedKey(userId), String(Date.now())); }, undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn on phone alerts.");
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [userId, refresh]);

  const disable = useCallback(async () => {
    if (!userId) return;
    setBusy(true); setError(null);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await (supabase as any).rpc("unregister_push_subscription", { p_endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      ls(() => localStorage.removeItem(optinKey(userId)), undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn off phone alerts.");
    } finally {
      setBusy(false);
      await refresh();
    }
  }, [userId, refresh]);

  return { status, busy, error, enable, disable };
}

/** After sign-in: if THIS account opted in on THIS device, silently keep the subscription alive (a browser can drop it,
 * or the VAPID key can rotate). Never prompts, never subscribes an account that did not opt in. At most once per 12 h. */
export async function syncPushSubscription(userId: string): Promise<void> {
  try {
    if (!pushCapable() || Notification.permission !== "granted") return;
    if (ls(() => localStorage.getItem(optinKey(userId)), null) !== "1") return;
    const last = Number(ls(() => localStorage.getItem(syncedKey(userId)), "0"));
    if (Date.now() - last < RESYNC_MS && (await currentSubscription())) return;
    await subscribeAndRegister();
    ls(() => localStorage.setItem(syncedKey(userId), String(Date.now())), undefined);
  } catch { /* background upkeep: never surfaces */ }
}

/** Called right BEFORE signing out (needs the live session): detach this device from the account, so the next person
 * who uses the phone never receives the previous student's notifications. Bounded to 3 s so sign-out can't hang. */
export async function detachPushOnSignOut(): Promise<void> {
  if (!pushCapable()) return;
  const work = (async () => {
    const sub = await currentSubscription();
    if (!sub) return;
    await (supabase as any).rpc("unregister_push_subscription", { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  })();
  try { await Promise.race([work, new Promise((r) => setTimeout(r, 3000))]); } catch { /* best effort */ }
}

export function isPushPromptDismissed(): boolean {
  const at = Number(ls(() => localStorage.getItem(DISMISS_KEY), "0"));
  return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
}

export function dismissPushPrompt() {
  ls(() => localStorage.setItem(DISMISS_KEY, String(Date.now())), undefined);
}
