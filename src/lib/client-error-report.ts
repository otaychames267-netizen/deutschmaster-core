/**
 * Best-effort client error log. Until now an uncaught error only produced "Something went wrong" on the student's screen and a console line
 * nobody ever saw, so there was no way to tell WHY it happened for some students. Every error that reaches the root error boundary (and every
 * failed chunk load) is now written to `client_error_log` through the `log_client_error` RPC, which truncates, de-duplicates and rate-limits.
 * Never throws and never blocks the UI.
 */
import { supabase } from "@/integrations/supabase/client";

const sent = new Set<string>();
const MAX_PER_PAGE_LOAD = 5;

function describe(error: unknown): { message: string; stack: string } {
  if (error instanceof Error) return { message: `${error.name}: ${error.message}`, stack: error.stack ?? "" };
  if (typeof error === "string") return { message: error, stack: "" };
  try { return { message: JSON.stringify(error)?.slice(0, 500) ?? String(error), stack: "" }; } catch { return { message: String(error), stack: "" }; }
}

export function reportClientError(kind: "boundary" | "chunk" | "window", error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || sent.size >= MAX_PER_PAGE_LOAD) return;
  try {
    const { message, stack } = describe(error);
    const key = `${kind}|${message}`;
    if (sent.has(key)) return;
    sent.add(key);
    const online = typeof navigator !== "undefined" ? navigator.onLine : null;
    // a caller may pass its own `path` (e.g. the OAuth callback, whose query string carries a one-time code that must not be logged)
    const { path: pathOverride, ...restContext } = context;
    const path = typeof pathOverride === "string" ? pathOverride : window.location.pathname + window.location.search.slice(0, 80);
    void Promise.resolve(
      (supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<unknown> }).rpc("log_client_error", {
        p_kind: kind,
        p_path: path,
        p_message: message.slice(0, 600),
        p_stack: stack.slice(0, 2500),
        p_context: { online, standalone: window.matchMedia?.("(display-mode: standalone)").matches ?? null, lang: navigator.language, ...restContext },
      }),
    ).catch(() => {});
  } catch { /* logging must never become the next error */ }
}
