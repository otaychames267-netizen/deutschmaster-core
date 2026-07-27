import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildVerificationPrompt, parseExtraction, PROMPT_VERSION } from "./verification-prompt";
import { scoreAttempt } from "./rule-engine";
import { OFFICIAL_D17_RECIPIENT } from "./payment-config";
import { UPLOAD_ACCEPTING_STATUSES } from "./status";
import type { DuplicateMatchType } from "./duplicate-check.server";

// Every "*.server.*" module below is dynamically imported at each call site
// rather than statically at the top of the file. This file is a
// createServerFn module, which client route components import directly
// (for the RPC stub) — TanStack Start's import-protection plugin forbids
// any *.server.* file from being reachable in the client bundle graph, even
// transitively. supabaseAdmin already followed this pattern from Phase 1;
// this was missed for email/telegram/alerting/hashing/duplicate-check when
// they were added in later phases, which broke the production build.

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
// Vision provider: Claude is the PRIMARY OCR + fraud-signal engine for D17
// (migrated from Gemini by explicit decision). Claude reads these clean,
// printed-digit D17 receipts with very high accuracy. Set
// D17_VISION_PROVIDER=gemini to roll back instantly without a code change.
// Requires ANTHROPIC_API_KEY in the server env (never committed).
const CLAUDE_VISION_MODEL = process.env.CLAUDE_VISION_MODEL ?? "claude-sonnet-5";
const VISION_PROVIDER = (process.env.D17_VISION_PROVIDER ?? "claude").toLowerCase();

/**
 * Direct Gemini call (not routed through src/lib/import/vision-provider.ts):
 * that abstraction discards usageMetadata after parsing the JSON body, so it
 * can't feed the budget-cap ledger. Kept as the emergency instant-rollback
 * path (D17_VISION_PROVIDER=gemini) — Claude (callClaudeVerification below)
 * is primary; see src/lib/ai/usage-budget.server.ts for the shared token-count
 * ledger both providers feed.
 */
export async function callGeminiVerification(prompt: string, imageBase64_1: string, imageBase64_2: string): Promise<{ raw: any; tokenCount: number }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/png", data: imageBase64_1 } },
        { inline_data: { mime_type: "image/png", data: imageBase64_2 } },
      ],
    }],
    generationConfig: { temperature: 0, response_mime_type: "application/json", thinkingConfig: { thinkingBudget: 0 } },
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
      const json: any = await res.json();
      if (res.status === 429) throw new Error("QUOTA_429");
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      return { raw: JSON.parse(text), tokenCount: Number(json.usageMetadata?.totalTokenCount ?? 0) };
    } catch (e) {
      lastErr = e;
      if (String(e).includes("QUOTA_429")) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Gemini verification call failed: ${String(lastErr)}`);
}

/** Some models occasionally wrap JSON in a ```json fence despite instructions
 * — strip it defensively before parsing so a well-formed answer isn't lost. */
function stripJsonFences(text: string): string {
  const t = text.trim();
  const fenced = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : t).trim();
}

/**
 * Claude Vision extraction — the PRIMARY OCR + fraud-signal engine for the D17
 * pipeline. Same `{ raw, tokenCount }` contract as callGeminiVerification, so
 * everything downstream (parseExtraction → scoreAttempt → the whole calibrated
 * rule engine) is completely unchanged by the migration. temperature 0 for
 * determinism; a strict system prompt forces JSON-only output; both
 * screenshots go in one request (same budget-conserving shape as before).
 * Token usage is fed into the same daily ledger (record_api_usage) the Gemini
 * path used, so the budget cap and 80%-alert keep working across providers.
 */
export async function callClaudeVerification(prompt: string, imageBase64_1: string, imageBase64_2: string): Promise<{ raw: any; tokenCount: number }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  const body = {
    model: CLAUDE_VISION_MODEL,
    max_tokens: 2000,
    temperature: 0,
    system:
      "You are a precise OCR and image-forensics engine for payment-screenshot verification. Transcribe only what is genuinely visible, never invent values, and respond with ONLY the exact JSON object the user's instructions specify — no prose, no explanation, no markdown code fences.",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", source: { type: "base64", media_type: "image/png", data: imageBase64_1 } },
          { type: "image", source: { type: "base64", media_type: "image/png", data: imageBase64_2 } },
        ],
      },
    ],
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      const json: any = await res.json();
      if (res.status === 429) throw new Error("QUOTA_429");
      if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
      const text = json?.content?.find((b: any) => b?.type === "text")?.text ?? "{}";
      const tokenCount = Number(json?.usage?.input_tokens ?? 0) + Number(json?.usage?.output_tokens ?? 0);
      return { raw: JSON.parse(stripJsonFences(text)), tokenCount };
    } catch (e) {
      lastErr = e;
      if (String(e).includes("QUOTA_429")) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Claude verification call failed: ${String(lastErr)}`);
}

/** Single seam the pipeline calls — Claude by default, Gemini only if
 * D17_VISION_PROVIDER=gemini is set (instant, deploy-free rollback lever). */
export async function callVisionVerification(prompt: string, imageBase64_1: string, imageBase64_2: string): Promise<{ raw: any; tokenCount: number }> {
  if (VISION_PROVIDER === "gemini") return callGeminiVerification(prompt, imageBase64_1, imageBase64_2);
  return callClaudeVerification(prompt, imageBase64_1, imageBase64_2);
}

/**
 * The D17 pipeline's single synchronous verification endpoint: given an
 * already-uploaded screenshot (client uploads directly to storage first —
 * see Phase 4), this does hash+duplicate-check+OCR+fraud+rule-engine+
 * decision+provisioning in one round trip. No new async/polling
 * infrastructure — validated against this app's existing Vercel constraints
 * (no maxDuration set anywhere today; the platform default of 10s/15s is too
 * short for a real Gemini call, hence the explicit override below).
 */
export const maxDuration = 90;

// Stamped onto every attempt row so an admin auditing an old decision knows
// exactly which vision model produced it (survives a provider switch).
const AI_VERSION = VISION_PROVIDER === "gemini" ? `gemini:${GEMINI_MODEL}` : `claude:${CLAUDE_VISION_MODEL}`;

const DUPLICATE_REASON_LABEL: Record<DuplicateMatchType, string> = {
  exact_image: "This exact screenshot has already been used on another order.",
  near_duplicate_image: "A near-identical screenshot has already been used on another order.",
  exact_ocr_text: "The text content of this screenshot matches a screenshot already used on another order.",
  cross_account_reference: "This transaction reference has already been used on another order.",
  transaction_id_duplicate: "This Transaction ID has already been used on another order.",
  authorization_number_duplicate: "This Authorization Number has already been used on another order.",
};

async function notifyAndEmail(
  supabaseAdmin: any,
  userId: string,
  title: string,
  body: string,
  type: string,
  email: string | null,
  emailSubject: string,
  emailHtml: string,
) {
  await supabaseAdmin.from("notifications").insert({ user_id: userId, title, body, type });
  if (email) {
    const { sendEmail } = await import("@/lib/notify/email.server");
    await sendEmail({ to: email, subject: emailSubject, html: emailHtml });
  }
}

async function getUserEmail(supabaseAdmin: any, userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

/**
 * Wraps subscription upsert + minutes/credits grant + payment record +
 * order-status update in a single Postgres transaction (activate_d17_order,
 * see 20260714010000_d17_v3_hardening.sql), so a crash or network failure
 * mid-sequence can never leave "payment approved but subscription not
 * unlocked" — either the whole activation commits, or none of it does and
 * the order stays exactly as it was before this call.
 */
export async function activateOrder(
  supabaseAdmin: any,
  params: { orderId: string; userId: string; planCode: string; amountTnd: number; currency: string; reason: string; providerPaymentId: string },
): Promise<string> {
  const { data: subscriptionId, error } = await supabaseAdmin.rpc("activate_d17_order", {
    p_order_id: params.orderId,
    p_user_id: params.userId,
    p_plan_code: params.planCode,
    p_amount_tnd: params.amountTnd,
    p_currency: params.currency,
    p_reason: params.reason,
    p_status: "auto_approved",
    p_provider_payment_id: params.providerPaymentId,
  });
  if (error || !subscriptionId) { console.error("[activateD17Order]", error); throw new Error("Could not activate your subscription. Our team has been notified — please contact support."); }
  return subscriptionId as string;
}

export const submitVerificationAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    order_id: string;
    session_token: string;
    storage_path: string;
    /** Optional — a student who only captured one screenshot is never
     * blocked from submitting (see runVerificationPipeline's single-image
     * branch): missing storage_path_2 routes straight to manual_review
     * instead of being rejected or refused. */
    storage_path_2?: string;
    user_entered_reference: string;
    device_fingerprint?: string;
    browser_fingerprint?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    // IP capture is server-side (x-forwarded-for), not the dormant
    // session-tracking.ts precedent's client-side ipify.org call — more
    // tamper-resistant for a fraud-relevant field, and doesn't block the
    // upload UI on a third-party network call. Must happen here (inside the
    // real request context) rather than inside runVerificationPipeline,
    // which needs to stay callable from a standalone script with no request.
    const request = getRequest();
    const ipAddress = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertNotRateLimited } = await import("@/lib/rate-limit.server");
    await assertNotRateLimited(supabaseAdmin, { key: `submitVerificationAttempt:${context.userId}`, windowSeconds: 60, maxRequests: 10 });

    return runVerificationPipeline(context.userId, data, { ipAddress });
  });

/**
 * The actual pipeline, extracted from the createServerFn handler so it can
 * be exercised directly (real Gemini calls, real DB writes against a test
 * order) without needing to simulate TanStack Start's server-function RPC
 * dispatch. Uses supabaseAdmin exclusively — every authorization check
 * (ownership, session token, status, attempt/rate limits) is explicit here
 * rather than relying on RLS, so a service-role client is correct and
 * sufficient.
 */
export async function runVerificationPipeline(
  userId: string,
  data: {
    order_id: string;
    session_token: string;
    storage_path: string;
    storage_path_2?: string;
    user_entered_reference: string;
    device_fingerprint?: string;
    browser_fingerprint?: string;
  },
  requestContext: { ipAddress: string | null } = { ipAddress: null },
) {
    const reference = data.user_entered_reference.trim();
    if (reference.length < 4) {
      throw new Error("Please enter the Transaction ID / Authorization Number from your D17 confirmation.");
    }
    if (!data.storage_path.startsWith(`${userId}/`) || (data.storage_path_2 && !data.storage_path_2.startsWith(`${userId}/`))) {
      throw new Error("Invalid screenshot path.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sha256Hash, sha256HashText, computeDHash, stripExifAndReencode, validateImageOrThrow } = await import("./image-hash.server");
    const { analyzeImageForensics, combineForensics } = await import("./image-forensics.server");
    const { findDuplicate } = await import("./duplicate-check.server");
    const { alertGeminiFailure, checkBudget80Percent } = await import("./alerting.server");
    const { getD17Config } = await import("./config");
    const config = await getD17Config(supabaseAdmin);

    const { data: order, error: orderError } = await supabaseAdmin
      .from("d17_orders")
      .select("id, user_id, plan_code, amount_tnd, currency, status, attempts_used, created_at, expires_at, session_token, destination_number, destination_iban, locked_for_admin_only")
      .eq("id", data.order_id)
      .maybeSingle();
    if (orderError || !order) throw new Error("Order not found.");
    if (order.user_id !== userId) throw new Error("Forbidden: not your order.");
    // Generic message deliberately does not distinguish "wrong token" from
    // "order not found" — avoids leaking whether an order ID exists to a
    // caller who doesn't hold its session token. The comparison is
    // constant-time (crypto.timingSafeEqual) so a network timing oracle can't
    // recover the token byte-by-byte — the token length (fixed 43-char
    // base64url of 32 random bytes) is not secret, so guarding on equal length
    // first leaks nothing.
    const { timingSafeEqual } = await import("crypto");
    const providedToken = Buffer.from(data.session_token ?? "", "utf8");
    const expectedToken = Buffer.from(order.session_token ?? "", "utf8");
    const sessionOk =
      !!data.session_token &&
      !!order.session_token &&
      providedToken.length === expectedToken.length &&
      timingSafeEqual(providedToken, expectedToken);
    if (!sessionOk) {
      throw new Error("Invalid session. Please reload the payment page and try again.");
    }
    // `manual_review` is deliberately NOT in UPLOAD_ACCEPTING_STATUSES: once
    // a submitted attempt puts an order under review, the order locks —
    // no further self-service re-upload while a decision is pending. The
    // only ways out are an admin decision (approve/reject) or, if rejected,
    // starting a brand-new order from /billing. This was previously a real
    // gap: a student could keep re-uploading into the same order while it
    // sat in manual_review, extending the review deadline each time.
    if (!(UPLOAD_ACCEPTING_STATUSES as readonly string[]).includes(order.status)) {
      throw new Error(
        order.status === "manual_review"
          ? "This order is already under manual review. Please wait for a decision — no further screenshots can be submitted while a review is in progress."
          : `This order is already ${order.status} and cannot accept new screenshots.`,
      );
    }
    if (order.locked_for_admin_only) {
      throw new Error("This order is locked pending administrator review and cannot accept new screenshots.");
    }
    // Independent server-side expiry check — orders.functions.ts's lazy
    // flip (getD17Order/createD17Order) only updates the status column when
    // one of those is called; this pipeline must never trust that a flip
    // has already happened, since a caller hitting this endpoint directly
    // (bypassing the status page) could otherwise submit against an order
    // whose status column is still stale "awaiting_payment" past its real
    // expires_at.
    if (order.expires_at && new Date(order.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from("d17_orders").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", order.id);
      throw new Error("This order has expired and can no longer accept screenshots. Please start a new payment.");
    }

    // Both caps below force the order into manual_review (rather than just
    // rejecting the request and leaving the order otherwise untouched) —
    // hitting either one is itself a signal the order needs a human look,
    // not just "wait a few minutes and keep trying different screenshots."
    async function forceManualReviewAndThrow(message: string): Promise<never> {
      await supabaseAdmin
        .from("d17_orders")
        .update({
          status: "manual_review",
          manual_review_deadline: new Date(Date.now() + config.d17_manual_review_window_hours * 3600_000).toISOString(),
          locked_for_admin_only: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order!.id);
      throw new Error(message);
    }

    if (order.attempts_used >= config.d17_max_attempts_per_order) {
      await forceManualReviewAndThrow(`Maximum of ${config.d17_max_attempts_per_order} screenshot uploads reached for this order. Your order is now under manual review.`);
    }

    // ── Escalating anti-fraud suspension gate — rejected outright, no
    // attempt row written. A confirmed-duplicate history (see
    // fraud-suspension.server.ts) blocks new submissions entirely while
    // active; locked accounts have no automatic unlock.
    const { checkSuspension } = await import("./fraud-suspension.server");
    const suspension = await checkSuspension(supabaseAdmin, userId);
    if (suspension.accountLocked) {
      throw new Error("This account is locked pending admin review due to repeated duplicate payment submissions. Please contact support.");
    }
    if (suspension.suspendedUntil && new Date(suspension.suspendedUntil).getTime() > Date.now()) {
      const hoursLeft = Math.ceil((new Date(suspension.suspendedUntil).getTime() - Date.now()) / 3600_000);
      throw new Error(`New payment submissions are temporarily suspended due to a duplicate payment detection. Please try again in about ${hoursLeft} hour(s), or contact support.`);
    }

    // Strict burst limit — checked (and rejected) before any OCR/Gemini
    // work starts, distinct from the softer hourly cap below: 3 rapid
    // submissions in 10 minutes is a brute-force/spam signal regardless of
    // whether the hourly total is still under budget.
    const { count: recent10MinCount } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 600_000).toISOString());
    if ((recent10MinCount ?? 0) >= config.d17_ten_minute_submission_limit) {
      await forceManualReviewAndThrow(`You've made ${recent10MinCount} upload attempts in the last 10 minutes. Your order is now under manual review — an admin will take a look.`);
    }

    const { count: recentCount } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((recentCount ?? 0) >= config.d17_hourly_submission_limit) {
      throw new Error("Too many verification attempts in the last hour. Please try again later.");
    }

    const attemptNumber = order.attempts_used + 1;
    const userEmail = await getUserEmail(supabaseAdmin, userId);

    async function downloadAndHash(path: string, label: string) {
      const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage.from("payment-screenshots").download(path);
      if (downloadError || !fileBlob) { if (downloadError) console.error("[submitVerificationAttempt] download screenshot", downloadError); throw new Error("Could not read the uploaded screenshot. Please try uploading it again."); }
      const originalBuffer = Buffer.from(await (fileBlob as Blob).arrayBuffer());
      // Server-side re-validation — the client's own type/size check
      // (verify.tsx) is never trusted alone. Runs before hashing/OCR/Gemini
      // ever see the file.
      await validateImageOrThrow(originalBuffer, label);
      // Forensics run on the ORIGINAL bytes — before EXIF-strip/re-encode,
      // which would erase the very compression history and metadata these
      // deterministic checks read.
      const forensics = await analyzeImageForensics(originalBuffer);
      const cleanBuffer = await stripExifAndReencode(originalBuffer);
      return { cleanBuffer, hash: sha256Hash(cleanBuffer), dhash: await computeDHash(cleanBuffer), forensics };
    }

    const shot1 = await downloadAndHash(data.storage_path, "Screenshot 1 (Payment Success)");
    // Screenshot 2 is optional — a student who only captured one screenshot
    // (e.g. forgot to grab the Journal D17 entry before it scrolled away)
    // must never be blocked from submitting at all. See the single-image
    // branch below: this always routes to manual_review rather than running
    // OCR/cross-checks against data that doesn't exist.
    const shot2 = data.storage_path_2 ? await downloadAndHash(data.storage_path_2, "Screenshot 2 (Transaction History)") : null;
    const imageForensics = shot2 ? combineForensics(shot1.forensics, shot2.forensics) : shot1.forensics;
    const imageHashSha256 = shot1.hash;
    const imageDhash = shot1.dhash;
    const imageHashSha256_2 = shot2?.hash ?? null;
    const imageDhash_2 = shot2?.dhash ?? null;

    const startedAt = Date.now();
    const uploadToCreationDeltaMs = startedAt - Date.parse(order.created_at);

    const deviceFingerprint = data.device_fingerprint ?? null;
    const browserFingerprint = data.browser_fingerprint ?? null;
    const ipAddress = requestContext.ipAddress;

    const { normalizeReference } = await import("./rule-engine");
    const normalizedIdentifier = normalizeReference(reference);

    const baseFinalizeParams = () => ({
      order,
      userId,
      userEmail,
      attemptNumber,
      storagePath: data.storage_path,
      storagePath2: data.storage_path_2 ?? null,
      userEnteredReference: reference,
      imageHashSha256,
      imageDhash,
      imageHashSha256_2,
      imageDhash_2,
      uploadToCreationDeltaMs,
      reputationSignalDelta: null,
      velocitySignalPoints: null,
      ipAddress,
      deviceFingerprint,
      browserFingerprint,
      maxAttemptsPerOrder: config.d17_max_attempts_per_order,
      manualReviewWindowHours: config.d17_manual_review_window_hours,
      normalizedIdentifier,
    });

    // ── Authorization-number reservation — the RACE-FREE half of duplicate
    // detection. findDuplicate() below is a plain SELECT-before-INSERT; two
    // near-simultaneous submissions of the identical identifier from
    // different orders could both pass that check before either attempt row
    // existed. This atomic INSERT ... ON CONFLICT (reserve_d17_identifier,
    // see the Phase C migration) closes that race for the one identifier we
    // always have BEFORE any Gemini call: whatever the student typed. A
    // retry from THIS SAME order (e.g. after the fail-closed AI-error path
    // below, which never wrote an attempt row) re-reserves successfully —
    // only a genuinely different order gets rejected.
    // as any: reserve_d17_identifier is not yet in the generated Database
    // type (types.ts isn't regenerated automatically in this environment —
    // see supabase/migrations for the source of truth). Matches this
    // codebase's existing convention for calling a real RPC ahead of a
    // types.ts regen.
    const { data: reservationRows } = await (supabaseAdmin as any).rpc("reserve_d17_identifier", {
      p_normalized_identifier: normalizedIdentifier,
      p_order_id: order.id,
      p_user_id: userId,
    });
    const reservation: { reserved: boolean; held_by_order_id: string; held_by_user_id: string } | null =
      Array.isArray(reservationRows) ? reservationRows[0] : reservationRows;
    if (reservation && reservation.reserved === false) {
      return finalizeAttempt(supabaseAdmin, {
        ...baseFinalizeParams(),
        ocrTextHashSha256: null,
        ocrTextHashSha256_2: null,
        extraction: null,
        decision: "auto_rejected_duplicate",
        decisionReason: "This Authorization Number has already been submitted on another order.",
        riskScore: 100,
        aiConfidence: 0,
        ruleEngineResult: { skipped: true, reason: "identifier_reservation_conflict", heldByOrderId: reservation.held_by_order_id },
        verificationDurationMs: Date.now() - startedAt,
        geminiTokenCount: null,
      });
    }

    // ── Duplicate hard gate — evaluated before any Gemini call, so a hit
    // never costs budget. Applies regardless of the kill switch: reused
    // screenshots are a mechanical fraud signal, not an "AI judgment". Both
    // screenshots are checked; OCR-derived fields (text hash, reference,
    // transaction ID, authorization number) aren't known yet at this stage.
    const duplicate = await findDuplicate(supabaseAdmin, {
      orderId: order.id,
      imageHashSha256,
      imageDhash,
      imageHashSha256_2,
      imageDhash_2,
      ocrTextHashSha256: null,
      ocrTextHashSha256_2: null,
      reference: null,
      transactionId: null,
      authorizationNumber: null,
      userEnteredReference: reference,
    });
    if (duplicate) {
      return finalizeAttempt(supabaseAdmin, {
        ...baseFinalizeParams(),
        ocrTextHashSha256: null,
        ocrTextHashSha256_2: null,
        extraction: null,
        decision: "auto_rejected_duplicate",
        decisionReason: DUPLICATE_REASON_LABEL[duplicate.type],
        riskScore: 100,
        aiConfidence: 0,
        ruleEngineResult: { skipped: true, reason: "duplicate", match: duplicate },
        verificationDurationMs: Date.now() - startedAt,
        geminiTokenCount: null,
      });
    }

    // ── Single-screenshot manual review — a student who only captured
    // Screenshot 1 (forgot to grab the Journal D17 entry, or it scrolled
    // away) is never auto-rejected for an incomplete submission: fraud
    // signals mechanical enough to check without the second image (reused
    // identifier, reused screenshot) have already run above; nothing OCR/
    // cross-check dependent can run on data that doesn't exist, so this
    // always routes straight to manual_review for a human to confirm against
    // the one real screenshot provided. Costs no Gemini budget.
    if (!shot2) {
      return finalizeAttempt(supabaseAdmin, {
        ...baseFinalizeParams(),
        ocrTextHashSha256: null,
        ocrTextHashSha256_2: null,
        extraction: null,
        decision: "manual_review",
        decisionReason: "Your payment proof has been submitted for manual review by our team.",
        riskScore: 50,
        aiConfidence: 50,
        ruleEngineResult: { skipped: true, reason: "single_screenshot_submitted" },
        verificationDurationMs: Date.now() - startedAt,
        geminiTokenCount: null,
      });
    }

    const { data: killSwitch } = await supabaseAdmin.rpc("get_platform_setting", { p_key: "payment_verification_kill_switch" });
    if (killSwitch === true) {
      return finalizeAttempt(supabaseAdmin, {
        ...baseFinalizeParams(),
        ocrTextHashSha256: null,
        ocrTextHashSha256_2: null,
        extraction: null,
        decision: "manual_review",
        decisionReason: "Payment verification is temporarily in manual-only mode.",
        riskScore: 50,
        aiConfidence: 50,
        ruleEngineResult: { skipped: true, reason: "kill_switch_active" },
        verificationDurationMs: Date.now() - startedAt,
        geminiTokenCount: null,
      });
    }

    const { isBudgetExceeded } = await import("@/lib/ai/usage-budget.server");
    if (await isBudgetExceeded(supabaseAdmin)) {
      return finalizeAttempt(supabaseAdmin, {
        ...baseFinalizeParams(),
        ocrTextHashSha256: null,
        ocrTextHashSha256_2: null,
        extraction: null,
        decision: "manual_review",
        decisionReason: "Daily verification budget reached — routed to manual review.",
        riskScore: 50,
        aiConfidence: 50,
        ruleEngineResult: { skipped: true, reason: "budget_exceeded" },
        verificationDurationMs: Date.now() - startedAt,
        geminiTokenCount: null,
      });
    }

    let geminiTokenCount: number | null = null;
    let extraction;
    try {
      const base64Image1 = shot1.cleanBuffer.toString("base64");
      const base64Image2 = shot2.cleanBuffer.toString("base64");
      const prompt = buildVerificationPrompt({ amountTnd: Number(order.amount_tnd), currency: order.currency, planCode: order.plan_code });
      const { raw, tokenCount } = await callVisionVerification(prompt, base64Image1, base64Image2);
      extraction = parseExtraction(raw);
      geminiTokenCount = tokenCount;
    } catch (err) {
      // Fail CLOSED, not into Manual Review: a genuine AI/vision-API crash
      // must never silently become a review-queue entry — an attacker could
      // otherwise deliberately corrupt/break OCR (malformed image, provider
      // outage timing, etc.) to bypass the hard-reject cascade above and land
      // in the more forgiving human-review path instead. No attempt row is
      // written and attempts_used is NOT incremented, so a genuine transient
      // outage costs the student nothing — they see an honest error and can
      // immediately retry. alertGeminiFailure still fires so this is never
      // silent to admins, just never silent-into-approval-adjacent-review.
      console.error("[d17/verify] Vision verification call failed:", err);
      await alertGeminiFailure(supabaseAdmin, err);
      throw new Error("Verification is temporarily unavailable. Please try again in a few minutes.");
    }

    if (geminiTokenCount) {
      await supabaseAdmin.rpc("record_api_usage", { p_tokens: geminiTokenCount });
      await checkBudget80Percent(supabaseAdmin);
    }

    const ocrTextHashSha256 = extraction.raw_text.trim() ? sha256HashText(extraction.raw_text) : null;
    const ocrTextHashSha256_2 = extraction.screenshot2.raw_text.trim() ? sha256HashText(extraction.screenshot2.raw_text) : null;

    // Second duplicate pass now that OCR text/reference/transaction-ID/
    // authorization-number are known — cheap, DB-only, catches exact-text-
    // reuse / cross-account-reference / ID-reuse cases the pre-Gemini pass
    // couldn't check yet.
    const postOcrDuplicate = await findDuplicate(supabaseAdmin, {
      orderId: order.id,
      imageHashSha256,
      imageDhash,
      imageHashSha256_2,
      imageDhash_2,
      ocrTextHashSha256,
      ocrTextHashSha256_2,
      reference: extraction.reference,
      transactionId: extraction.transaction_id,
      authorizationNumber: extraction.authorization_number,
      userEnteredReference: reference,
    });
    if (postOcrDuplicate) {
      return finalizeAttempt(supabaseAdmin, {
        ...baseFinalizeParams(),
        ocrTextHashSha256,
        ocrTextHashSha256_2,
        extraction,
        decision: "auto_rejected_duplicate",
        decisionReason: DUPLICATE_REASON_LABEL[postOcrDuplicate.type],
        riskScore: 100,
        aiConfidence: 0,
        ruleEngineResult: { skipped: true, reason: "duplicate_post_ocr", match: postOcrDuplicate },
        verificationDurationMs: Date.now() - startedAt,
        geminiTokenCount,
      });
    }

    const { computeReputationVelocity } = await import("./reputation-velocity.server");
    const reputationVelocity = await computeReputationVelocity(supabaseAdmin, {
      userId,
      orderId: order.id,
      attemptsInLastHour: recentCount ?? 0,
      deviceFingerprint,
      ipAddress,
    });

    // Multi-account clustering is a signal worth alerting on regardless of
    // how this specific attempt ultimately scores (an approved payment from
    // a farmed device is still worth an admin's attention) — checked here,
    // right after the signal is computed, not gated behind the eventual
    // decision below.
    const { checkMultiAccountAbuse } = await import("./alerting.server");
    await checkMultiAccountAbuse(supabaseAdmin, {
      deviceFingerprint,
      ipAddress,
      sharedDeviceAccountCount: reputationVelocity.sharedDeviceAccountCount,
      sharedIpAccountCount: reputationVelocity.sharedIpAccountCount,
    });

    const scored = scoreAttempt({
      orderAmountTnd: Number(order.amount_tnd),
      orderCurrency: order.currency,
      orderCreatedAt: order.created_at,
      userEnteredReference: reference,
      extraction,
      orderDestinationNumber: order.destination_number,
      orderDestinationIban: order.destination_iban,
      officialRecipientNumber: OFFICIAL_D17_RECIPIENT,
      uploadToCreationDeltaMs,
      reputationVelocity,
      imageForensics,
      autoApproveThreshold: config.d17_auto_approve_threshold,
    });

    const reputationCheck = scored.checks.find((c) => c.id === "reputation_signal");
    const velocityCheck = scored.checks.find((c) => c.id === "velocity_signal");

    // An order that already missed its 10-minute payment-confirmation
    // window (orders.functions.ts's flagUnderReviewIfUnconfirmed) never
    // auto-approves, however high the AI confidence — it needs a human
    // look either way. Fraud rejections are left alone (a hard gate is a
    // hard gate regardless of the confirmation window).
    const forcedManualReview = order.status === "under_review" && scored.decision === "auto_approved";
    const finalDecision = forcedManualReview ? "manual_review" : scored.decision;
    const finalDecisionReason = forcedManualReview
      ? "This order missed its 10-minute payment confirmation window and requires manual review regardless of AI confidence."
      : scored.decisionReason;

    return finalizeAttempt(supabaseAdmin, {
      ...baseFinalizeParams(),
      ocrTextHashSha256,
      ocrTextHashSha256_2,
      extraction,
      decision: finalDecision,
      decisionReason: finalDecisionReason,
      riskScore: scored.riskScore,
      aiConfidence: scored.aiConfidence,
      ruleEngineResult: scored,
      verificationDurationMs: Date.now() - startedAt,
      geminiTokenCount,
      reputationSignalDelta: reputationCheck?.points ?? null,
      velocitySignalPoints: velocityCheck?.points ?? null,
    });
}

export async function finalizeAttempt(
  supabaseAdmin: any,
  params: {
    order: { id: string; plan_code: string; amount_tnd: number; currency: string };
    userId: string;
    userEmail: string | null;
    attemptNumber: number;
    storagePath: string;
    /** Null when only Screenshot 1 was submitted (single-image manual-review
     * path, see runVerificationPipeline). */
    storagePath2: string | null;
    userEnteredReference: string;
    imageHashSha256: string;
    imageDhash: bigint;
    imageHashSha256_2: string | null;
    imageDhash_2: bigint | null;
    ocrTextHashSha256: string | null;
    ocrTextHashSha256_2: string | null;
    extraction: ReturnType<typeof parseExtraction> | null;
    decision: "auto_approved" | "manual_review" | "auto_rejected_duplicate" | "auto_rejected_fraud";
    decisionReason: string;
    riskScore: number;
    aiConfidence: number;
    ruleEngineResult: unknown;
    verificationDurationMs: number;
    geminiTokenCount: number | null;
    uploadToCreationDeltaMs: number;
    reputationSignalDelta: number | null;
    velocitySignalPoints: number | null;
    ipAddress: string | null;
    deviceFingerprint: string | null;
    browserFingerprint: string | null;
    isAdminReplay?: boolean;
    maxAttemptsPerOrder: number;
    manualReviewWindowHours: number;
    normalizedIdentifier: string;
  },
) {
  const e = params.extraction;
  const { data: attempt, error: insertError } = await supabaseAdmin
    .from("d17_verification_attempts")
    .insert({
      order_id: params.order.id,
      user_id: params.userId,
      attempt_number: params.attemptNumber,
      is_admin_replay: params.isAdminReplay ?? false,
      storage_path: params.storagePath,
      storage_path_2: params.storagePath2,
      user_entered_reference: params.userEnteredReference,
      ip_address: params.ipAddress,
      device_fingerprint: params.deviceFingerprint,
      browser_fingerprint: params.browserFingerprint,
      normalized_identifier: params.normalizedIdentifier,
      screenshot_type: e?.screenshot_type ?? null,
      screenshot_type_2: e?.screenshot2.screenshot_type ?? null,
      confidence_authorization_number: e?.field_confidence.authorization_number ?? null,
      confidence_amount: e?.field_confidence.amount ?? null,
      confidence_currency: e?.field_confidence.currency ?? null,
      confidence_destination: e?.field_confidence.destination ?? null,
      confidence_payment_datetime: e?.field_confidence.payment_datetime ?? null,
      ocr_raw_text: e?.raw_text ?? null,
      ocr_confidence: e?.ocr_confidence ?? null,
      ocr_amount: e?.amount ?? null,
      ocr_currency: e?.currency ?? null,
      ocr_payment_datetime: e?.payment_datetime ?? null,
      ocr_reference: e?.reference ?? null,
      ocr_notification_source: e?.notification_source ?? null,
      ocr_language_detected: e?.language_detected ?? null,
      fraud_score: e?.fraud_score ?? null,
      fraud_flags: e?.fraud_flags ?? [],
      screenshot_integrity_ok: e?.screenshot_integrity_ok ?? null,
      image_hash_sha256: params.imageHashSha256,
      image_dhash: params.imageDhash.toString(),
      ocr_text_hash_sha256: params.ocrTextHashSha256,
      image_hash_sha256_2: params.imageHashSha256_2,
      image_dhash_2: params.imageDhash_2?.toString() ?? null,
      ocr_text_hash_sha256_2: params.ocrTextHashSha256_2,
      ocr_amount_2: e?.screenshot2.amount ?? null,
      ocr_currency_2: e?.screenshot2.currency ?? null,
      ocr_payment_datetime_2: e?.screenshot2.payment_datetime ?? null,
      ocr_destination_2: e?.screenshot2.destination ?? null,
      ocr_authorization_number_2: e?.screenshot2.authorization_number ?? null,
      ocr_destination_number: e?.destination_number ?? null,
      ocr_destination_iban: e?.destination_iban ?? null,
      ocr_transaction_id: e?.transaction_id ?? null,
      ocr_authorization_number: e?.authorization_number ?? null,
      cross_check_consistent: e?.cross_check.consistent ?? null,
      cross_check_summary: e ? { consistent: e.cross_check.consistent, notes: e.cross_check.notes } : null,
      upload_to_creation_delta_ms: params.uploadToCreationDeltaMs,
      reputation_signal_delta: params.reputationSignalDelta,
      velocity_signal_points: params.velocitySignalPoints,
      risk_score: params.riskScore,
      ai_confidence: params.aiConfidence,
      rule_engine_result: params.ruleEngineResult,
      decision: params.decision,
      decision_reason: params.decisionReason,
      ai_version: AI_VERSION,
      ocr_version: PROMPT_VERSION,
      verification_duration_ms: params.verificationDurationMs,
      gemini_token_count: params.geminiTokenCount,
    })
    .select("*")
    .single();
  if (insertError || !attempt) { console.error("[recordVerificationAttempt]", insertError); throw new Error("Could not record your verification attempt. Please try again."); }

  // Opportunistic devices upsert — regardless of decision, since a device
  // seen on a rejected/fraud attempt is itself a useful future risk signal.
  // Manual check-then-update/insert (not a DB-level upsert) so a repeat
  // submission from the same device never creates a duplicate row, mirroring
  // src/lib/session-tracking.ts's existing (dormant) precedent exactly.
  if (params.deviceFingerprint) {
    const { data: existingDevice } = await supabaseAdmin
      .from("devices")
      .select("id")
      .eq("user_id", params.userId)
      .eq("device_fingerprint", params.deviceFingerprint)
      .maybeSingle();
    if (existingDevice) {
      await supabaseAdmin.from("devices").update({ last_seen_at: new Date().toISOString() }).eq("id", existingDevice.id);
    } else {
      await supabaseAdmin.from("devices").insert({
        user_id: params.userId,
        device_fingerprint: params.deviceFingerprint,
        device_name: "D17 payment verification",
        ip_address: params.ipAddress,
        is_trusted: false,
      });
    }
  }

  if (params.decision === "auto_approved") {
    await activateOrder(supabaseAdmin, {
      orderId: params.order.id,
      userId: params.userId,
      planCode: params.order.plan_code,
      amountTnd: params.order.amount_tnd,
      currency: params.order.currency,
      reason: "d17_verification",
      providerPaymentId: attempt.id,
    });
    // Best-effort referral conversion — never allowed to affect a real
    // payment activation, hence the isolated try/catch. No-ops instantly if
    // this user wasn't referred.
    // try/await, not .rpc(...).catch(...): confirmed live (2026-07-22) that
    // supabase-js's PostgrestFilterBuilder has no real .catch() method —
    // calling it directly threw "TypeError: ...catch is not a function"
    // UNCONDITIONALLY on every single auto-approved D17 verification, right
    // after the real activateOrder() activation above had already
    // committed. The student's subscription was silently activated
    // correctly, but this uncaught throw then made the verification
    // endpoint return an error to their browser and skipped the success
    // email below — a real payment made to look like it failed.
    try {
      await supabaseAdmin.rpc("process_referral_conversion", { p_referred_user_id: params.userId });
    } catch (e: unknown) {
      console.error("[d17/finalizeAttempt] referral conversion failed (non-fatal):", e);
    }
    await notifyAndEmail(
      supabaseAdmin,
      params.userId,
      "Payment verified",
      "Your D17 payment has been verified and your subscription is now active.",
      "success",
      params.userEmail,
      "Your AuraLingovia subscription is active",
      "<p>Your D17 payment has been verified and your subscription is now active. Good luck with your exam prep!</p>",
    );
  } else if (params.decision === "manual_review") {
    // Once the upload-attempt cap is reached without an auto-approval, the
    // order locks — no more retries, however long the manual_review_deadline
    // countdown has left. Surfaced distinctly in the admin queue so these
    // "exhausted all attempts" cases stand out from a normal single
    // sub-90%-confidence review.
    const reachedCap = params.attemptNumber >= params.maxAttemptsPerOrder;
    await supabaseAdmin
      .from("d17_orders")
      .update({
        status: "manual_review",
        manual_review_deadline: new Date(Date.now() + params.manualReviewWindowHours * 3600_000).toISOString(),
        locked_for_admin_only: reachedCap,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.order.id);
    await notifyAndEmail(
      supabaseAdmin,
      params.userId,
      "Additional verification required",
      "We're reviewing your payment screenshot manually. This can take up to 8 hours.",
      "warning",
      params.userEmail,
      "Your AuraLingovia payment is under review",
      "<p>We received your payment screenshot but need a manual review before activating your subscription. This can take up to 8 hours — we'll notify you as soon as it's resolved.</p>",
    );
  } else {
    // auto_rejected_duplicate | auto_rejected_fraud
    await supabaseAdmin
      .from("d17_orders")
      .update({ status: "rejected", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", params.order.id);
    await notifyAndEmail(
      supabaseAdmin,
      params.userId,
      "Payment could not be verified",
      "Please upload another payment notification or contact support.",
      "error",
      params.userEmail,
      "We couldn't verify your AuraLingovia payment",
      "<p>We couldn't verify your payment screenshot. Please upload another payment notification, or contact support with your order ID.</p>",
    );
    const { checkHighRiskCluster } = await import("./alerting.server");
    await checkHighRiskCluster(supabaseAdmin);

    if (params.decision === "auto_rejected_duplicate") {
      const { escalateSuspension } = await import("./fraud-suspension.server");
      const escalation = await escalateSuspension(supabaseAdmin, { userId: params.userId, attemptId: attempt.id });
      if (escalation.tier === 2 || escalation.tier === 3) {
        const { alertFraudSuspensionEscalated } = await import("./alerting.server");
        await alertFraudSuspensionEscalated(supabaseAdmin, {
          userId: params.userId,
          tier: escalation.tier,
          confirmedDuplicateCount: escalation.confirmedDuplicateCount,
        });
      }
    }
  }

  return attempt;
}
