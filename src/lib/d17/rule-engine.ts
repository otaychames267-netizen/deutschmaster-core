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
}

const HARD_FRAUD_FLAGS = new Set(["overlay_text_detected", "clone_region_suspected", "fake_screenshot_composite"]);
const HARD_FRAUD_SCORE_THRESHOLD = 70;
const AUTO_APPROVE_CONFIDENCE_THRESHOLD = 90; // risk_score <= 10

const AMOUNT_TOLERANCE_TND = 0.5;

function normalizeReference(ref: string): string {
  return ref.trim().replace(/[\s-]/g, "").toLowerCase();
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

  // Fraud hard gate — requires BOTH a categorical "hard" flag AND a high
  // self-reported fraud score, so a single hallucinated flag from a
  // probabilistic vision model can never alone trigger rejection.
  const hasHardFlag = extraction.fraud_flags.some((f) => HARD_FRAUD_FLAGS.has(f));
  const hardGate = hasHardFlag && extraction.fraud_score >= HARD_FRAUD_SCORE_THRESHOLD ? "fraud" : null;

  const riskScore = hardGate ? 100 : Math.min(100, checks.reduce((sum, c) => sum + c.points, 0));
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
