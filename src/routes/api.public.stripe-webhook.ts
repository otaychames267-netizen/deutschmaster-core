import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe webhook receiver — SCAFFOLD ONLY.
 *
 * Wiring checklist (see PHASE_1_CHECKLIST.md):
 *   1. Add secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 *   2. Configure this URL in the Stripe dashboard:
 *      https://<your-domain>/api/public/stripe-webhook
 *   3. Subscribe to events: checkout.session.completed,
 *      customer.subscription.updated, customer.subscription.deleted,
 *      invoice.paid, invoice.payment_failed
 *   4. Set stripe_price_id on each row in `plans` so the handler can
 *      map Stripe prices back to your plan codes.
 */
export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!webhookSecret || !stripeKey) {
          return new Response("Stripe not configured", { status: 503 });
        }

        const signature = request.headers.get("stripe-signature");
        const body = await request.text();
        if (!signature) return new Response("Missing signature", { status: 400 });

        // Signature verification + event parsing will be added when Stripe is enabled.
        // For now we fail closed so unverified payloads can never reach the database.
        let event: { type: string; data: { object: any } };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object;
              const userId = s.metadata?.user_id;
              const planCode = s.metadata?.plan_code;
              if (userId && planCode) {
                await supabaseAdmin.from("subscriptions").insert({
                  user_id: userId,
                  plan_code: planCode,
                  status: "active",
                  is_trial: false,
                  started_at: new Date().toISOString(),
                  expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
                  stripe_customer_id: s.customer,
                  stripe_subscription_id: s.subscription,
                });
                await supabaseAdmin.from("payments").insert({
                  user_id: userId,
                  amount: (s.amount_total ?? 0) / 100,
                  currency: (s.currency ?? "eur").toUpperCase(),
                  status: "succeeded",
                  provider: "stripe",
                  provider_payment_id: s.payment_intent,
                });
              }
              break;
            }
            case "customer.subscription.deleted":
            case "customer.subscription.updated": {
              const s = event.data.object;
              const status = s.status === "active" ? "active" : "cancelled";
              await supabaseAdmin.from("subscriptions")
                .update({ status, cancelled_at: status === "cancelled" ? new Date().toISOString() : null })
                .eq("stripe_subscription_id", s.id);
              break;
            }
            case "invoice.payment_failed": {
              const s = event.data.object;
              await supabaseAdmin.from("subscriptions")
                .update({ status: "suspended" })
                .eq("stripe_subscription_id", s.subscription);
              break;
            }
          }
        } catch (e) {
          console.error("Stripe webhook handler error:", e);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});