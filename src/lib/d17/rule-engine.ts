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

export type HardGateReason =
  | "fraud"
  | "wrong_recipient"
  | "screenshot_type"
  | "amount_mismatch"
  | "currency_mismatch"
  | "authorization_number_mismatch";

export interface ScoreAttemptResult {
  checks: RuleCheck[];
  hardGate: HardGateReason | null;
  riskScore: number;
  aiConfidence: number;
  decision: AttemptDecision;
  decisionReason: string;
}

export interface ReputationVelocityInput {
  priorApprovedCount: number;
  priorConfirmedDuplicateCount: number;
  attemptsInLastHour: number;
  sharedDeviceAccountCount: number;
  sharedIpAccountCount: number;
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
  /** The ONE canonical official D17 recipient number
   * (OFFICIAL_D17_RECIPIENT, src/lib/d17/payment-config.ts) — the single
   * authoritative value the recipient hard-gate enforces, independent of the
   * mutable per-order snapshot. A legibly-extracted recipient that is NOT
   * this number means the money went elsewhere → hard reject. */
  officialRecipientNumber: string;
  /** Wall-clock ms between order creation and this verification attempt
   * starting (NOT the OCR'd payment_datetime) — captured by
   * verify.functions.ts at pipeline start, before the Gemini call. */
  uploadToCreationDeltaMs: number;
  reputationVelocity: ReputationVelocityInput;
  /** Deterministic image-forensics signal (src/lib/d17/image-forensics.server.ts),
   * computed on the ORIGINAL upload bytes. Optional (omitted by paths that
   * re-score from stored data). Advisory only: a strong signal forces manual
   * review, it never auto-rejects — deterministic forensics have real false
   * positives (e.g. a user who merely cropped their receipt). */
  imageForensics?: { score: number; flags: string[] };
  /** Admin-configurable via platform_settings (src/lib/d17/config.ts) —
   * defaults to 90 (matching the original hardcoded value) if the caller
   * doesn't supply one, so this stays a pure function with zero I/O of its
   * own; the actual config read happens in verify.functions.ts. */
  autoApproveThreshold?: number;
}

const HARD_FRAUD_FLAGS = new Set(["overlay_text_detected", "clone_region_suspected", "fake_screenshot_composite"]);
const HARD_FRAUD_SCORE_THRESHOLD = 70;
const DEFAULT_AUTO_APPROVE_CONFIDENCE_THRESHOLD = 90; // risk_score <= 10

// Only the EXACT subscription amount is accepted. TND has 3 decimal places
// (millimes); a 0.01 window absorbs OCR/format noise (30 vs 30.0 vs 30.000)
// while rejecting any real under/over-payment (e.g. 29.5 or 33.0), which then
// falls to manual_review rather than auto-approving a wrong amount.
const AMOUNT_TOLERANCE_TND = 0.01;

// A wider band, just outside the auto-pass tolerance, where a mismatch is
// still plausibly OCR digit-noise rather than a genuinely different amount
// (e.g. 29.970-29.995 against a 30.000 target) — these stay routed to
// Manual Review via the weighted score, same as today. Anything further off
// than this (25 TND, 10 TND, 1 TND against a 30 TND order) is unambiguous
// regardless of how confidently it was read — a real digit misread doesn't
// turn "30" into "10" — so it hard-rejects instantly instead of merely
// scoring a "fail" that a clean-history bonus could otherwise dilute.
const AMOUNT_GRAY_ZONE_TND = 0.05;

// Exported (not just used internally) so duplicate-check.server.ts and
// verify.functions.ts's identifier-reservation call use the EXACT same
// normalization as the OCR-vs-user-entered comparison below — a mismatch
// between these was a real gap: a reformatted duplicate (spaces/dashes/
// leading zeros) could previously evade cross-account dedup even though
// the same-attempt comparison here would have treated the two as equal.
export function normalizeReference(ref: string): string {
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

  // D17 receipts show a single identifier: the "Numéro d'autorisation"
  // (authorization number). There is NO separate "reference"/"Réf" field, so
  // the value the student types into the reference box IS the authorization
  // number — match it against the OCR'd authorization number (from either
  // screenshot), falling back to any reference/transaction_id only if some
  // future D17 variant prints one.
  const ocrIdentifier =
    extraction.authorization_number ??
    extraction.screenshot2.authorization_number ??
    extraction.reference ??
    extraction.transaction_id;

  // The Journal D17 screen carries the real transaction timestamp; the
  // "Payment Success" screen has none. Use the Success-screen time if present
  // (older/other flows), otherwise the Journal time.
  const effectivePaymentDatetime = extraction.payment_datetime ?? extraction.screenshot2.payment_datetime;

  // The Journal shows the amount as a negative debit ("-30,000 TND"); always
  // compare on absolute value so a correct amount never reads as a mismatch.
  const ocrAmount = extraction.amount === null ? null : Math.abs(extraction.amount);
  const shot2Amount = extraction.screenshot2.amount === null ? null : Math.abs(extraction.screenshot2.amount);

  // 0. Screenshot classification — computed early for display purposes; the
  // actual hard-gate enforcement happens below (screenshotTypeOk), after
  // ocrAmount/ocrIdentifier are in scope. Shown first in the checks list to
  // match the real pipeline order: "what am I even looking at" before "does
  // its content match."
  if (extraction.screenshot_type === "payment_success" && extraction.screenshot2.screenshot_type === "journal") {
    checks.push({ id: "screenshot_classification", label: "Screenshot Classification", result: "pass", points: 0, detail: "Screenshot 1 classified as Payment Success, Screenshot 2 as Journal D17, as expected." });
  } else {
    checks.push({
      id: "screenshot_classification",
      label: "Screenshot Classification",
      result: "fail",
      points: 0, // the hard gate below rejects outright; no weighted score needed
      detail: `Expected Payment Success + Journal D17, detected "${extraction.screenshot_type}" + "${extraction.screenshot2.screenshot_type}".`,
    });
  }

  // 1. Authorization-number match — D17's single most important identifier.
  // A number OCR simply couldn't read costs far less than a real mismatch,
  // and can NEVER by itself reach a hard gate — it falls through to
  // manual_review.
  if (ocrIdentifier === null) {
    checks.push({
      id: "reference_match",
      label: "Authorization Number",
      result: "uncertain",
      points: 25,
      detail: `No authorization number could be read from the screenshots (student entered: ${input.userEnteredReference}).`,
    });
  } else if (
    normalizeReference(ocrIdentifier) === normalizeReference(input.userEnteredReference) ||
    normalizeReference(ocrIdentifier).includes(normalizeReference(input.userEnteredReference)) ||
    normalizeReference(input.userEnteredReference).includes(normalizeReference(ocrIdentifier))
  ) {
    checks.push({
      id: "reference_match",
      label: "Authorization Number",
      result: "pass",
      points: 0,
      detail: `Authorization number "${ocrIdentifier}" matches the number the student entered ("${input.userEnteredReference}").`,
    });
  } else {
    checks.push({
      id: "reference_match",
      label: "Authorization Number",
      result: "fail",
      points: 40,
      detail: `Authorization number on the screenshot ("${ocrIdentifier}") does not match what the student entered ("${input.userEnteredReference}").`,
    });
  }

  // 2. Amount match (absolute value — see ocrAmount above)
  if (ocrAmount === null) {
    checks.push({ id: "amount_match", label: "Amount", result: "uncertain", points: 15, detail: "Amount not legible on screenshot." });
  } else if (Math.abs(ocrAmount - input.orderAmountTnd) <= AMOUNT_TOLERANCE_TND) {
    checks.push({ id: "amount_match", label: "Amount", result: "pass", points: 0, detail: `OCR amount ${ocrAmount} matches order amount ${input.orderAmountTnd}.` });
  } else {
    checks.push({ id: "amount_match", label: "Amount", result: "fail", points: 30, detail: `Amount mismatch: expected ${input.orderAmountTnd} ${input.orderCurrency}, OCR read ${ocrAmount}.` });
  }

  // 3. Currency match
  if (!extraction.currency) {
    checks.push({ id: "currency_match", label: "Currency", result: "uncertain", points: 10, detail: "Currency not legible on screenshot." });
  } else if (extraction.currency.trim().toUpperCase() === input.orderCurrency.toUpperCase()) {
    checks.push({ id: "currency_match", label: "Currency", result: "pass", points: 0, detail: `Currency matches (${input.orderCurrency}).` });
  } else {
    checks.push({ id: "currency_match", label: "Currency", result: "fail", points: 20, detail: `Currency mismatch: expected ${input.orderCurrency}, OCR read ${extraction.currency}.` });
  }

  // 4. Payment date/time vs order-creation-time delta (from the Journal D17
  // timestamp — the Success screen has none; see effectivePaymentDatetime).
  if (!effectivePaymentDatetime) {
    checks.push({ id: "time_delta", label: "Payment Time", result: "fail", points: 25, detail: "Payment date/time not legible on either screenshot." });
  } else {
    const paymentMs = Date.parse(effectivePaymentDatetime);
    const orderMs = Date.parse(input.orderCreatedAt);
    if (Number.isNaN(paymentMs)) {
      checks.push({ id: "time_delta", label: "Payment Time", result: "fail", points: 25, detail: `Unparseable payment date/time: "${effectivePaymentDatetime}".` });
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
  if (ocrAmount !== null && input.otherPlanPricesTnd?.some((p) => Math.abs(p - ocrAmount) <= AMOUNT_TOLERANCE_TND)) {
    checks.push({ id: "package_price_sanity", label: "Package Price", result: "fail", points: 10, detail: `OCR amount ${ocrAmount} matches a different plan's price, not the ordered plan's.` });
  } else {
    checks.push({ id: "package_price_sanity", label: "Package Price", result: "pass", points: 0, detail: "Amount does not collide with a different plan's price." });
  }

  // 9. Destination match — extracted D17 number/IBAN (from either
  // screenshot) must match the order's own snapshotted official values.
  {
    const candidates = [extraction.destination_number, extraction.destination_iban, extraction.screenshot2.destination].filter(
      (v): v is string => Boolean(v),
    );
    // The canonical official recipient number is authoritative (never the
    // mutable order snapshot); the IBAN, if the platform configured one, is
    // an additional acceptable destination.
    const officialValues = [input.officialRecipientNumber, input.orderDestinationIban].filter((v): v is string => Boolean(v));
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
    // Compare on absolute values — the Journal amount is the negative of the
    // Success-screen amount, which is expected and NOT a real mismatch.
    if (ocrAmount !== null && shot2Amount !== null && Math.abs(ocrAmount - shot2Amount) > AMOUNT_TOLERANCE_TND) {
      mismatches.push(`amount (${ocrAmount} vs ${shot2Amount})`);
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
    if (
      extraction.authorization_number &&
      s2.authorization_number &&
      normalizeReference(extraction.authorization_number) !== normalizeReference(s2.authorization_number)
    ) {
      mismatches.push(`authorization number (${extraction.authorization_number} vs ${s2.authorization_number})`);
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
    if (effectivePaymentDatetime) {
      const paymentMs = Date.parse(effectivePaymentDatetime);
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
  // short window, OR multiple accounts sharing the same device fingerprint
  // (src/lib/d17/client-fingerprint.ts), OR multiple accounts sharing the
  // same IP address. The hourly HARD cap lives in verify.functions.ts
  // (throws before reaching the rule engine); this is a softer, weighted
  // signal for volumes below that cap. All three sub-signals are honestly
  // weak on their own (a resettable localStorage UUID, per-account attempt
  // counts, and an IP that NAT/shared wifi can put many unrelated people
  // behind) — IP is weighted lowest of the three for that reason. Combined
  // and capped at 15, never a hard gate alone.
  {
    const rv = input.reputationVelocity;
    const attemptPoints = Math.min(15, Math.max(0, rv.attemptsInLastHour - 1) * 5);
    const sharedDevicePoints = Math.min(15, rv.sharedDeviceAccountCount * 8);
    const sharedIpPoints = Math.min(15, rv.sharedIpAccountCount * 4);
    const points = Math.min(15, attemptPoints + sharedDevicePoints + sharedIpPoints);
    checks.push({
      id: "velocity_signal",
      label: "Submission Velocity",
      result: points >= 15 ? "fail" : points > 0 ? "uncertain" : "pass",
      points,
      detail: `${rv.attemptsInLastHour} verification attempt(s) from this account in the last hour; ${rv.sharedDeviceAccountCount} other account(s) seen on this device; ${rv.sharedIpAccountCount} other account(s) seen on this IP.`,
    });
  }

  // 14. Deterministic image forensics — editor/AI-generator metadata + ELA
  // hotspot (src/lib/d17/image-forensics.server.ts). Advisory: a strong
  // signal forces manual review (blocks auto-approval), never an auto-reject.
  if (input.imageForensics) {
    const f = input.imageForensics;
    if (f.score >= 50) {
      checks.push({ id: "image_forensics", label: "Image Forensics", result: "fail", points: 25, detail: `Deterministic tamper signals (score ${f.score}): ${f.flags.join(", ") || "none"}.` });
    } else if (f.score >= 20) {
      checks.push({ id: "image_forensics", label: "Image Forensics", result: "uncertain", points: 12, detail: `Possible tamper signals (score ${f.score}): ${f.flags.join(", ") || "none"}.` });
    } else {
      checks.push({ id: "image_forensics", label: "Image Forensics", result: "pass", points: 0, detail: `No deterministic tamper signals (score ${f.score}).` });
    }
  }

  // Recipient hard gate — the single most important fraud control. Money
  // MUST reach the platform's one official D17 number. If a recipient number
  // is legibly extracted from EITHER screenshot and none of the legible
  // recipient numbers is the official one, the transfer demonstrably went
  // somewhere else → immediate hard reject, no auto-approval possible. A
  // recipient that simply couldn't be read is NOT handled here (there's
  // nothing to contradict) — it falls to destination_match "uncertain" and
  // the destination-confirmation gate below, i.e. manual review, never
  // auto-approval. Uses the same tolerant normalization (spaces/dashes/
  // country-code substring) as destination_match.
  const extractedRecipients = [extraction.destination_number, extraction.screenshot2.destination].filter(
    (v): v is string => Boolean(v),
  );
  const recipientLegible = extractedRecipients.length > 0;
  const recipientMatchesOfficial = extractedRecipients.some((r) => destinationsOverlap(r, input.officialRecipientNumber));
  const wrongRecipient = recipientLegible && !recipientMatchesOfficial;

  // Fraud hard gate — requires BOTH a categorical "hard" flag AND a high
  // self-reported fraud score, so a single hallucinated flag from a
  // probabilistic vision model can never alone trigger rejection.
  const hasHardFlag = extraction.fraud_flags.some((f) => HARD_FRAUD_FLAGS.has(f));
  const fraudHardGate = hasHardFlag && extraction.fraud_score >= HARD_FRAUD_SCORE_THRESHOLD;

  // Screenshot-type hard gate — the required pair is exactly one
  // "payment_success" and one "journal". Anything else (either slot
  // "unknown", both slots the same type, or a type swap) means the pipeline
  // cannot even confirm it's looking at the two required D17 screens, let
  // alone verify their contents — reject before trusting any of the rest of
  // the extraction from that slot.
  const screenshotTypeOk = extraction.screenshot_type === "payment_success" && extraction.screenshot2.screenshot_type === "journal";

  // Amount hard gate — anything further off than the gray zone is
  // unambiguous regardless of OCR confidence (see AMOUNT_GRAY_ZONE_TND
  // above). A null/illegible amount is NOT covered here — that's the
  // existing "uncertain" path in check #2, correctly routed to Manual
  // Review since there's nothing concrete to contradict.
  const amountHardReject = ocrAmount !== null && Math.abs(ocrAmount - input.orderAmountTnd) > AMOUNT_GRAY_ZONE_TND;

  // Currency hard gate — unlike a digit, a 3-letter currency code that was
  // legibly transcribed at all is not meaningfully ambiguous ("TND" doesn't
  // get OCR-misread as "EUR"), so any legible mismatch is unambiguous.
  const currencyHardReject = Boolean(extraction.currency) && extraction.currency!.trim().toUpperCase() !== input.orderCurrency.toUpperCase();

  // Authorization-number hard gate — gated on the field's OWN confidence
  // (not the overall ocr_confidence): a digit misread is genuinely plausible,
  // so only a CONFIDENTLY-read number that still disagrees with what the
  // student typed is treated as unambiguous. A low-confidence mismatch falls
  // through to the existing "reference_match" scored check (manual_review),
  // exactly the "genuinely unclear → human look" case the audit asked for.
  const AUTH_NUMBER_HARD_GATE_CONFIDENCE = 80;
  const authNumberHardReject =
    ocrIdentifier !== null &&
    extraction.field_confidence.authorization_number >= AUTH_NUMBER_HARD_GATE_CONFIDENCE &&
    normalizeReference(ocrIdentifier) !== normalizeReference(input.userEnteredReference) &&
    !normalizeReference(ocrIdentifier).includes(normalizeReference(input.userEnteredReference)) &&
    !normalizeReference(input.userEnteredReference).includes(normalizeReference(ocrIdentifier));

  // Precedence, most-unambiguous first: wrong recipient (money went
  // somewhere else — highest certainty) > screenshot type (can't even
  // confirm what's being looked at) > amount > currency > authorization
  // number > general fraud flags. Only the FIRST applicable reason is
  // reported — each is independently sufficient to reject on its own.
  const hardGate: HardGateReason | null = wrongRecipient
    ? "wrong_recipient"
    : !screenshotTypeOk
      ? "screenshot_type"
      : amountHardReject
        ? "amount_mismatch"
        : currencyHardReject
          ? "currency_mismatch"
          : authNumberHardReject
            ? "authorization_number_mismatch"
            : fraudHardGate
              ? "fraud"
              : null;

  // Clamped to [0, 100]: the reputation_signal check can contribute
  // negative points (a bonus for a clean history), so the raw sum is no
  // longer guaranteed non-negative the way it was when every check's
  // points were >= 0.
  const riskScore = hardGate ? 100 : Math.max(0, Math.min(100, checks.reduce((sum, c) => sum + c.points, 0)));
  const aiConfidence = hardGate ? 0 : 100 - riskScore;

  const autoApproveThreshold = input.autoApproveThreshold ?? DEFAULT_AUTO_APPROVE_CONFIDENCE_THRESHOLD;

  // Positive destination confirmation is a REQUIRED precondition for
  // auto-approval, independent of the numeric score. destination_match is
  // the single most safety-critical check: it is the ONLY thing that proves
  // the money actually reached the platform's own official D17 account rather
  // than a friend's number. Its "uncertain" outcome (no official destination
  // configured, or nothing legible on either screenshot) only costs 8 points
  // — low enough that an otherwise-clean attempt could clear the confidence
  // threshold and auto-approve a payment whose destination was never proven
  // (and a clean-history reputation bonus can mask even more). That must
  // never happen: if destination_match is anything other than a positive
  // "pass", the attempt can at best be auto-approved by a human, never by the
  // engine. This is a soft gate (routes to manual_review), NOT a fraud
  // rejection — an unproven destination is "uncertain", not "fraudulent".
  const destinationCheck = checks.find((c) => c.id === "destination_match");
  const destinationConfirmed = destinationCheck?.result === "pass";

  let decision: AttemptDecision;
  let decisionReason: string;
  if (hardGate === "wrong_recipient") {
    decision = "auto_rejected_fraud";
    decisionReason = `Payment was sent to a different recipient (${extractedRecipients.join(", ")}), not the official D17 number ${input.officialRecipientNumber}. Transfers to any other recipient are never accepted.`;
  } else if (hardGate === "screenshot_type") {
    decision = "auto_rejected_fraud";
    decisionReason = `The two screenshots do not match the required pair: expected a "Payment Success" screenshot and a "Journal D17" screenshot, but detected "${extraction.screenshot_type}" and "${extraction.screenshot2.screenshot_type}".`;
  } else if (hardGate === "amount_mismatch") {
    decision = "auto_rejected_fraud";
    decisionReason = `Amount does not match: expected ${input.orderAmountTnd} ${input.orderCurrency}, screenshot shows ${ocrAmount}.`;
  } else if (hardGate === "currency_mismatch") {
    decision = "auto_rejected_fraud";
    decisionReason = `Currency does not match: expected ${input.orderCurrency}, screenshot shows ${extraction.currency}.`;
  } else if (hardGate === "authorization_number_mismatch") {
    decision = "auto_rejected_fraud";
    decisionReason = `The authorization number on the screenshot ("${ocrIdentifier}") does not match what was entered ("${input.userEnteredReference}").`;
  } else if (hardGate === "fraud") {
    decision = "auto_rejected_fraud";
    decisionReason = `Fraud signals detected: ${extraction.fraud_flags.join(", ")} (fraud score ${extraction.fraud_score}).`;
  } else if (aiConfidence >= autoApproveThreshold && destinationConfirmed) {
    decision = "auto_approved";
    decisionReason = "All verification checks passed.";
  } else if (aiConfidence >= autoApproveThreshold && !destinationConfirmed) {
    decision = "manual_review";
    decisionReason = `Auto-approval withheld pending human confirmation of the payment destination — ${destinationCheck?.detail ?? "the destination could not be verified"}`;
  } else {
    decision = "manual_review";
    const worst = [...checks].sort((a, b) => b.points - a.points)[0];
    decisionReason = worst && worst.points > 0 ? worst.detail : "Confidence below the auto-approval threshold.";
  }

  return { checks, hardGate, riskScore, aiConfidence, decision, decisionReason };
}
