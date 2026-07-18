import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PlanCode = "schriftlich" | "muendlich" | "komplett";

const VARIANT_ENV: Record<PlanCode, string | undefined> = {
  schriftlich: process.env.LEMONSQUEEZY_VARIANT_SCHRIFTLICH,
  muendlich: process.env.LEMONSQUEEZY_VARIANT_MUENDLICH,
  komplett: process.env.LEMONSQUEEZY_VARIANT_KOMPLETT,
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: isSuper } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) throw new Error("Forbidden: admin only");
}

/**
 * Admin-only mock checkout, active exclusively while LEMONSQUEEZY_API_KEY/
 * STORE_ID are unset (i.e. real credentials haven't arrived yet). Performs
 * the identical provisioning the real webhook does (same RPCs, same
 * hard-reset semantics) so the rest of the app behaves identically to a
 * real purchase — but everything is tagged "mock_" so it's never confused
 * with real revenue in the audit trail. Gated to admins only: any
 * non-admin caller falls through to the ordinary "not configured yet"
 * error below, so a real student can never trigger a free grant this way.
 * Once real credentials are set, this whole branch stops being reachable
 * without any code changes — the swap is just adding the env vars.
 */
async function mockCheckoutSession(planCode: PlanCode, context: { supabase: any; userId: string }) {
  try {
    await assertAdmin(context);
  } catch {
    // Non-admin callers see the exact same message they'd get once real
    // credentials exist but something else went wrong — never leak that an
    // admin-only mock path exists.
    throw new Error("Lemon Squeezy is not configured yet. Please contact support.");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const mockId = `mock_${crypto.randomUUID()}`;
  const reason = "mock_checkout";

  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const subRow = {
    user_id: context.userId,
    plan_code: planCode,
    status: "active" as const,
    is_trial: false,
    expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
    lemonsqueezy_subscription_id: mockId,
  };
  const { error: subError } = existingSub
    ? await supabaseAdmin.from("subscriptions").update(subRow).eq("id", existingSub.id)
    : await supabaseAdmin.from("subscriptions").insert({ ...subRow, started_at: new Date().toISOString() });
  if (subError) throw new Error(`Mock checkout failed: ${subError.message}`);

  if (planCode === "muendlich" || planCode === "komplett") {
    await supabaseAdmin.rpc("provision_muendlich_subscription", { p_user_id: context.userId, p_minutes: 300, p_reason: reason });
  }
  if (planCode === "schriftlich" || planCode === "komplett") {
    await supabaseAdmin.rpc("provision_essay_credits", { p_user_id: context.userId, p_amount: 30, p_reason: reason });
  }

  await supabaseAdmin.from("lemonsqueezy_events").insert({
    ls_event_id: mockId,
    event_type: "mock_checkout",
    payload: { plan_code: planCode, user_id: context.userId, mock: true },
    user_id: context.userId,
    processed_at: new Date().toISOString(),
  });

  return { checkoutUrl: "/billing?mock=success" };
}

/**
 * Creates a Lemon Squeezy checkout session for one of the 3 subscription
 * tiers. The `plans` table's price_tnd is the single source of truth for
 * pricing — this function converts it to the checkout currency at request
 * time via a static env-configured rate (no live-rate API, matching this
 * repo's existing static-price-column convention) and passes it as
 * checkout_data.custom_price so the actual charge always matches what the
 * student saw on /billing, regardless of what currency the Lemon Squeezy
 * product/variant itself is denominated in.
 *
 * checkout_data.custom.user_id is the ONLY reliable way the webhook
 * (api.public.lemonsqueezy-webhook.ts) can resolve which account to
 * provision — Lemon Squeezy surfaces this back as `meta.custom_data` on
 * every subsequent webhook event for this subscription.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_code: PlanCode }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertNotRateLimited } = await import("@/lib/rate-limit.server");
    await assertNotRateLimited(supabaseAdmin, { key: `createCheckoutSession:${context.userId}`, windowSeconds: 60, maxRequests: 10 });
    return createCheckoutSessionImpl(context.userId, data.plan_code);
  });

/**
 * The actual logic, extracted from the createServerFn handler so it can be
 * called directly — by a standalone test script, or by
 * src/lib/billing/payment-provider.ts's LemonSqueezyProvider (Phase 7) —
 * without needing TanStack Start's request/middleware context. Builds its
 * own supabaseAdmin (service-role) client rather than relying on a
 * request-scoped one, mirroring the exact pattern already established for
 * src/lib/d17/orders.functions.ts's createD17OrderImpl.
 */
export async function createCheckoutSessionImpl(userId: string, planCode: PlanCode) {
    // Launch gate: while the Mündlich module is disabled, only Schriftlich is
    // sellable (Komplett and Mündlich both grant speaking access). Mirrors the
    // identical guard in src/lib/d17/orders.functions.ts so neither payment
    // path can open a Mündlich/Komplett order regardless of how it's called.
    const { isPlanPurchasable } = await import("@/lib/features");
    if (!isPlanPurchasable(planCode)) {
      throw new Error("This plan is not available yet. Only the Schriftlich plan can be purchased at this time.");
    }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!apiKey || !storeId) {
      return mockCheckoutSession(planCode, { supabase: supabaseAdmin, userId });
    }

    const variantId = VARIANT_ENV[planCode];
    if (!variantId) {
      throw new Error(`No Lemon Squeezy variant configured for plan "${planCode}".`);
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("price_tnd")
      .eq("code", planCode)
      .single();
    if (planError || !plan) {
      throw new Error(`Unknown plan "${planCode}".`);
    }

    const rate = Number(process.env.TND_TO_USD_RATE ?? "3.1");
    const priceUsd = Number(plan.price_tnd) / rate;
    const customPriceCents = Math.round(priceUsd * 100);

    const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/vnd.api+json",
        Accept: "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              custom_price: customPriceCents,
              custom: { user_id: userId },
            },
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: variantId } },
          },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[checkout.functions] Lemon Squeezy checkout creation failed:", res.status, errText.slice(0, 500));
      throw new Error("Could not start checkout. Please try again in a moment.");
    }

    const json: any = await res.json();
    const checkoutUrl = json?.data?.attributes?.url;
    if (!checkoutUrl) {
      throw new Error("Checkout session created but no URL was returned.");
    }

    return { checkoutUrl };
}
