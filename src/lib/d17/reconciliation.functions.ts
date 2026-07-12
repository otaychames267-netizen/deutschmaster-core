import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

/**
 * Internal-consistency reconciliation only: there is no bank-statement feed
 * anywhere in this codebase, so this cannot literally "reconcile against
 * verified bank deposits" — it flags approved D17 orders whose provisioning
 * looks inconsistent (no linked subscription, or a linked subscription that
 * doesn't match what the order implies), which is the actionable subset of
 * that requirement buildable with data this app actually has.
 */
export const getWeeklyReconciliation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: missingSubscription } = await supabaseAdmin
      .from("d17_orders")
      .select("id, user_id, plan_code, amount_tnd, status, resolved_at")
      .in("status", ["auto_approved", "admin_approved"])
      .is("subscription_id", null);

    const { data: approvedOrders } = await supabaseAdmin
      .from("d17_orders")
      .select("id, user_id, plan_code, subscription_id, status")
      .in("status", ["auto_approved", "admin_approved"])
      .not("subscription_id", "is", null);

    const subIds = (approvedOrders ?? []).map((o: any) => o.subscription_id);
    const { data: subs } = subIds.length
      ? await supabaseAdmin.from("subscriptions").select("id, plan_code, status").in("id", subIds)
      : { data: [] };
    const subById = new Map((subs ?? []).map((s: any) => [s.id, s]));

    const mismatched = (approvedOrders ?? []).filter((o: any) => {
      const sub = subById.get(o.subscription_id);
      return !sub || sub.plan_code !== o.plan_code || sub.status !== "active";
    });

    return {
      missingSubscription: missingSubscription ?? [],
      mismatched,
      checkedAt: new Date().toISOString(),
    };
  });
