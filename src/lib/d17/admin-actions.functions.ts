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

async function provisionOrder(
  supabaseAdmin: any,
  userId: string,
  planCode: PlanCode,
  reason: string,
  overrideMinutes?: number,
  overrideCredits?: number,
): Promise<string> {
  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const subRow = {
    user_id: userId,
    plan_code: planCode,
    status: "active" as const,
    is_trial: false,
    expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
  };
  const { data: sub, error: subError } = existingSub
    ? await supabaseAdmin.from("subscriptions").update(subRow).eq("id", existingSub.id).select("id").single()
    : await supabaseAdmin.from("subscriptions").insert({ ...subRow, started_at: new Date().toISOString() }).select("id").single();
  if (subError) throw new Error(`Provisioning failed: ${subError.message}`);

  if (planCode === "muendlich" || planCode === "komplett") {
    await supabaseAdmin.rpc("provision_muendlich_subscription", { p_user_id: userId, p_minutes: overrideMinutes ?? 300, p_reason: reason });
  }
  if (planCode === "schriftlich" || planCode === "komplett") {
    await supabaseAdmin.rpc("provision_essay_credits", { p_user_id: userId, p_amount: overrideCredits ?? 30, p_reason: reason });
  }

  return sub.id as string;
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

    const subscriptionId = await provisionOrder(supabaseAdmin, order.user_id, order.plan_code as PlanCode, "d17_admin_manual_review");
    await supabaseAdmin
      .from("d17_orders")
      .update({ status: "admin_approved", resolved_at: new Date().toISOString(), resolved_by: context.userId, subscription_id: subscriptionId, updated_at: new Date().toISOString() })
      .eq("id", order.id);
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

    const subscriptionId = await provisionOrder(supabaseAdmin, order.user_id, order.plan_code as PlanCode, "d17_admin_adjust_grant", data.minutes, data.credits);
    await supabaseAdmin
      .from("d17_orders")
      .update({ status: "admin_approved", resolved_at: new Date().toISOString(), resolved_by: context.userId, subscription_id: subscriptionId, updated_at: new Date().toISOString() })
      .eq("id", order.id);
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
