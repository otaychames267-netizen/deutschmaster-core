import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
// sendEmail (a *.server.* module) is dynamically imported at each call site
// rather than statically here — this file is imported by client route
// components for its createServerFn RPC stubs, and TanStack Start's
// import-protection plugin forbids any *.server.* module from being
// reachable in the client bundle graph, even transitively.

type PlanCode = "schriftlich" | "muendlich" | "komplett";
const RESOLVABLE_STATUSES = ["manual_review", "under_review", "rejected", "auto_approved", "admin_approved"];

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

async function getUserEmail(supabaseAdmin: any, userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

/**
 * Wraps subscription upsert + minutes/credits grant + payment record +
 * order-status update in a single Postgres transaction
 * (activate_d17_order, see 20260714010000_d17_v3_hardening.sql) — the same
 * function src/lib/d17/verify.functions.ts's automated path uses, so
 * "payment approved but subscription not unlocked" can never happen
 * regardless of which path approved it.
 */
async function activateOrder(
  supabaseAdmin: any,
  params: {
    orderId: string;
    userId: string;
    planCode: PlanCode;
    amountTnd: number;
    currency: string;
    reason: string;
    resolvedBy: string;
    overrideMinutes?: number;
    overrideCredits?: number;
  },
): Promise<string> {
  const { data: subscriptionId, error } = await supabaseAdmin.rpc("activate_d17_order", {
    p_order_id: params.orderId,
    p_user_id: params.userId,
    p_plan_code: params.planCode,
    p_amount_tnd: params.amountTnd,
    p_currency: params.currency,
    p_reason: params.reason,
    p_status: "admin_approved",
    p_resolved_by: params.resolvedBy,
    p_override_minutes: params.overrideMinutes ?? null,
    p_override_credits: params.overrideCredits ?? null,
  });
  if (error || !subscriptionId) throw new Error(`Atomic activation failed: ${error?.message}`);
  return subscriptionId as string;
}

export const adminApproveOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderError } = await supabaseAdmin.from("d17_orders").select("*").eq("id", data.order_id).maybeSingle();
    if (orderError || !order) throw new Error("Order not found.");
    if (!RESOLVABLE_STATUSES.includes(order.status)) throw new Error(`Cannot approve an order with status "${order.status}".`);

    await activateOrder(supabaseAdmin, {
      orderId: order.id,
      userId: order.user_id,
      planCode: order.plan_code as PlanCode,
      amountTnd: order.amount_tnd,
      currency: order.currency,
      reason: "d17_admin_manual_review",
      resolvedBy: context.userId,
    });
    await supabaseAdmin.from("d17_admin_actions").insert({ order_id: order.id, admin_id: context.userId, action: "approve", note: data.note ?? null });

    const userEmail = await getUserEmail(supabaseAdmin, order.user_id);
    await supabaseAdmin.from("notifications").insert({
      user_id: order.user_id,
      title: "Payment approved",
      body: "Your D17 payment has been manually approved. Your subscription is now active.",
      type: "success",
    });
    if (userEmail) {
      const { sendEmail } = await import("@/lib/notify/email.server");
      await sendEmail({
        to: userEmail,
        subject: "Your AuraLingovia subscription is active",
        html: "<p>Your D17 payment has been manually approved. Your subscription is now active — good luck with your exam prep!</p>",
      });
    }
    return { status: "admin_approved" };
  });

/** Locked/suspended accounts have no automatic unlock path by design — an
 * admin must explicitly review and clear the suspension. Does not reset
 * confirmed_duplicate_count (a permanent record); only clears the active
 * consequence, so a subsequent confirmed duplicate still escalates from
 * where the count left off. */
export const adminClearSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; order_id: string; note?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { clearSuspension } = await import("./fraud-suspension.server");

    await clearSuspension(supabaseAdmin, data.user_id);
    await supabaseAdmin.from("d17_admin_actions").insert({
      order_id: data.order_id,
      admin_id: context.userId,
      action: "clear_suspension",
      note: data.note ?? null,
    });

    return { status: "cleared" };
  });

export const adminRejectOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; note: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.note?.trim()) throw new Error("A rejection note is required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderError } = await supabaseAdmin.from("d17_orders").select("*").eq("id", data.order_id).maybeSingle();
    if (orderError || !order) throw new Error("Order not found.");
    if (!RESOLVABLE_STATUSES.includes(order.status)) throw new Error(`Cannot reject an order with status "${order.status}".`);

    await supabaseAdmin
      .from("d17_orders")
      .update({ status: "rejected", resolved_at: new Date().toISOString(), resolved_by: context.userId, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    await supabaseAdmin.from("d17_admin_actions").insert({ order_id: order.id, admin_id: context.userId, action: "reject", note: data.note.trim() });

    const userEmail = await getUserEmail(supabaseAdmin, order.user_id);
    await supabaseAdmin.from("notifications").insert({
      user_id: order.user_id,
      title: "Payment could not be verified",
      body: "Please upload another payment notification or contact support.",
      type: "error",
    });
    if (userEmail) {
      const { sendEmail } = await import("@/lib/notify/email.server");
      await sendEmail({
        to: userEmail,
        subject: "We couldn't verify your AuraLingovia payment",
        html: `<p>We couldn't verify your payment screenshot. Please upload another payment notification, or contact support with your order ID.</p><p>Note: ${data.note.trim()}</p>`,
      });
    }
    return { status: "rejected" };
  });

export const adminAdjustGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; minutes?: number; credits?: number; note?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.minutes === undefined && data.credits === undefined) {
      throw new Error("Provide minutes and/or credits to grant.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderError } = await supabaseAdmin.from("d17_orders").select("*").eq("id", data.order_id).maybeSingle();
    if (orderError || !order) throw new Error("Order not found.");

    await activateOrder(supabaseAdmin, {
      orderId: order.id,
      userId: order.user_id,
      planCode: order.plan_code as PlanCode,
      amountTnd: order.amount_tnd,
      currency: order.currency,
      reason: "d17_admin_adjust_grant",
      resolvedBy: context.userId,
      overrideMinutes: data.minutes,
      overrideCredits: data.credits,
    });
    await supabaseAdmin.from("d17_admin_actions").insert({
      order_id: order.id,
      admin_id: context.userId,
      action: "adjust_grant",
      note: data.note ?? null,
      granted_minutes_override: data.minutes ?? null,
      granted_credits_override: data.credits ?? null,
    });

    const userEmail = await getUserEmail(supabaseAdmin, order.user_id);
    await supabaseAdmin.from("notifications").insert({
      user_id: order.user_id,
      title: "Subscription updated",
      body: "An admin has manually adjusted your subscription.",
      type: "success",
    });
    if (userEmail) {
      const { sendEmail } = await import("@/lib/notify/email.server");
      await sendEmail({
        to: userEmail,
        subject: "Your AuraLingovia subscription was updated",
        html: "<p>An admin has manually adjusted your subscription. Check your dashboard for the updated balance.</p>",
      });
    }
    return { status: "admin_approved" };
  });
