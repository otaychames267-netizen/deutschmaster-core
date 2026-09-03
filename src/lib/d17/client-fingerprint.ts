/**
 * client-fingerprint.ts — D17-scoped device/browser signals, sent along
 * with each verification attempt. Deliberately a NEW, narrowly-scoped
 * helper rather than reusing src/lib/session-tracking.ts's dormant global
 * login flow (that flow is unused — 0 rows in production, its
 * recordLoginSuccess is dead code — wiring D17 into it would be scope
 * creep for a payment-page spec). The localStorage-UUID pattern below
 * mirrors session-tracking.ts's getOrCreateFingerprint() exactly, just
 * under a separate storage key so the two stay decoupled.
 *
 * Both signals are honestly weak and explicitly capped-influence only in
 * the rule engine (see rule-engine.ts's velocity_signal check) — never a
 * hard gate. No canvas/WebGL fingerprinting library is installed in this
 * repo (nor should one be added for a system explicitly described as
 * temporary); IP address, captured server-side in verify.functions.ts, is
 * the stronger — though still not unbeatable — signal.
 */

const D17_DEVICE_FP_KEY = "d17_device_fp";

/** Persistent per-browser identifier, trivially resettable by clearing
 * storage. Survives across sessions on the same browser/profile. */
export function getOrCreateD17DeviceFingerprint(): string {
  if (typeof window === "undefined") return "ssr";
  // localStorage can throw a SecurityError (Safari "Block All Cookies",
  // locked-down in-app browsers) rather than just returning null — this
  // signal is explicitly weak/advisory (see file header), never worth
  // crashing the payment page over.
  try {
    let fp = localStorage.getItem(D17_DEVICE_FP_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(D17_DEVICE_FP_KEY, fp);
    }
    return fp;
  } catch {
    return "storage-blocked";
  }
}

/** Coarse, non-persistent browser-characteristics signature (user agent +
 * language + timezone + screen resolution, hashed). Survives a localStorage
 * clear — a corroborating signal, not a replacement for the device
 * fingerprint above, since it's far less unique (shared by e.g. every
 * identical device model/OS/browser combination). */
export async function computeD17BrowserFingerprint(): Promise<string> {
  if (typeof navigator === "undefined" || typeof crypto?.subtle === "undefined") return "unavailable";
  const raw = [
    navigator.userAgent,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    typeof screen !== "undefined" ? `${screen.width}x${screen.height}` : "unknown",
  ].join("|");
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
