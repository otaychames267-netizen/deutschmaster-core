/**
 * Local autosave for in-progress practice attempts (Lesen Teil 1/2/3, …).
 *
 * Purpose: a student must never lose answers to a page refresh or a closed
 * browser tab (Engineering Spec §23 — "Stable autosave / Reliable recovery
 * after refresh"). This persists the in-progress attempt to localStorage,
 * keyed per user + exercise, and restores it on remount.
 *
 * This is intentionally local-only and reusable across every Teil. Durable,
 * cross-device progress (history / statistics) is a separate concern handled
 * server-side once an attempt is submitted.
 */

const PREFIX = "aura.practice.attempt.v1";

/** Build a stable storage key from namespace parts (e.g. "lesen.t2", userId, exerciseId). */
export function attemptKey(parts: Array<string | number>): string {
  return [PREFIX, ...parts].join(":");
}

/** Read a saved attempt. Returns null on miss, SSR, corrupt JSON, or disabled storage. */
export function loadAttempt<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Persist an attempt. Silently no-ops on SSR, quota errors, or disabled storage. */
export function saveAttempt<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / blocked — autosave is best-effort, never throw into the UI */
  }
}

/** Remove a saved attempt (e.g. after reset or successful submission cleanup). */
export function clearAttempt(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
