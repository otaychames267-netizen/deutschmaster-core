import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Virement Postal / Virement Bancaire — manual, no-OCR payment methods.
 * Student creates a lightweight `manual_payment_orders` row, sends the
 * receipt via WhatsApp, then waits for admin approval. Approval reuses
 * admin_manual_subscription_action() (the exact function the existing
 * manual-subscription admin tool already uses) for the actual grant, so
 * this never re-implements subscription activation.
 *
 * `manual_payment_orders` is a new table not yet in the checked-in
 * generated types.ts — casts past it here, same convention already used
 * elsewhere in this codebase for RPCs ahead of a types regen.
 */

export type ManualMethod = "postal" | "bancaire" | "d17";
type PlanCode = "schriftlich" | "muendlich" | "komplett";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

export interface ManualPaymentOrder {
  id: string;
  user_id: string;
  plan_code: string;
  amount_tnd: number;
  method: ManualMethod;
  status: "pending_verification" | "approved" | "rejected";
  level: string | null;
  rejection_reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const createManualPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_code: PlanCode; method: ManualMethod }) => d)
  .handler(async ({ data, context }): Promise<ManualPaymentOrder> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { assertNotRateLimited } = await import("@/lib/rate-limit.server");
    await assertNotRateLimited(supabaseAdmin, { key: `createManualPaymentOrder:${context.userId}`, windowSeconds: 60, maxRequests: 10 });

    const { isPlanPurchasable } = await import("@/lib/features");
    if (!isPlanPurchasable(data.plan_code)) {
      throw new Error("This plan is not available yet.");
    }

    // Reuse an existing pending order for the same method rather than
    // stacking duplicates — same posture as D17's one-active-order rule.
    const { data: existing } = await db
      .from("manual_payment_orders")
      .select("id, plan_code, amount_tnd, method, status, level, rejection_reason, created_at, resolved_at, user_id")
      .eq("user_id", context.userId)
      .eq("method", data.method)
      .eq("status", "pending_verification")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return existing as ManualPaymentOrder;

    const { data: plan, error: planError } = await db
      .from("plans")
      .select("price_tnd")
      .eq("code", data.plan_code)
      .single();
    if (planError || !plan) throw new Error(`Unknown plan "${data.plan_code}".`);

    const { data: profile } = await db.from("profiles").select("level").eq("id", context.userId).maybeSingle();

    const { data: order, error } = await db
      .from("manual_payment_orders")
      .insert({
        user_id: context.userId,
        plan_code: data.plan_code,
        amount_tnd: plan.price_tnd,
        method: data.method,
        level: profile?.level ?? null,
      })
      .select("id, plan_code, amount_tnd, method, status, level, rejection_reason, created_at, resolved_at, user_id")
      .single();
    if (error || !order) throw new Error(`Failed to create order: ${error?.message}`);
    return order as ManualPaymentOrder;
  });

export const getManualPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }): Promise<ManualPaymentOrder> => {
    const { data: order, error } = await (context.supabase as any)
      .from("manual_payment_orders")
      .select("id, plan_code, amount_tnd, method, status, level, rejection_reason, created_at, resolved_at, user_id")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found.");
    return order as ManualPaymentOrder;
  });

export interface ManualPaymentOrderAdminRow extends ManualPaymentOrder {
  email: string | null;
  full_name: string | null;
}

export const adminListManualPaymentOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: "pending_verification" | "approved" | "rejected" }) => d)
  .handler(async ({ data, context }): Promise<ManualPaymentOrderAdminRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    let query = db
      .from("manual_payment_orders")
      .select("id, user_id, plan_code, amount_tnd, method, status, level, rejection_reason, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) query = query.eq("status", data.status);
    const { data: orders, error } = await query;
    if (error) throw new Error(error.message);

    const userIds = [...new Set((orders ?? []).map((o: any) => o.user_id))];
    let profiles: any[] = [];
    if (userIds.length) {
      const res = await db.from("profiles").select("id, email, full_name").in("id", userIds);
      profiles = res.data ?? [];
    }
    const byId = new Map(profiles.map((p: any) => [p.id, p]));

    return (orders ?? []).map((o: any) => ({
      ...o,
      email: byId.get(o.user_id)?.email ?? null,
      full_name: byId.get(o.user_id)?.full_name ?? null,
    }));
  });

const MANUAL_METHOD_LABEL: Record<ManualMethod, string> = {
  postal: "Virement Postal",
  bancaire: "Virement Bancaire",
  d17: "D17",
};

export const adminApproveManualPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }): Promise<void> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: order, error: fetchError } = await db
      .from("manual_payment_orders")
      .select("id, user_id, plan_code, status, method")
      .eq("id", data.order_id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!order) throw new Error("Order not found.");
    if (order.status !== "pending_verification") {
      throw new Error(`Order is already ${order.status}.`);
    }

    // Reuses the exact same audited grant path as the existing manual
    // subscription admin tool — 1-month grant, same wallet provisioning
    // (essay credits / muendlich minutes) side effects included.
    const { error: grantError } = await db.rpc("admin_manual_subscription_action", {
      p_admin_id: context.userId,
      p_user_id: order.user_id,
      p_action: "grant",
      p_action_label: `manual_payment_${order.method}`,
      p_plan_code: order.plan_code,
      p_is_trial: false,
      p_new_expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      // manual_subscription_actions.payment_method has a CHECK constraint
      // limited to ('virement','cash','d17','other') — postal/bancaire are
      // both literally "virement" (transfer) in that vocabulary, while d17
      // maps to its own literal value for accurate accounting. The exact
      // method is also preserved in p_action_label below and in this
      // order's own `method` column either way.
      p_payment_method: order.method === "d17" ? "d17" : "virement",
      p_reference: order.id,
    });
    if (grantError) throw new Error(grantError.message);

    const { error: updateError } = await db
      .from("manual_payment_orders")
      .update({ status: "approved", resolved_at: new Date().toISOString(), resolved_by: context.userId, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    if (updateError) throw new Error(updateError.message);
  });

export const adminRejectManualPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; reason?: string }) => d)
  .handler(async ({ data, context }): Promise<void> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    const { data: order, error: fetchError } = await db
      .from("manual_payment_orders")
      .select("id, status")
      .eq("id", data.order_id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!order) throw new Error("Order not found.");
    if (order.status !== "pending_verification") {
      throw new Error(`Order is already ${order.status}.`);
    }

    const { error } = await db
      .from("manual_payment_orders")
      .update({
        status: "rejected",
        rejection_reason: data.reason?.trim() || null,
        resolved_at: new Date().toISOString(),
        resolved_by: context.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    if (error) throw new Error(error.message);
  });

export { MANUAL_METHOD_LABEL };
