import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Lemon Squeezy webhook receiver — the real payment processor, replacing the
 * dead Stripe scaffold (api.public.stripe-webhook.ts, deleted). Verifies the
 * HMAC-SHA256 signature over the exact raw request body, rate-limits repeated
 * bad signatures per source IP, and is idempotent via lemonsqueezy_events'
 * unique constraint on ls_event_id (a signed replay is ack'd 200 without
 * reprocessing, never re-provisions).
 *
 * Wiring checklist:
 *   1. Add secrets: LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_WEBHOOK_SECRET,
 *      LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_SCHRIFTLICH/MUENDLICH/KOMPLETT
 *   2. Configure this URL as the webhook endpoint in the Lemon Squeezy
 *      dashboard: https://<your-domain>/api/public/lemonsqueezy-webhook
 *   3. Subscribe to events: order_created, subscription_created,
 *      subscription_updated, subscription_cancelled, subscription_expired
 */

type LsPlanCode = "schriftlich" | "muendlich" | "komplett";

function resolvePlanCode(variantId: string | number | undefined): LsPlanCode | null {
  if (!variantId) return null;
  const v = String(variantId);
  if (v === process.env.LEMONSQUEEZY_VARIANT_SCHRIFTLICH) return "schriftlich";
  if (v === process.env.LEMONSQUEEZY_VARIANT_MUENDLICH) return "muendlich";
  if (v === process.env.LEMONSQUEEZY_VARIANT_KOMPLETT) return "komplett";
  return null;
}

function scopeKeyFor(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `lemonsqueezy_webhook:${ip}`;
}

export const Route = createFileRoute("/api/public/lemonsqueezy-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
        if (!webhookSecret) {
          return new Response("Lemon Squeezy not configured", { status: 503 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const scopeKey = scopeKeyFor(request);

        // Cheap rejection before doing any HMAC work.
        const { data: locked } = await supabaseAdmin.rpc("is_webhook_locked", { p_scope_key: scopeKey });
        if (locked) {
          return new Response("Too many invalid signatures — temporarily locked", { status: 429 });
        }

        // Raw bytes first — HMAC must cover the exact body, not a re-serialized copy.
        const rawBody = await request.text();
        const signature = request.headers.get("x-signature");
        if (!signature) return new Response("Missing signature", { status: 400 });

        const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
        const sigBuf = Buffer.from(signature, "hex");
        const expBuf = Buffer.from(expected, "hex");
        const valid = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);

        if (!valid) {
          await supabaseAdmin.rpc("record_webhook_signature_failure", { p_scope_key: scopeKey });
          return new Response("Invalid signature", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON payload", { status: 400 });
        }

        const eventType = event?.meta?.event_name as string | undefined;
        const data = event?.data;
        if (!eventType || !data) {
          return new Response("Malformed payload", { status: 400 });
        }

        // Lemon Squeezy doesn't reliably provide a dedicated event id — this
        // composite key is the idempotency backbone.
        const lsEventId = `${eventType}:${data.id}:${data.attributes?.updated_at ?? ""}`;
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from("lemonsqueezy_events")
          .insert({ ls_event_id: lsEventId, event_type: eventType, payload: event })
          .select("id")
          .maybeSingle();

        if (insertErr) {
          // Unique-constraint violation = replay of an event already recorded.
          // Ack 200 without reprocessing rather than erroring (which would
          // just cause Lemon Squeezy to keep retrying forever).
          return new Response("ok (duplicate)", { status: 200 });
        }
        const eventRowId = inserted!.id;

        try {
          await handleEvent(supabaseAdmin, eventType, data, event?.meta);
          await supabaseAdmin.from("lemonsqueezy_events").update({ processed_at: new Date().toISOString() }).eq("id", eventRowId);
        } catch (e: any) {
          await supabaseAdmin.from("lemonsqueezy_events").update({ error_message: String(e?.message ?? e) }).eq("id", eventRowId);
          console.error("[lemonsqueezy-webhook] handler error:", e);
          return new Response("Handler error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

async function handleEvent(supabaseAdmin: any, eventType: string, data: any, meta: any): Promise<void> {
  const attrs = data.attributes ?? {};
  // Primary user resolution path — set via checkout_data.custom.user_id at
  // checkout-creation time (Phase 4). Lemon Squeezy surfaces checkout custom
  // data under the top-level `meta.custom_data`, NOT `data.attributes` — a
  // real mistake caught before this was ever wired to a live payload.
  // Email-match is deliberately NOT used as a fallback: it's unreliable
  // (emails can collide/change) and a silent wrong-user grant would be far
  // worse than a loud failure.
  const userId: string | undefined = meta?.custom_data?.user_id;

  switch (eventType) {
    case "subscription_created":
    case "subscription_updated": {
      if (!userId) {
        throw new Error(`No user_id in custom_data for ${eventType} (ls subscription ${data.id})`);
      }
      const planCode = resolvePlanCode(attrs.variant_id);
      if (!planCode) {
        throw new Error(`Unknown variant_id ${attrs.variant_id} for ${eventType} (ls subscription ${data.id})`);
      }

      const renewsAt: string | undefined = attrs.renews_at;
      // "on_trial" (Lemon Squeezy's own introductory-trial status, distinct
      // from this app's removed free-trial system) is deliberately NOT
      // treated as active — no trial access is granted anywhere in this
      // app, including via a Lemon Squeezy product/variant that happens to
      // have a trial period configured on their side.
      const isActive = attrs.status === "active";

      // Only re-provision when this genuinely looks like a new billing cycle
      // (renews_at advanced past what we already have stored) — avoids
      // double-granting on a benign metadata-only webhook resend that isn't
      // caught by the ls_event_id idempotency key (a different event id,
      // same underlying cycle).
      const { data: existing } = await supabaseAdmin
        .from("subscriptions")
        .select("id, expires_at")
        .eq("lemonsqueezy_subscription_id", String(data.id))
        .maybeSingle();
      const shouldProvision = isActive && (!existing || !renewsAt || new Date(renewsAt) > new Date(existing.expires_at));

      // Row upsert + wallet provisioning run inside one atomic plpgsql
      // function (activate_lemonsqueezy_subscription) instead of separate
      // round-trips — a crash/network failure mid-sequence can no longer
      // leave a subscription marked active with no wallet minutes/credits
      // granted. Mirrors D17's activate_d17_order (same pattern, same
      // reasoning) — see 20260719122000_atomic_lemonsqueezy_activation.sql.
      const { error: activateError } = await supabaseAdmin.rpc("activate_lemonsqueezy_subscription", {
        p_user_id: userId,
        p_plan_code: planCode,
        p_status: isActive ? "active" : "suspended",
        p_expires_at: renewsAt ?? new Date(Date.now() + 30 * 86400_000).toISOString(),
        p_ls_subscription_id: String(data.id),
        p_ls_customer_id: attrs.customer_id ? String(attrs.customer_id) : null,
        p_ls_variant_id: String(attrs.variant_id ?? ""),
        p_should_provision: shouldProvision,
        p_reason: "lemonsqueezy_renewal",
      });
      if (activateError) {
        console.error("[lemonsqueezy-webhook] activate_lemonsqueezy_subscription failed:", activateError);
        throw new Error(`Subscription activation failed for ls subscription ${data.id}`);
      }

      if (shouldProvision) {
        // Best-effort referral conversion — isolated so it can never affect
        // real webhook processing; no-ops instantly if this user wasn't
        // referred, and is idempotent across webhook retries/resends.
        // try/await, not .rpc(...).catch(...): confirmed live (2026-07-22)
        // that supabase-js's PostgrestFilterBuilder is thenable but has no
        // real .catch() method — calling it directly threw
        // "supabaseAdmin.rpc(...).catch is not a function" and 500'd every
        // single subscription_created/subscription_updated webhook, even
        // though the activation RPC just above it had already succeeded.
        try {
          await supabaseAdmin.rpc("process_referral_conversion", { p_referred_user_id: userId });
        } catch (e: unknown) {
          console.error("[lemonsqueezy-webhook] referral conversion failed (non-fatal):", e);
        }
      }
      break;
    }

    case "subscription_cancelled": {
      // Don't revoke already-granted balance — use-it-or-lose-it means it
      // decays naturally at the next window boundary; cancellation just
      // stops future renewals.
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("lemonsqueezy_subscription_id", String(data.id));
      break;
    }

    case "subscription_expired": {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("lemonsqueezy_subscription_id", String(data.id));
      break;
    }

    case "order_created": {
      // Bookkeeping only — provisioning happens exclusively on the
      // subscription_* events, never here, to avoid double-granting
      // alongside subscription_created on the same initial purchase.
      if (userId) {
        await supabaseAdmin.from("payments").insert({
          user_id: userId,
          amount: (attrs.total ?? 0) / 100,
          currency: (attrs.currency ?? "USD").toUpperCase(),
          status: "succeeded",
          provider: "lemonsqueezy",
          provider_payment_id: String(data.id),
        });
      }
      break;
    }

    default:
      // Unhandled event types are acknowledged (200) without action —
      // Lemon Squeezy sends many event types we don't need to react to.
      break;
  }
}
