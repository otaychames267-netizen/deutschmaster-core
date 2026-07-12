import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PlanCode = "schriftlich" | "muendlich" | "komplett";

/**
 * Creates a D17/bank-transfer order. Snapshots plans.price_tnd at creation
 * time (the single source of truth for pricing, same as
 * src/lib/billing/checkout.functions.ts's Lemon Squeezy checkout) rather
 * than reading it live later, since prices can change and the rule engine's
 * amount-match check needs an honest historical value to compare against.
 */
export const createD17Order = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_code: PlanCode }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("price_tnd")
      .eq("code", data.plan_code)
      .single();
    if (planError || !plan) {
      throw new Error(`Unknown plan "${data.plan_code}".`);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("d17_orders")
      .insert({
        user_id: context.userId,
        plan_code: data.plan_code,
        amount_tnd: plan.price_tnd,
      })
      .select("id, status, amount_tnd, currency, attempts_used, created_at")
      .single();
    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    return order;
  });

/** Fetch an order the caller owns (or any order if the caller is an admin) —
 * used by the verification/status pages to render current state. */
export const getD17Order = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("d17_orders")
      .select("id, user_id, plan_code, amount_tnd, currency, status, attempts_used, manual_review_deadline, resolved_at, created_at")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found.");
    return order;
  });
