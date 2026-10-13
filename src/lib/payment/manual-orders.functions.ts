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
type PlanCode = "schriftlich" | "muendlich" | "komplett" | "komplett_ai";

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
  /** Length of the purchased term: 1, 2 or 3 months (the grant on approval is 30 days x months). */
  months: number;
  method: ManualMethod;
  status: "pending_verification" | "approved" | "rejected";
  level: string | null;
  rejection_reason: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const createManualPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_code: PlanCode; method: ManualMethod; months?: 1 | 2 | 3 }) => d)
  .handler(async ({ data, context }): Promise<ManualPaymentOrder> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { assertNotRateLimited } = await import("@/lib/rate-limit.server");
    await assertNotRateLimited(supabaseAdmin, { key: `createManualPaymentOrder:${context.userId}`, windowSeconds: 60, maxRequests: 10 });

    const { isPlanPurchasable } = await import("@/lib/features");
    if (!isPlanPurchasable(data.plan_code)) {
      throw new Error("This plan is not available yet.");
    }

    const months = data.months === 3 ? 3 : data.months === 2 ? 2 : 1;
    // The server decides the price (plans table through plan_term_price: includes the launch-offer end date); an unknown plan or a plan without a
    // 2-/3-month pack raises here, so a crafted request can never pick its own amount or term.
    const { data: price, error: priceError } = await db.rpc("plan_term_price", { p_code: data.plan_code, p_months: months });
    if (String(priceError?.message ?? "").includes("PLAN_CLOSED")) throw new Error("Platinum opens this evening. يفتح Platinum هذا المساء.");
    if (priceError || price === null || price === undefined) {
      throw new Error(String(priceError?.message ?? "").includes("TERM_NOT_AVAILABLE") ? `This plan has no ${months}-month pack.` : `Unknown plan \"${data.plan_code}\".`);
    }
    const amountTnd = Number(price);
    if (!Number.isFinite(amountTnd) || amountTnd < 30) throw new Error("This plan's price is invalid right now. Please contact support.");

    if (data.plan_code === "komplett_ai") {
      const { data: lv } = await db.from("profiles").select("level").eq("id", context.userId).maybeSingle();
      if (lv?.level === "TELC_B1") throw new Error("Platinum (AI Sprachtrainer) is for B2 only. Platinum متاحة لمستوى B2 فقط."); // before the pending-order replacement below, so a refused request changes nothing
    }

    // Reuse an existing pending order for the same method AND the same plan, term and amount rather than stacking duplicates (D17's one-active-order
    // posture). A pending order for something else is replaced: the student changed their mind, and the old one must not be payable by mistake.
    const { data: existing } = await db
      .from("manual_payment_orders")
      .select("id, plan_code, amount_tnd, months, method, status, level, rejection_reason, created_at, resolved_at, user_id")
      .eq("user_id", context.userId)
      .eq("method", data.method)
      .eq("status", "pending_verification")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing && existing.plan_code === data.plan_code && Number(existing.months) === months && Number(existing.amount_tnd) === amountTnd) return existing as ManualPaymentOrder;
    if (existing) {
      const nowIso = new Date().toISOString();
      await db.from("manual_payment_orders").update({ status: "rejected", rejection_reason: "replaced_by_new_order", resolved_at: nowIso, updated_at: nowIso }).eq("id", existing.id).eq("status", "pending_verification");
    }

    const { data: profile } = await db.from("profiles").select("level").eq("id", context.userId).maybeSingle();

    const { data: order, error } = await db
      .from("manual_payment_orders")
      .insert({
        user_id: context.userId,
        plan_code: data.plan_code,
        amount_tnd: amountTnd,
        months,
        method: data.method,
        level: profile?.level ?? null,
      })
      .select("id, plan_code, amount_tnd, months, method, status, level, rejection_reason, created_at, resolved_at, user_id")
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
      .select("id, plan_code, amount_tnd, months, method, status, level, rejection_reason, created_at, resolved_at, user_id")
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
      .select("id, user_id, plan_code, amount_tnd, months, method, status, level, rejection_reason, created_at, resolved_at")
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
      .select("id, user_id, plan_code, status, method, months")
      .eq("id", data.order_id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!order) throw new Error("Order not found.");
    if (order.status !== "pending_verification") {
      throw new Error(`Order is already ${order.status}.`);
    }

    // Reuses the exact same audited grant path as the existing manual
    // subscription admin tool — a 30-day grant per purchased month (1 or 2), same wallet provisioning
    // (essay credits / muendlich minutes) side effects included.
    const { error: grantError } = await db.rpc("admin_manual_subscription_action", {
      p_admin_id: context.userId,
      p_user_id: order.user_id,
      p_action: "grant",
      p_action_label: `manual_payment_${order.method}`,
      p_plan_code: order.plan_code,
      p_is_trial: false,
      p_new_expires_at: new Date(Date.now() + 30 * 86_400_000 * ([2, 3].includes(Number(order.months)) ? Number(order.months) : 1)).toISOString(), // 30 days per purchased month
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

    // A 2-/3-month pack carries that many months' worth of Schreiben corrections (owner 2026-10-11: 60 instead of 30; 3 months = 90). The grant above set the essay-credit wallet to 30
    // (one month); provision_essay_credits SETS the balance (it is not additive), so granting 30 x months here lands on exactly 60 / 90 and is safe to repeat.
    const termMonths = [2, 3].includes(Number(order.months)) ? Number(order.months) : 1;
    if (termMonths >= 2 && ["schriftlich", "komplett", "komplett_ai"].includes(order.plan_code)) {
      const { error: creditError } = await db.rpc("provision_essay_credits", { p_user_id: order.user_id, p_amount: 30 * termMonths, p_reason: `manual_payment_${order.method}_${termMonths}_months` });
      if (creditError) throw new Error(`Subscription granted but the multi-month credit top-up failed: ${creditError.message} — approve again to retry.`);
    }

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
