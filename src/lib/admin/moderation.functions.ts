import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Real, server-enforced user moderation — replaces admin.users.tsx's prior
 * `toggleBan`, which only ever wrote profiles.is_banned from the browser.
 * Nothing anywhere READ that column (not RLS, not login), so a "ban" had
 * ZERO real effect: the user could still log in and access every gated
 * table. Found and fixed during the 2026-07-18 final E2E audit.
 *
 * A real ban now does two independent things:
 *  1. Sets Supabase's own auth.users.banned_until (via the Admin API) — this
 *     is enforced by GoTrue itself: blocks new sign-ins and blocks the
 *     user's next token refresh, so within at most one access-token lifetime
 *     (this app's default, ~1h) every session for that user stops working,
 *     without needing any token-revocation-list infra.
 *  2. Mirrors profiles.is_banned, which has_plan_access() now also checks
 *     (20260718020000_ban_referral_audit.sql) — defense-in-depth so a
 *     still-live access token issued just before the ban can't read gated
 *     content in that worst-case window either.
 * Both writes go through the service-role client; profiles.is_banned is no
 * longer client-writable at all except by an admin through this function
 * (enforced by the guard_profiles_role_change trigger).
 */
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

// GoTrue's ban_duration takes a duration string; there's no literal
// "forever", so this project's convention (matching Supabase's own docs
// example) is a 10-year duration as the practical equivalent of permanent.
const PERMANENT_BAN_DURATION = "87600h";

export const adminSetUserBan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; banned: boolean; reason?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId && data.banned) {
      throw new Error("You cannot ban your own account.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.banned ? PERMANENT_BAN_DURATION : "none",
    });
    if (authErr) throw new Error(`Auth ban update failed: ${authErr.message}`);

    const { error: profileErr } = await supabaseAdmin.from("profiles").update({ is_banned: data.banned }).eq("id", data.user_id);
    if (profileErr) throw new Error(`Profile sync failed: ${profileErr.message}`);

    // admin_audit_log is new — not yet in the generated types.ts.
    await (supabaseAdmin as any).from("admin_audit_log").insert({
      actor_id: context.userId,
      action: data.banned ? "ban" : "unban",
      target_user_id: data.user_id,
      note: data.reason ?? null,
    });

    return { user_id: data.user_id, banned: data.banned };
  });
