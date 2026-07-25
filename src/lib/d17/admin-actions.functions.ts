import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_ACTIONABLE_STATUSES } from "./status";
// sendEmail (a *.server.* module) is dynamically imported at each call site
// rather than statically here — this file is imported by client route
// components for its createServerFn RPC stubs, and TanStack Start's
// import-protection plugin forbids any *.server.* module from being
// reachable in the client bundle graph, even transitively.

type PlanCode = "schriftlich" | "muendlich" | "komplett";

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
  // Best-effort referral conversion — isolated so it can never affect a real
  // admin approval/grant; no-ops instantly if this user wasn't referred.
  // try/await, not .rpc(...).catch(...) — see the identical fix + explanation
  // in src/lib/d17/verify.functions.ts (confirmed live 2026-07-22: this
  // threw unconditionally on every call, right after activation committed).
  try {
    await supabaseAdmin.rpc("process_referral_conversion", { p_referred_user_id: params.userId });
  } catch (e: unknown) {
    console.error("[admin-actions/activateOrder] referral conversion failed (non-fatal):", e);
  }
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
    if (!(ADMIN_ACTIONABLE_STATUSES as readonly string[]).includes(order.status)) throw new Error(`Cannot approve an order with status "${order.status}".`);

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

/**
 * A standalone note, independent of any status-changing action (approve /
 * reject / adjust-grant / replay / clear-suspension all already log their
 * own note as a side effect of that action). Lets an admin annotate an
 * order at any point in its lifecycle — e.g. "called the student, they
 * confirmed the payment was sent from a friend's account" — without
 * forcing an approve/reject decision. Reuses d17_admin_actions (action:
 * "note") rather than a new table/column: it already IS the order's
 * append-only admin timeline, and the existing admin UI already renders
 * every row's note field, so a plain note shows up there for free.
 */
export const adminAddNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string; note: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (!data.note?.trim()) throw new Error("Note cannot be empty.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: orderError } = await supabaseAdmin.from("d17_orders").select("id").eq("id", data.order_id).maybeSingle();
    if (orderError || !order) throw new Error("Order not found.");

    await supabaseAdmin.from("d17_admin_actions").insert({ order_id: data.order_id, admin_id: context.userId, action: "note", note: data.note.trim() });
    return { status: "noted" };
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
    if (!(ADMIN_ACTIONABLE_STATUSES as readonly string[]).includes(order.status)) throw new Error(`Cannot reject an order with status "${order.status}".`);

    // Reversing an already-approved order (fraud caught after the fact)
    // must also revoke the subscription activate_d17_order already
    // granted — RLS content gating (has_plan_access) reads subscriptions.
    // status live, so this takes effect on the student's very next request,
    // no separate "kick them out" step needed.
    const wasAlreadyApproved = order.status === "auto_approved" || order.status === "admin_approved";
    if (wasAlreadyApproved && order.subscription_id) {
      await supabaseAdmin.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", order.subscription_id);
    }

    await supabaseAdmin
      .from("d17_orders")
      .update({ status: "rejected", resolved_at: new Date().toISOString(), resolved_by: context.userId, updated_at: new Date().toISOString() })
      .eq("id", order.id);
    await supabaseAdmin.from("d17_admin_actions").insert({
      order_id: order.id, admin_id: context.userId, action: "reject",
      note: wasAlreadyApproved ? `${data.note.trim()} [subscription revoked — order was previously ${order.status}]` : data.note.trim(),
    });

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

/**
 * Re-runs OCR + Gemini + the rule engine on an order's LATEST attempt's
 * already-uploaded screenshots — the student is never asked to upload
 * again. Used for: (1) manually re-analyzing a stuck/ambiguous order, and
 * (2) "safe resume" after a mid-pipeline server crash — since the
 * screenshots are already durably stored before the pipeline ever runs,
 * a crash just leaves the order in its last persisted state; replaying
 * with the same already-uploaded files reprocesses it safely without any
 * queue/job infrastructure, exactly reproducing the same result an
 * uninterrupted run would have produced (duplicate/hard-gate checks are
 * all idempotent).
 *
 * Deliberately skips the duplicate-detection hard gate (the screenshots
 * are already-recorded, known-associated with this exact order — checking
 * them against themselves would trivially self-flag) and does NOT
 * increment attempts_used (a replay is free, not a new student attempt).
 * Inserts a NEW attempt row (is_admin_replay = true) rather than
 * overwriting the original — full history is preserved (item 11/37).
 */
export const adminReplayVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertNotRateLimited } = await import("@/lib/rate-limit.server");
    await assertNotRateLimited(supabaseAdmin, { key: `adminReplayVerification:${context.userId}`, windowSeconds: 60, maxRequests: 10 });
    const { stripExifAndReencode, sha256Hash, sha256HashText, computeDHash } = await import("./image-hash.server");
    const { buildVerificationPrompt, parseExtraction } = await import("./verification-prompt");
    const { scoreAttempt } = await import("./rule-engine");
    const { computeReputationVelocity } = await import("./reputation-velocity.server");
    const { callVisionVerification, finalizeAttempt } = await import("./verify.functions");
    const { getD17Config } = await import("./config");
    const config = await getD17Config(supabaseAdmin);

    const { data: order, error: orderError } = await supabaseAdmin.from("d17_orders").select("*").eq("id", data.order_id).maybeSingle();
    if (orderError || !order) throw new Error("Order not found.");

    const { data: latest, error: attemptError } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("*")
      .eq("order_id", order.id)
      .order("attempt_number", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (attemptError || !latest) throw new Error("No prior verification attempt exists on this order to replay.");
    if (!latest.storage_path_2) {
      throw new Error("This attempt predates the two-screenshot flow and has no second screenshot to replay.");
    }
    const storagePath2 = latest.storage_path_2;

    async function downloadClean(path: string) {
      const { data: fileBlob, error } = await supabaseAdmin.storage.from("payment-screenshots").download(path);
      if (error || !fileBlob) throw new Error(`Could not re-download screenshot: ${error?.message ?? "not found"}`);
      return stripExifAndReencode(Buffer.from(await (fileBlob as Blob).arrayBuffer()));
    }

    const clean1 = await downloadClean(latest.storage_path);
    const clean2 = await downloadClean(storagePath2);
    const imageHashSha256 = sha256Hash(clean1);
    const imageDhash = await computeDHash(clean1);
    const imageHashSha256_2 = sha256Hash(clean2);
    const imageDhash_2 = await computeDHash(clean2);

    const startedAt = Date.now();
    const prompt = buildVerificationPrompt({ amountTnd: Number(order.amount_tnd), currency: order.currency, planCode: order.plan_code });
    const { raw, tokenCount } = await callVisionVerification(prompt, clean1.toString("base64"), clean2.toString("base64"));
    const extraction = parseExtraction(raw);
    if (tokenCount) await supabaseAdmin.rpc("record_api_usage", { p_tokens: tokenCount });

    const ocrTextHashSha256 = extraction.raw_text.trim() ? sha256HashText(extraction.raw_text) : null;
    const ocrTextHashSha256_2 = extraction.screenshot2.raw_text.trim() ? sha256HashText(extraction.screenshot2.raw_text) : null;

    const reputationVelocity = await computeReputationVelocity(supabaseAdmin, {
      userId: order.user_id,
      orderId: order.id,
      attemptsInLastHour: 0,
      deviceFingerprint: latest.device_fingerprint ?? null,
      ipAddress: latest.ip_address ?? null,
    });

    const { OFFICIAL_D17_RECIPIENT } = await import("./payment-config");
    const scored = scoreAttempt({
      orderAmountTnd: Number(order.amount_tnd),
      orderCurrency: order.currency,
      orderCreatedAt: order.created_at,
      userEnteredReference: latest.user_entered_reference,
      extraction,
      orderDestinationNumber: order.destination_number,
      orderDestinationIban: order.destination_iban,
      officialRecipientNumber: OFFICIAL_D17_RECIPIENT,
      uploadToCreationDeltaMs: latest.upload_to_creation_delta_ms ?? 0,
      reputationVelocity,
      autoApproveThreshold: config.d17_auto_approve_threshold,
    });

    const userEmail = await getUserEmail(supabaseAdmin, order.user_id);
    const reputationCheck = scored.checks.find((c) => c.id === "reputation_signal");
    const velocityCheck = scored.checks.find((c) => c.id === "velocity_signal");

    const attempt = await finalizeAttempt(supabaseAdmin, {
      order,
      userId: order.user_id,
      userEmail,
      attemptNumber: latest.attempt_number,
      storagePath: latest.storage_path,
      storagePath2,
      userEnteredReference: latest.user_entered_reference,
      imageHashSha256,
      imageDhash,
      imageHashSha256_2,
      imageDhash_2,
      ocrTextHashSha256,
      ocrTextHashSha256_2,
      extraction,
      decision: scored.decision,
      decisionReason: `[Admin replay] ${scored.decisionReason}`,
      riskScore: scored.riskScore,
      aiConfidence: scored.aiConfidence,
      ruleEngineResult: scored,
      verificationDurationMs: Date.now() - startedAt,
      geminiTokenCount: tokenCount,
      uploadToCreationDeltaMs: latest.upload_to_creation_delta_ms ?? 0,
      reputationSignalDelta: reputationCheck?.points ?? null,
      velocitySignalPoints: velocityCheck?.points ?? null,
      ipAddress: latest.ip_address,
      deviceFingerprint: latest.device_fingerprint,
      browserFingerprint: latest.browser_fingerprint,
      isAdminReplay: true,
      maxAttemptsPerOrder: config.d17_max_attempts_per_order,
      manualReviewWindowHours: config.d17_manual_review_window_hours,
    });

    await supabaseAdmin.from("d17_admin_actions").insert({
      order_id: order.id,
      admin_id: context.userId,
      action: "replay",
      note: `Replay result: ${scored.decision} (${scored.aiConfidence}% confidence)`,
    });

    return { decision: scored.decision, attemptId: attempt.id };
  });
