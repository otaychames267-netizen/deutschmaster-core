import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REPORTABLE_EVENT_TYPES = new Set([
  "contextmenu_blocked",
  "copy_blocked",
  "keyboard_shortcut_blocked",
  "print_attempt",
  "devtools_heuristic",
]);

/** Client-side DOM-defense trips report here. Rate-limited generously on
 * the endpoint itself (not the anti-scraping ladder) so the reporting call
 * can't be turned into its own abuse vector by someone holding down
 * right-click. */
export const recordProtectionEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { eventType: string; route: string | null }) => d)
  .handler(async ({ data, context }) => {
    if (!REPORTABLE_EVENT_TYPES.has(data.eventType)) throw new Error("Invalid event type");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertNotRateLimited } = await import("@/lib/rate-limit.server");
    await assertNotRateLimited(supabaseAdmin, { key: `recordProtectionEvent:${context.userId}`, windowSeconds: 60, maxRequests: 60 });
    const { recordIncident } = await import("./suspension.server");
    const result = await recordIncident(supabaseAdmin, { userId: context.userId, eventType: data.eventType, route: data.route });
    return { locked: result.status.accountLocked, suspendedUntil: result.status.suspendedUntil };
  });

/** Called on mount of any protected content route. The authoritative
 * lock check — a suspended account gets a lockout screen instead of
 * exercise content regardless of subscription status. */
export const getContentAccessGate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { checkContentSuspension } = await import("./suspension.server");
    return checkContentSuspension(supabaseAdmin, context.userId);
  });

/** Behavioral pace signal: called once per protected exercise page mount.
 * A sustained pace well beyond any real reader (see maxRequests) trips
 * this and feeds the escalation ladder as a 'high_speed_access' incident —
 * the strongest automated signal this suite has for actual scripted bulk
 * access, as opposed to a human clicking around quickly. */
export const pingContentAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { route: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { checkRateLimit } = await import("@/lib/rate-limit.server");
    const allowed = await checkRateLimit(supabaseAdmin, { key: `content-access-pace:${context.userId}`, windowSeconds: 60, maxRequests: 40 });
    if (!allowed) {
      const { recordIncident } = await import("./suspension.server");
      const result = await recordIncident(supabaseAdmin, { userId: context.userId, eventType: "high_speed_access", route: data.route });
      return { throttled: true, locked: result.status.accountLocked };
    }
    return { throttled: false, locked: false };
  });
