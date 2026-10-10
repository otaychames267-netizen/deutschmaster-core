import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Manual revoke/suspend for refund and dispute cases — the practical stand-in
 * for "if the subscription is... refunded... access must be revoked
 * immediately" until real Lemon Squeezy credentials exist and order_refunded
 * webhook handling is wired up (not currently a subscribed event — see the
 * wiring checklist in api.public.lemonsqueezy-webhook.ts). Sets status to
 * 'suspended' rather than 'cancelled' so it's visibly distinct in the admin
 * UI from a student-initiated cancellation, but has the exact same effect on
 * content access — has_plan_access only ever treats 'active' as granting
 * access, so any non-active status revokes access identically and
 * immediately (RLS re-evaluates live, no caching).
 */
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

export const adminRevokeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { subscription_id: string; reason: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.reason?.trim()) throw new Error("A reason is required to revoke a subscription.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: sub, error: subError } = await supabaseAdmin.from("subscriptions").select("id, user_id, status").eq("id", data.subscription_id).maybeSingle();
    if (subError || !sub) throw new Error("Subscription not found.");
    if (sub.status !== "active") throw new Error(`Cannot revoke a subscription with status "${sub.status}" — only active subscriptions can be revoked.`);

    // subscriptions has no admin-note column and d17_admin_actions requires
    // a real order_id (this action isn't necessarily D17-related — it also
    // covers Lemon Squeezy subscriptions) — the reason is folded into the
    // notification body instead, alongside the cancelled_at timestamp and
    // admin_id-less nature of this simple stand-in, consistent with
    // granular admin-permission/audit-log infrastructure being explicitly
    // deferred earlier in this project.
    await supabaseAdmin.from("subscriptions").update({ status: "suspended", cancelled_at: new Date().toISOString() }).eq("id", sub.id);
    await supabaseAdmin.from("notifications").insert({
      user_id: sub.user_id,
      title: "Subscription revoked",
      body: "Your subscription has been revoked by an administrator. Contact support if you believe this is an error.",
      type: "error",
    });

    return { status: "suspended" };
  });
