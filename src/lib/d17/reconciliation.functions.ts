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

/**
 * Daily reconciliation worklist — every APPROVED D17 order in a date range
 * (default: today, UTC), each surfaced with the exact fields an admin needs to
 * eyeball against the real D17 app: authorization number, amount, payment
 * time, the student, and whether it was auto- or admin-approved. D17 exposes
 * no received-payments feed, so this is a manual verification aid, not an
 * automated matcher — the admin confirms each against their own D17 history
 * and revokes any with no matching real deposit. Read-only; the "reconciled"
 * marker and the revoke action are separate explicit calls below / reused.
 */
export const getD17ReconciliationList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from?: string; to?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const now = new Date();
    const from = data.from ? new Date(data.from) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const to = data.to ? new Date(data.to) : new Date(from.getTime() + 24 * 3600_000);

    const { data: orders } = await supabaseAdmin
      .from("d17_orders")
      .select("id, user_id, plan_code, amount_tnd, currency, status, subscription_id, created_at, resolved_at")
      .in("status", ["auto_approved", "admin_approved"])
      .gte("resolved_at", from.toISOString())
      .lt("resolved_at", to.toISOString())
      .order("resolved_at", { ascending: false });

    const orderIds = (orders ?? []).map((o: any) => o.id);
    const userIds = Array.from(new Set((orders ?? []).map((o: any) => o.user_id)));

    const { data: attempts } = orderIds.length
      ? await supabaseAdmin
          .from("d17_verification_attempts")
          .select("order_id, attempt_number, ocr_authorization_number, ocr_amount, ocr_payment_datetime, user_entered_reference, decision")
          .in("order_id", orderIds)
          .order("attempt_number", { ascending: false })
      : { data: [] as any[] };
    const latestByOrder = new Map<string, any>();
    for (const a of attempts ?? []) if (!latestByOrder.has(a.order_id)) latestByOrder.set(a.order_id, a);

    const { data: profiles } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] as any[] };
    const profileById = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));

    const { data: recActions } = orderIds.length
      ? await supabaseAdmin.from("d17_admin_actions").select("order_id, created_at").eq("action", "reconciled").in("order_id", orderIds)
      : { data: [] as any[] };
    const reconciledByOrder = new Map<string, any>();
    for (const r of recActions ?? []) if (!reconciledByOrder.has(r.order_id)) reconciledByOrder.set(r.order_id, r);

    const rows = (orders ?? []).map((o: any) => {
      const a = latestByOrder.get(o.id);
      const p = profileById.get(o.user_id);
      const rec = reconciledByOrder.get(o.id);
      return {
        orderId: o.id,
        userId: o.user_id,
        studentName: p?.full_name ?? null,
        studentEmail: p?.email ?? null,
        planCode: o.plan_code,
        amountTnd: Number(o.amount_tnd),
        currency: o.currency,
        status: o.status,
        subscriptionId: o.subscription_id,
        createdAt: o.created_at,
        resolvedAt: o.resolved_at,
        authorizationNumber: a?.ocr_authorization_number ?? a?.user_entered_reference ?? null,
        enteredReference: a?.user_entered_reference ?? null,
        ocrAmount: a?.ocr_amount ?? null,
        paymentDatetime: a?.ocr_payment_datetime ?? null,
        approvedAutomatically: o.status === "auto_approved",
        reconciledAt: rec?.created_at ?? null,
      };
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      rows,
      summary: {
        count: rows.length,
        reconciled: rows.filter((r) => r.reconciledAt).length,
        pending: rows.filter((r) => !r.reconciledAt).length,
        totalTnd: rows.reduce((s, r) => s + (r.amountTnd || 0), 0),
      },
    };
  });

/**
 * Marks an approved order as "reconciled" — the admin has confirmed it against
 * a real D17 payment. Recorded in the append-only d17_admin_actions timeline
 * (action free-text, no schema change) so tomorrow's worklist can hide what's
 * already been checked. Does NOT change access — it's a review bookmark. To
 * revoke an order that has NO matching real payment, use adminRejectOrder
 * (src/lib/d17/admin-actions.functions.ts), which cancels the subscription,
 * logs the reason, and notifies the student.
 */
export const adminMarkReconciled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin.from("d17_orders").select("id").eq("id", data.order_id).maybeSingle();
    if (error || !order) throw new Error("Order not found.");
    await supabaseAdmin.from("d17_admin_actions").insert({
      order_id: data.order_id,
      admin_id: context.userId,
      action: "reconciled",
      note: data.note?.trim() || "Confirmed against a real D17 payment.",
    });
    return { status: "reconciled" };
  });
