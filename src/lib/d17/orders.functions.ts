import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PlanCode = "schriftlich" | "muendlich" | "komplett";

const ORDER_LIFETIME_MS = 24 * 3600_000;
const ACTIVE_STATUSES = ["awaiting_payment", "under_review", "manual_review"] as const;

function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/** Flips a stale `awaiting_payment` order to `expired` if it's past its
 * expires_at with nothing submitted yet. No cron exists in this app — this
 * lazy check-and-flip runs at the two places that actually matter: order
 * creation (deciding whether an existing order still blocks a new one) and
 * order fetch (the verify/status pages loading current state). */
async function expireIfStale(supabaseAdmin: any, order: { id: string; status: string; expires_at: string | null }): Promise<string> {
  if (order.status !== "awaiting_payment" || !order.expires_at) return order.status;
  if (new Date(order.expires_at).getTime() >= Date.now()) return order.status;
  await supabaseAdmin.from("d17_orders").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", order.id);
  return "expired";
}

/**
 * Payment confirmation window: if 10 minutes pass after order creation with
 * zero screenshots uploaded, the order moves to `under_review` (previously
 * a defined-but-dead status) instead of silently sitting in
 * `awaiting_payment`. The student can still upload during this window —
 * the pipeline (verify.functions.ts) forces any such attempt to land as
 * manual_review regardless of AI confidence, since a payment that missed
 * its confirmation window needs a human look either way. Same lazy
 * check-and-flip pattern as expireIfStale (no cron exists in this app) —
 * checked at both order creation and order fetch. Runs before
 * expireIfStale: once flipped to under_review, the order is no longer
 * `awaiting_payment`, so the 24h expiry check naturally stops applying to it.
 */
async function flagUnderReviewIfUnconfirmed(
  supabaseAdmin: any,
  order: { id: string; status: string; attempts_used: number; created_at: string },
): Promise<string> {
  if (order.status !== "awaiting_payment" || order.attempts_used > 0) return order.status;
  const { getD17Config } = await import("./config");
  const config = await getD17Config(supabaseAdmin);
  const confirmationWindowMs = config.d17_confirmation_window_minutes * 60_000;
  if (Date.now() - Date.parse(order.created_at) < confirmationWindowMs) return order.status;
  await supabaseAdmin
    .from("d17_orders")
    .update({
      status: "under_review",
      manual_review_deadline: new Date(Date.now() + config.d17_manual_review_window_hours * 3600_000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  return "under_review";
}

/**
 * Creates a D17/bank-transfer order. Snapshots plans.price_tnd at creation
 * time (the single source of truth for pricing, same as
 * src/lib/billing/checkout.functions.ts's Lemon Squeezy checkout) rather
 * than reading it live later, since prices can change and the rule engine's
 * amount-match check needs an honest historical value to compare against.
 * Also snapshots the student's current level and the official D17
 * destination (both audit-only — see the plan's "level" decision: this
 * never changes how unlocking works), and enforces one active order per
 * user (a DB partial-unique-index backstop exists too, but this gives a
 * friendly redirect instead of a raw constraint violation).
 */
export const createD17Order = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_code: PlanCode }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertNotRateLimited } = await import("@/lib/rate-limit.server");
    await assertNotRateLimited(supabaseAdmin, { key: `createD17Order:${context.userId}`, windowSeconds: 60, maxRequests: 10 });
    return createD17OrderImpl(context.userId, data.plan_code);
  });

/** Extracted from the createServerFn handler, same reasoning as
 * verify.functions.ts's runVerificationPipeline — lets this be exercised
 * directly (real DB writes against a test user) without needing to
 * simulate TanStack Start's request context / auth middleware. */
export async function createD17OrderImpl(userId: string, planCode: PlanCode) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("d17_orders")
      .select("id, status, expires_at, attempts_used, created_at")
      .eq("user_id", userId)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const afterConfirmationCheck = await flagUnderReviewIfUnconfirmed(supabaseAdmin, existing);
      const currentStatus = afterConfirmationCheck === "under_review" ? "under_review" : await expireIfStale(supabaseAdmin, existing);
      if (currentStatus !== "expired") {
        const { data: full, error: fullError } = await supabaseAdmin
          .from("d17_orders")
          .select("id, status, amount_tnd, currency, attempts_used, created_at, session_token, destination_number, destination_iban, level")
          .eq("id", existing.id)
          .single();
        if (fullError || !full) throw new Error(`Failed to load existing order: ${fullError?.message}`);
        return { ...full, redirectedToExisting: true };
      }
    }

    // Emergency D17-only switch (distinct from payment_verification_kill_switch,
    // which routes verification ATTEMPTS to manual review while keeping the
    // option available): only gates starting a brand-new order — the
    // existing-order redirect above already returned before this point, so
    // an already-in-flight D17 order is never blocked by this check.
    const { data: d17Disabled } = await supabaseAdmin.rpc("get_platform_setting", { p_key: "d17_disabled" });
    if (d17Disabled === true) {
      throw new Error("Manual D17 payment is temporarily unavailable. Please use card payment instead.");
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("price_tnd")
      .eq("code", planCode)
      .single();
    if (planError || !plan) {
      throw new Error(`Unknown plan "${planCode}".`);
    }

    const { data: profile } = await supabaseAdmin.from("profiles").select("level").eq("id", userId).maybeSingle();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ORDER_LIFETIME_MS).toISOString();
    const sessionToken = generateSessionToken();
    const destinationNumber = process.env.D17_OFFICIAL_NUMBER || null;
    const destinationIban = process.env.D17_OFFICIAL_IBAN || null;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("d17_orders")
      .insert({
        user_id: userId,
        plan_code: planCode,
        amount_tnd: plan.price_tnd,
        level: profile?.level ?? null,
        expires_at: expiresAt,
        session_token: sessionToken,
        session_token_expires_at: expiresAt,
        destination_number: destinationNumber,
        destination_iban: destinationIban,
      })
      .select("id, status, amount_tnd, currency, attempts_used, created_at, session_token, destination_number, destination_iban, level")
      .single();
    if (orderError || !order) {
      throw new Error(`Failed to create order: ${orderError?.message}`);
    }

    return { ...order, redirectedToExisting: false };
}

/** Fetch an order the caller owns (or any order if the caller is an admin) —
 * used by the verification/status pages to render current state. Also
 * carries out the lazy expiry flip so stale orders never appear stuck in
 * "awaiting_payment" indefinitely. */
export const getD17Order = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertNotRateLimited } = await import("@/lib/rate-limit.server");
    await assertNotRateLimited(supabaseAdmin, { key: `getD17Order:${context.userId}`, windowSeconds: 60, maxRequests: 30 });

    const { data: order, error } = await context.supabase
      .from("d17_orders")
      .select(
        "id, user_id, plan_code, amount_tnd, currency, status, attempts_used, manual_review_deadline, resolved_at, created_at, session_token, destination_number, destination_iban, level, expires_at, locked_for_admin_only",
      )
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found.");

    if (order.status === "awaiting_payment") {
      const afterConfirmationCheck = await flagUnderReviewIfUnconfirmed(supabaseAdmin, order);
      const currentStatus = afterConfirmationCheck === "under_review" ? "under_review" : await expireIfStale(supabaseAdmin, order);
      if (currentStatus !== order.status) order.status = currentStatus as typeof order.status;
    }

    return order;
  });
