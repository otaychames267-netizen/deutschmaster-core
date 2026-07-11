import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PlanCode = "schriftlich" | "muendlich" | "komplett";

const VARIANT_ENV: Record<PlanCode, string | undefined> = {
  schriftlich: process.env.LEMONSQUEEZY_VARIANT_SCHRIFTLICH,
  muendlich: process.env.LEMONSQUEEZY_VARIANT_MUENDLICH,
  komplett: process.env.LEMONSQUEEZY_VARIANT_KOMPLETT,
};

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
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    if (!apiKey || !storeId) {
      throw new Error("Lemon Squeezy is not configured yet. Please contact support.");
    }

    const variantId = VARIANT_ENV[data.plan_code];
    if (!variantId) {
      throw new Error(`No Lemon Squeezy variant configured for plan "${data.plan_code}".`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: plan, error: planError } = await supabaseAdmin
      .from("plans")
      .select("price_tnd")
      .eq("code", data.plan_code)
      .single();
    if (planError || !plan) {
      throw new Error(`Unknown plan "${data.plan_code}".`);
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
              custom: { user_id: context.userId },
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
  });
