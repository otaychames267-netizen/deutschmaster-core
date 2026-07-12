import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isBudgetExceeded } from "@/lib/grading/essay-grader-gemini";
import { buildVerificationPrompt, parseExtraction } from "./verification-prompt";
import { scoreAttempt } from "./rule-engine";
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

/**
 * Direct Gemini call (not routed through src/lib/import/vision-provider.ts):
 * that abstraction discards usageMetadata after parsing the JSON body, so it
 * can't feed the budget-cap ledger. Same REST/retry/temperature:0 pattern as
 * src/lib/grading/essay-grader-gemini.ts, which needs the same token count
 * for the same reason and is the closer precedent for a budget-tracked call.
 */
async function callGeminiVerification(prompt: string, imageBase64: string): Promise<{ raw: any; tokenCount: number }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/png", data: imageBase64 } }] }],
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

/**
 * The D17 pipeline's single synchronous verification endpoint: given an
 * already-uploaded screenshot (client uploads directly to storage first —
 * see Phase 4), this does hash+duplicate-check+OCR+fraud+rule-engine+
 * decision+provisioning in one round trip. No new async/polling
 * infrastructure — validated against this app's existing Vercel constraints
 * (no maxDuration set anywhere today; the platform default of 10s/15s is too
 * short for a real Gemini call, hence the explicit override below).
 */
export const maxDuration = 60;

const MAX_ATTEMPTS_PER_ORDER = 5;
const HOURLY_SUBMISSION_LIMIT = Number(process.env.D17_HOURLY_SUBMISSION_LIMIT ?? 5);
const MANUAL_REVIEW_WINDOW_HOURS = 8;
const ACTIVE_ORDER_STATUSES = ["awaiting_payment", "manual_review", "under_review"];
const AI_VERSION = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const DUPLICATE_REASON_LABEL: Record<DuplicateMatchType, string> = {
  exact_image: "This exact screenshot has already been used on another order.",
  near_duplicate_image: "A near-identical screenshot has already been used on another order.",
  exact_ocr_text: "The text content of this screenshot matches a screenshot already used on another order.",
  cross_account_reference: "This transaction reference has already been used on another order.",
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

async function provisionOrder(supabaseAdmin: any, userId: string, planCode: string, reason: string) {
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
    await supabaseAdmin.rpc("provision_muendlich_subscription", { p_user_id: userId, p_minutes: 300, p_reason: reason });
  }
  if (planCode === "schriftlich" || planCode === "komplett") {
    await supabaseAdmin.rpc("provision_essay_credits", { p_user_id: userId, p_amount: 30, p_reason: reason });
  }

  return sub.id as string;
}

export const submitVerificationAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; session_token: string; storage_path: string; storage_path_2: string; user_entered_reference: string }) => d)
  .handler(async ({ data, context }) => runVerificationPipeline(context.userId, data));

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
  data: { order_id: string; session_token: string; storage_path: string; storage_path_2: string; user_entered_reference: string },
) {
    const reference = data.user_entered_reference.trim();
    if (reference.length < 4) {
      throw new Error("Please enter the Transaction ID / Authorization Number from your D17 confirmation.");
    }
    if (!data.storage_path.startsWith(`${userId}/`) || !data.storage_path_2.startsWith(`${userId}/`)) {
      throw new Error("Invalid screenshot path.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sha256Hash, sha256HashText, computeDHash, stripExifAndReencode } = await import("./image-hash.server");
    const { findDuplicate } = await import("./duplicate-check.server");
    const { alertGeminiFailure, checkBudget80Percent } = await import("./alerting.server");

    const { data: order, error: orderError } = await supabaseAdmin
      .from("d17_orders")
      .select("id, user_id, plan_code, amount_tnd, currency, status, attempts_used, created_at, session_token")
      .eq("id", data.order_id)
      .maybeSingle();
    if (orderError || !order) throw new Error("Order not found.");
    if (order.user_id !== userId) throw new Error("Forbidden: not your order.");
    // Generic message deliberately does not distinguish "wrong token" from
    // "order not found" — avoids leaking whether an order ID exists to a
    // caller who doesn't hold its session token.
    if (!data.session_token || data.session_token !== order.session_token) {
      throw new Error("Invalid session. Please reload the payment page and try again.");
    }
    if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
      throw new Error(`This order is already ${order.status} and cannot accept new screenshots.`);
    }
    if (order.attempts_used >= MAX_ATTEMPTS_PER_ORDER) {
      throw new Error("Maximum of 5 screenshot uploads reached for this order. Awaiting manual review.");
    }

    const { count: recentCount } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 3600_000).toISOString());
    if ((recentCount ?? 0) >= HOURLY_SUBMISSION_LIMIT) {
      throw new Error("Too many verification attempts in the last hour. Please try again later.");
    }

    const attemptNumber = order.attempts_used + 1;
    const userEmail = await getUserEmail(supabaseAdmin, userId);

    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from("payment-screenshots")
      .download(data.storage_path);
    if (downloadError || !fileBlob) throw new Error(`Could not read the uploaded screenshot: ${downloadError?.message ?? "not found"}`);
    const originalBuffer = Buffer.from(await (fileBlob as Blob).arrayBuffer());
    const cleanBuffer = await stripExifAndReencode(originalBuffer);

    const imageHashSha256 = sha256Hash(cleanBuffer);
    const imageDhash = await computeDHash(cleanBuffer);

    const startedAt = Date.now();

    // ── Duplicate hard gate — evaluated before any Gemini call, so a hit
    // never costs budget. Applies regardless of the kill switch: reused
    // screenshots are a mechanical fraud signal, not an "AI judgment".
    const duplicate = await findDuplicate(supabaseAdmin, {
      orderId: order.id,
      imageHashSha256,
      imageDhash,
      ocrTextHashSha256: null, // no OCR text yet at this stage — text-reuse is only checked once we have it, below
      reference: null,
    });
    if (duplicate) {
      return finalizeAttempt(supabaseAdmin, {
        order,
        userId,
        userEmail,
        attemptNumber,
        storagePath: data.storage_path,
        storagePath2: data.storage_path_2,
        userEnteredReference: reference,
        imageHashSha256,
        imageDhash,
        ocrTextHashSha256: null,
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

    const { data: killSwitch } = await supabaseAdmin.rpc("get_platform_setting", { p_key: "payment_verification_kill_switch" });
    if (killSwitch === true) {
      return finalizeAttempt(supabaseAdmin, {
        order,
        userId,
        userEmail,
        attemptNumber,
        storagePath: data.storage_path,
        storagePath2: data.storage_path_2,
        userEnteredReference: reference,
        imageHashSha256,
        imageDhash,
        ocrTextHashSha256: null,
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

    if (await isBudgetExceeded(supabaseAdmin)) {
      return finalizeAttempt(supabaseAdmin, {
        order,
        userId,
        userEmail,
        attemptNumber,
        storagePath: data.storage_path,
        storagePath2: data.storage_path_2,
        userEnteredReference: reference,
        imageHashSha256,
        imageDhash,
        ocrTextHashSha256: null,
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
      const base64Image = cleanBuffer.toString("base64");
      const prompt = buildVerificationPrompt({ amountTnd: Number(order.amount_tnd), currency: order.currency, planCode: order.plan_code });
      const { raw, tokenCount } = await callGeminiVerification(prompt, base64Image);
      extraction = parseExtraction(raw);
      geminiTokenCount = tokenCount;
    } catch (err) {
      console.error("[d17/verify] Gemini call failed:", err);
      await alertGeminiFailure(supabaseAdmin, err);
      return finalizeAttempt(supabaseAdmin, {
        order,
        userId,
        userEmail,
        attemptNumber,
        storagePath: data.storage_path,
        storagePath2: data.storage_path_2,
        userEnteredReference: reference,
        imageHashSha256,
        imageDhash,
        ocrTextHashSha256: null,
        extraction: null,
        decision: "manual_review",
        decisionReason: "Automated verification is temporarily unavailable — routed to manual review.",
        riskScore: 50,
        aiConfidence: 50,
        ruleEngineResult: { skipped: true, reason: "gemini_error", error: String(err) },
        verificationDurationMs: Date.now() - startedAt,
        geminiTokenCount: null,
      });
    }

    if (geminiTokenCount) {
      await supabaseAdmin.rpc("record_api_usage", { p_tokens: geminiTokenCount });
      await checkBudget80Percent(supabaseAdmin);
    }

    const ocrTextHashSha256 = extraction.raw_text.trim() ? sha256HashText(extraction.raw_text) : null;

    // Second duplicate pass now that OCR text and reference are known —
    // cheap, DB-only, catches exact-text-reuse / cross-account-reference
    // cases the pre-Gemini pass couldn't check yet.
    const postOcrDuplicate = await findDuplicate(supabaseAdmin, {
      orderId: order.id,
      imageHashSha256,
      imageDhash,
      ocrTextHashSha256,
      reference: extraction.reference,
    });
    if (postOcrDuplicate) {
      return finalizeAttempt(supabaseAdmin, {
        order,
        userId,
        userEmail,
        attemptNumber,
        storagePath: data.storage_path,
        storagePath2: data.storage_path_2,
        userEnteredReference: reference,
        imageHashSha256,
        imageDhash,
        ocrTextHashSha256,
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

    const scored = scoreAttempt({
      orderAmountTnd: Number(order.amount_tnd),
      orderCurrency: order.currency,
      orderCreatedAt: order.created_at,
      userEnteredReference: reference,
      extraction,
    });

    return finalizeAttempt(supabaseAdmin, {
      order,
      userId,
      userEmail,
      attemptNumber,
      storagePath: data.storage_path,
      storagePath2: data.storage_path_2,
      userEnteredReference: reference,
      imageHashSha256,
      imageDhash,
      ocrTextHashSha256,
      extraction,
      decision: scored.decision,
      decisionReason: scored.decisionReason,
      riskScore: scored.riskScore,
      aiConfidence: scored.aiConfidence,
      ruleEngineResult: scored,
      verificationDurationMs: Date.now() - startedAt,
      geminiTokenCount,
    });
}

async function finalizeAttempt(
  supabaseAdmin: any,
  params: {
    order: { id: string; plan_code: string; amount_tnd: number; currency: string };
    userId: string;
    userEmail: string | null;
    attemptNumber: number;
    storagePath: string;
    storagePath2: string;
    userEnteredReference: string;
    imageHashSha256: string;
    imageDhash: bigint;
    ocrTextHashSha256: string | null;
    extraction: ReturnType<typeof parseExtraction> | null;
    decision: "auto_approved" | "manual_review" | "auto_rejected_duplicate" | "auto_rejected_fraud";
    decisionReason: string;
    riskScore: number;
    aiConfidence: number;
    ruleEngineResult: unknown;
    verificationDurationMs: number;
    geminiTokenCount: number | null;
  },
) {
  const e = params.extraction;
  const { data: attempt, error: insertError } = await supabaseAdmin
    .from("d17_verification_attempts")
    .insert({
      order_id: params.order.id,
      user_id: params.userId,
      attempt_number: params.attemptNumber,
      storage_path: params.storagePath,
      storage_path_2: params.storagePath2,
      user_entered_reference: params.userEnteredReference,
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
      risk_score: params.riskScore,
      ai_confidence: params.aiConfidence,
      rule_engine_result: params.ruleEngineResult,
      decision: params.decision,
      decision_reason: params.decisionReason,
      ai_version: AI_VERSION,
      verification_duration_ms: params.verificationDurationMs,
      gemini_token_count: params.geminiTokenCount,
    })
    .select("*")
    .single();
  if (insertError || !attempt) throw new Error(`Failed to record verification attempt: ${insertError?.message}`);

  if (params.decision === "auto_approved") {
    const subscriptionId = await provisionOrder(supabaseAdmin, params.userId, params.order.plan_code, "d17_verification");
    await supabaseAdmin
      .from("d17_orders")
      .update({ status: "auto_approved", resolved_at: new Date().toISOString(), subscription_id: subscriptionId, updated_at: new Date().toISOString() })
      .eq("id", params.order.id);
    await supabaseAdmin.from("payments").insert({
      user_id: params.userId,
      subscription_id: subscriptionId,
      amount: params.order.amount_tnd,
      currency: params.order.currency,
      status: "succeeded",
      provider: "d17_manual",
      provider_payment_id: attempt.id,
      description: `D17 payment verified automatically (order ${params.order.id})`,
    });
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
    await supabaseAdmin
      .from("d17_orders")
      .update({ status: "manual_review", manual_review_deadline: new Date(Date.now() + MANUAL_REVIEW_WINDOW_HOURS * 3600_000).toISOString(), updated_at: new Date().toISOString() })
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
  }

  return attempt;
}
