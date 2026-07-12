/**
 * rule-engine.ts — the deterministic decision-maker for the D17 verification
 * pipeline. Gemini's OCR/fraud output (see verification-prompt.ts) is an
 * ADVISORY INPUT here, never the decision itself: every field is run through
 * a fixed, auditable weighted checklist that produces the actual risk score.
 *
 * Duplicate detection is intentionally NOT handled here — it's a separate,
 * DB-dependent hard gate (src/lib/d17/duplicate-check.server.ts) evaluated
 * BEFORE Gemini is even called, so scoreAttempt() only needs to implement
 * the fraud hard gate plus the weighted checks.
 *
 * Pure function, zero I/O — fully unit-testable with hand-built fixtures.
 */
import type { D17VerificationExtraction } from "./verification-prompt";

export type CheckResultKind = "pass" | "uncertain" | "fail";

export interface RuleCheck {
  id: string;
  label: string;
  result: CheckResultKind;
  points: number;
  detail: string;
}

export type AttemptDecision = "auto_approved" | "manual_review" | "auto_rejected_fraud";

export interface ScoreAttemptResult {
  checks: RuleCheck[];
  hardGate: "fraud" | null;
  riskScore: number;
  aiConfidence: number;
  decision: AttemptDecision;
  decisionReason: string;
}

export interface ReputationVelocityInput {
  priorApprovedCount: number;
  priorConfirmedDuplicateCount: number;
  attemptsInLastHour: number;
}

export interface ScoreAttemptInput {
  orderAmountTnd: number;
  orderCurrency: string;
  orderCreatedAt: string; // ISO
  userEnteredReference: string;
  extraction: D17VerificationExtraction;
  /** Prices of OTHER plan tiers, for the "package price sanity" check —
   * flags when the OCR amount matches a different tier's price than the
   * one actually ordered (a likely wrong-tier payment, not fraud). */
  otherPlanPricesTnd?: number[];
  /** The order's own snapshotted official D17 number/IBAN (see
   * src/lib/d17/orders.functions.ts) — null if the platform hasn't
   * configured D17_OFFICIAL_NUMBER/D17_OFFICIAL_IBAN yet. */
  orderDestinationNumber: string | null;
  orderDestinationIban: string | null;
  /** Wall-clock ms between order creation and this verification attempt
   * starting (NOT the OCR'd payment_datetime) — captured by
   * verify.functions.ts at pipeline start, before the Gemini call. */
  uploadToCreationDeltaMs: number;
  reputationVelocity: ReputationVelocityInput;
}

const HARD_FRAUD_FLAGS = new Set(["overlay_text_detected", "clone_region_suspected", "fake_screenshot_composite"]);
const HARD_FRAUD_SCORE_THRESHOLD = 70;
const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 90; // risk_score <= 10

const AMOUNT_TOLERANCE_TND = 0.5;

function normalizeReference(ref: string): string {
  return ref.trim().replace(/[\s-]/g, "").toLowerCase();
}

function destinationsOverlap(a: string, b: string): boolean {
  const na = a.trim().replace(/[\s-]/g, "").toLowerCase();
  const nb = b.trim().replace(/[\s-]/g, "").toLowerCase();
  return na.includes(nb) || nb.includes(na);
}

export function scoreAttempt(input: ScoreAttemptInput): ScoreAttemptResult {
  const { extraction } = input;
  const checks: RuleCheck[] = [];

  // 1. Transaction reference match — "the most important verification
  // element" per spec. A reference OCR simply couldn't find in the image
  // costs far less than a mismatch, and can NEVER by itself reach the
  // fraud hard gate — it always falls through to manual_review.
  if (extraction.reference === null) {
    checks.push({
      id: "reference_match",
      label: "Transaction Reference",
      result: "uncertain",
      points: 25,
      detail: `No transaction reference found in the screenshot (user entered: ${input.userEnteredReference}).`,
    });
  } else if (normalizeReference(extraction.reference).includes(normalizeReference(input.userEnteredReference))) {
    checks.push({
      id: "reference_match",
      label: "Transaction Reference",
      result: "pass",
      points: 0,
      detail: `OCR reference "${extraction.reference}" matches entered reference "${input.userEnteredReference}".`,
    });
  } else {
    checks.push({
      id: "reference_match",
      label: "Transaction Reference",
      result: "fail",
      points: 40,
      detail: `OCR reference "${extraction.reference}" does not match entered reference "${input.userEnteredReference}".`,
    });
  }

  // 2. Amount match
  if (extraction.amount === null) {
    checks.push({ id: "amount_match", label: "Amount", result: "uncertain", points: 15, detail: "Amount not legible on screenshot." });
  } else if (Math.abs(extraction.amount - input.orderAmountTnd) <= AMOUNT_TOLERANCE_TND) {
    checks.push({ id: "amount_match", label: "Amount", result: "pass", points: 0, detail: `OCR amount ${extraction.amount} matches order amount ${input.orderAmountTnd}.` });
  } else {
    checks.push({ id: "amount_match", label: "Amount", result: "fail", points: 30, detail: `Amount mismatch: expected ${input.orderAmountTnd} ${input.orderCurrency}, OCR read ${extraction.amount}.` });
  }

  // 3. Currency match
  if (!extraction.currency) {
    checks.push({ id: "currency_match", label: "Currency", result: "uncertain", points: 10, detail: "Currency not legible on screenshot." });
  } else if (extraction.currency.trim().toUpperCase() === input.orderCurrency.toUpperCase()) {
    checks.push({ id: "currency_match", label: "Currency", result: "pass", points: 0, detail: `Currency matches (${input.orderCurrency}).` });
  } else {
    checks.push({ id: "currency_match", label: "Currency", result: "fail", points: 20, detail: `Currency mismatch: expected ${input.orderCurrency}, OCR read ${extraction.currency}.` });
  }

  // 4. Payment date/time vs order-creation-time delta
  if (!extraction.payment_datetime) {
    checks.push({ id: "time_delta", label: "Payment Time", result: "fail", points: 25, detail: "Payment date/time not legible on screenshot." });
  } else {
    const paymentMs = Date.parse(extraction.payment_datetime);
    const orderMs = Date.parse(input.orderCreatedAt);
    if (Number.isNaN(paymentMs)) {
      checks.push({ id: "time_delta", label: "Payment Time", result: "fail", points: 25, detail: `Unparseable payment date/time: "${extraction.payment_datetime}".` });
    } else {
      const deltaMinutes = (paymentMs - orderMs) / 60000;
      if (deltaMinutes < -5) {
        checks.push({ id: "time_delta", label: "Payment Time", result: "fail", points: 25, detail: `Payment time is before the order was created (${Math.round(deltaMinutes)} min) — possibly a reused/old screenshot.` });
      } else if (deltaMinutes <= 30) {
        checks.push({ id: "time_delta", label: "Payment Time", result: "pass", points: 0, detail: `Payment occurred ${Math.round(deltaMinutes)} min after order creation.` });
      } else if (deltaMinutes <= 120) {
        checks.push({ id: "time_delta", label: "Payment Time", result: "uncertain", points: 15, detail: `Payment occurred ${Math.round(deltaMinutes)} min after order creation.` });
      } else {
        checks.push({ id: "time_delta", label: "Payment Time", result: "fail", points: 25, detail: `Payment occurred ${Math.round(deltaMinutes)} min after order creation (>2h).` });
      }
    }
  }

  // 5. Notification source plausibility
  if (extraction.notification_source === "d17_app" || extraction.notification_source === "bank_sms" || extraction.notification_source === "bank_app") {
    checks.push({ id: "notification_source", label: "Notification Source", result: "pass", points: 0, detail: `Recognized as ${extraction.notification_source}.` });
  } else if (extraction.notification_source === "screenshot_other") {
    checks.push({ id: "notification_source", label: "Notification Source", result: "uncertain", points: 8, detail: "Ambiguous notification UI." });
  } else {
    checks.push({ id: "notification_source", label: "Notification Source", result: "fail", points: 15, detail: "Screenshot does not resemble a known payment-notification UI." });
  }

  // 6. OCR confidence
  if (extraction.ocr_confidence >= 85) {
    checks.push({ id: "ocr_confidence", label: "OCR Confidence", result: "pass", points: 0, detail: `OCR confidence ${extraction.ocr_confidence}.` });
  } else if (extraction.ocr_confidence >= 60) {
    checks.push({ id: "ocr_confidence", label: "OCR Confidence", result: "uncertain", points: 10, detail: `OCR confidence ${extraction.ocr_confidence}.` });
  } else {
    checks.push({ id: "ocr_confidence", label: "OCR Confidence", result: "fail", points: 20, detail: `Low OCR confidence ${extraction.ocr_confidence}.` });
  }

  // 7. Screenshot integrity (capped-influence use of Gemini's own fraud
  // score — contributes penalty points but, unlike the hard gate below,
  // can never by itself force a rejection).
  if (extraction.screenshot_integrity_ok && extraction.fraud_score < 20) {
    checks.push({ id: "screenshot_integrity", label: "Screenshot Integrity", result: "pass", points: 0, detail: `Fraud score ${extraction.fraud_score}, integrity OK.` });
  } else if (extraction.fraud_score <= 50) {
    checks.push({ id: "screenshot_integrity", label: "Screenshot Integrity", result: "uncertain", points: 12, detail: `Fraud score ${extraction.fraud_score}.` });
  } else {
    checks.push({ id: "screenshot_integrity", label: "Screenshot Integrity", result: "fail", points: 25, detail: `Fraud score ${extraction.fraud_score}, integrity_ok=${extraction.screenshot_integrity_ok}.` });
  }

  // 8. Package price sanity — amount matches a DIFFERENT tier's price.
  if (extraction.amount !== null && input.otherPlanPricesTnd?.some((p) => Math.abs(p - extraction.amount!) <= AMOUNT_TOLERANCE_TND)) {
    checks.push({ id: "package_price_sanity", label: "Package Price", result: "fail", points: 10, detail: `OCR amount ${extraction.amount} matches a different plan's price, not the ordered plan's.` });
  } else {
    checks.push({ id: "package_price_sanity", label: "Package Price", result: "pass", points: 0, detail: "Amount does not collide with a different plan's price." });
  }

  // 9. Destination match — extracted D17 number/IBAN (from either
  // screenshot) must match the order's own snapshotted official values.
  {
    const candidates = [extraction.destination_number, extraction.destination_iban, extraction.screenshot2.destination].filter(
      (v): v is string => Boolean(v),
    );
    const officialValues = [input.orderDestinationNumber, input.orderDestinationIban].filter((v): v is string => Boolean(v));
    if (officialValues.length === 0) {
      checks.push({
        id: "destination_match",
        label: "Destination",
        result: "uncertain",
        points: 8,
        detail: "No official D17 destination is configured for this order — destination could not be verified.",
      });
    } else if (candidates.length === 0) {
      checks.push({
        id: "destination_match",
        label: "Destination",
        result: "uncertain",
        points: 8,
        detail: "No destination number/IBAN was legible on either screenshot.",
      });
    } else {
      const matched = candidates.some((c) => officialValues.some((o) => destinationsOverlap(c, o)));
      if (matched) {
        checks.push({ id: "destination_match", label: "Destination", result: "pass", points: 0, detail: "Extracted destination matches the order's official D17 number/IBAN." });
      } else {
        checks.push({
          id: "destination_match",
          label: "Destination",
          result: "fail",
          points: 35,
          detail: `Extracted destination (${candidates.join(", ")}) does not match the order's official destination.`,
        });
      }
    }
  }

  // 10. Cross-screenshot consistency — the rule engine's OWN direct field
  // comparison between the two screenshots, independent of the model's own
  // self-reported cross_check.consistent (never trusted alone). A mismatch
  // reduces confidence but is capped well under the reject threshold, per
  // spec: inconsistency between screenshots should never alone reject.
  {
    const s2 = extraction.screenshot2;
    const mismatches: string[] = [];
    if (extraction.amount !== null && s2.amount !== null && Math.abs(extraction.amount - s2.amount) > AMOUNT_TOLERANCE_TND) {
      mismatches.push(`amount (${extraction.amount} vs ${s2.amount})`);
    }
    if (extraction.currency && s2.currency && extraction.currency.trim().toUpperCase() !== s2.currency.trim().toUpperCase()) {
      mismatches.push(`currency (${extraction.currency} vs ${s2.currency})`);
    }
    if (extraction.payment_datetime && s2.payment_datetime) {
      const t1 = Date.parse(extraction.payment_datetime);
      const t2 = Date.parse(s2.payment_datetime);
      if (!Number.isNaN(t1) && !Number.isNaN(t2) && Math.abs(t1 - t2) > 5 * 60_000) {
        mismatches.push("payment date/time");
      }
    }
    const shot1Destination = extraction.destination_number ?? extraction.destination_iban;
    if (shot1Destination && s2.destination && !destinationsOverlap(shot1Destination, s2.destination)) {
      mismatches.push("destination");
    }
    if (mismatches.length > 0) {
      checks.push({
        id: "cross_screenshot_consistency",
        label: "Cross-Screenshot Consistency",
        result: "fail",
        points: 20,
        detail: `Screenshots disagree on: ${mismatches.join(", ")}.`,
      });
    } else {
      checks.push({ id: "cross_screenshot_consistency", label: "Cross-Screenshot Consistency", result: "pass", points: 0, detail: "No contradictions found between the two screenshots." });
    }
  }

  // 11. Timeline plausibility — distinct from check #4 (Payment Time): this
  // looks at the actual wall-clock upload speed (a screenshot uploaded
  // implausibly fast after order creation is a strong signal of a reused/
  // pre-existing screenshot) in addition to a hard "payment predates order"
  // restatement, each contributing independently.
  {
    const reasons: string[] = [];
    if (input.uploadToCreationDeltaMs < 8000) {
      reasons.push(`screenshot uploaded only ${(input.uploadToCreationDeltaMs / 1000).toFixed(1)}s after the order was created`);
    }
    if (extraction.payment_datetime) {
      const paymentMs = Date.parse(extraction.payment_datetime);
      const orderMs = Date.parse(input.orderCreatedAt);
      if (!Number.isNaN(paymentMs) && paymentMs < orderMs - 5 * 60_000) {
        reasons.push("the payment timestamp on the screenshot predates the order");
      }
    }
    if (reasons.length > 0) {
      checks.push({ id: "impossible_timeline", label: "Timeline Plausibility", result: "fail", points: 30, detail: `Implausible timeline: ${reasons.join("; ")}.` });
    } else {
      checks.push({ id: "impossible_timeline", label: "Timeline Plausibility", result: "pass", points: 0, detail: "Upload and payment timing are plausible." });
    }
  }

  // 12. Account reputation — capped bonus/penalty, never influences the
  // hard gate. Prior clean approvals reduce risk; prior CONFIRMED duplicate
  // history (src/lib/d17/duplicate-check.server.ts's hard-gate hits,
  // tracked in d17_fraud_suspensions) raises it.
  {
    const rv = input.reputationVelocity;
    const bonus = Math.min(10, rv.priorApprovedCount * 5);
    const penalty = Math.min(10, rv.priorConfirmedDuplicateCount * 10);
    const netPoints = Math.max(-10, Math.min(10, penalty - bonus));
    checks.push({
      id: "reputation_signal",
      label: "Account Reputation",
      result: netPoints > 0 ? "fail" : "pass",
      points: netPoints,
      detail: `${rv.priorApprovedCount} prior approved payment(s), ${rv.priorConfirmedDuplicateCount} prior confirmed duplicate(s).`,
    });
  }

  // 13. Submission velocity — too many attempts from this account in a
  // short window. The hourly HARD cap lives in verify.functions.ts (throws
  // before reaching the rule engine); this is a softer, weighted signal for
  // volumes below that cap. Device-fingerprint-sharing is layered in once
  // Phase 8 wires up client fingerprint capture — attemptsInLastHour alone
  // is the only signal available today.
  {
    const rv = input.reputationVelocity;
    const points = Math.min(15, Math.max(0, rv.attemptsInLastHour - 1) * 5);
    checks.push({
      id: "velocity_signal",
      label: "Submission Velocity",
      result: points >= 15 ? "fail" : points > 0 ? "uncertain" : "pass",
      points,
      detail: `${rv.attemptsInLastHour} verification attempt(s) from this account in the last hour.`,
    });
  }

  // Fraud hard gate — requires BOTH a categorical "hard" flag AND a high
  // self-reported fraud score, so a single hallucinated flag from a
  // probabilistic vision model can never alone trigger rejection.
  const hasHardFlag = extraction.fraud_flags.some((f) => HARD_FRAUD_FLAGS.has(f));
  const hardGate = hasHardFlag && extraction.fraud_score >= HARD_FRAUD_SCORE_THRESHOLD ? "fraud" : null;

  // Clamped to [0, 100]: the reputation_signal check can contribute
  // negative points (a bonus for a clean history), so the raw sum is no
  // longer guaranteed non-negative the way it was when every check's
  // points were >= 0.
  const riskScore = hardGate ? 100 : Math.max(0, Math.min(100, checks.reduce((sum, c) => sum + c.points, 0)));
  const aiConfidence = hardGate ? 0 : 100 - riskScore;

  let decision: AttemptDecision;
  let decisionReason: string;
  if (hardGate === "fraud") {
    decision = "auto_rejected_fraud";
    decisionReason = `Fraud signals detected: ${extraction.fraud_flags.join(", ")} (fraud score ${extraction.fraud_score}).`;
  } else if (aiConfidence >= AUTO_APPROVE_CONFIDENCE_THRESHOLD) {
    decision = "auto_approved";
    decisionReason = "All verification checks passed.";
  } else {
    decision = "manual_review";
    const worst = [...checks].sort((a, b) => b.points - a.points)[0];
    decisionReason = worst && worst.points > 0 ? worst.detail : "Confidence below the auto-approval threshold.";
  }

  return { checks, hardGate, riskScore, aiConfidence, decision, decisionReason };
}
