/**
 * verification-prompt.ts — the single combined Gemini vision prompt for the
 * D17 payment-screenshot pipeline: OCR extraction AND fraud-signal detection
 * in one call, to conserve the shared daily Gemini budget (see
 * src/lib/grading/essay-grader-gemini.ts's isBudgetExceeded/recordUsage,
 * reused as-is by src/lib/d17/verify.functions.ts).
 *
 * Two screenshots are sent in ONE call (not two separate calls): cheaper
 * against the budget cap (avoids duplicating the prompt-text token cost and
 * doubling the tracked request count) and lets the model reason about
 * cross-screenshot consistency in-context. The top-level fields below
 * describe Screenshot 1 ("Payment Success"); `screenshot2` carries the
 * subset of Screenshot 2 ("Transaction History / Journal D17") fields the
 * DB schema tracks for cross-checking; `cross_check` is the model's own
 * comparison. The rule engine (src/lib/d17/rule-engine.ts) independently
 * re-verifies `cross_check.consistent` via direct field comparison rather
 * than trusting the model's self-report — same "AI is advisory, rule engine
 * decides" discipline as everything else in this pipeline.
 *
 * Same "never invent, null if unclear" discipline as
 * src/lib/import/gemini-vision.ts's extraction prompts. The rule engine
 * treats every field here as an ADVISORY input, never the decision itself —
 * this prompt only has to be an honest, best-effort transcription, not a
 * judge.
 */

/**
 * Bumped whenever buildVerificationPrompt's schema/instructions change in a
 * way that could shift extraction behavior — stamped onto every attempt row
 * (d17_verification_attempts.ocr_version, see verify.functions.ts) so a
 * future admin auditing old decisions can tell which prompt produced them.
 * "v2" here is the two-screenshot + cross-check prompt below; the DB
 * column's default of 'v1' correctly represents every attempt recorded
 * before this prompt existed (the original single-screenshot flow).
 */
export const PROMPT_VERSION = "d17-verify-v2";

export interface D17Screenshot2Extraction {
  amount: number | null;
  currency: string | null;
  payment_datetime: string | null; // ISO 8601, or null if not legible
  destination: string | null; // the D17 number or IBAN shown, as printed
  authorization_number: string | null; // same field as IMAGE 1's, as shown in the journal entry
  raw_text: string;
}

export interface D17CrossCheckResult {
  consistent: boolean; // the model's own opinion — the rule engine re-derives this independently
  notes: string; // brief explanation of what was compared and any mismatches found
}

export interface D17VerificationExtraction {
  ocr_confidence: number; // 0-100
  amount: number | null;
  currency: string | null;
  payment_datetime: string | null; // ISO 8601, or null if not legible
  reference: string | null; // transaction reference/Réf as printed, or null if absent/illegible
  destination_number: string | null; // official D17 phone number shown on either screenshot, or null
  destination_iban: string | null; // official IBAN shown on either screenshot, or null
  transaction_id: string | null; // Transaction ID as printed, distinct from the Authorization Number
  authorization_number: string | null; // Authorization Number / Numéro d'autorisation as printed
  notification_source: "d17_app" | "bank_sms" | "bank_app" | "screenshot_other" | "unclear";
  language_detected: "ar" | "fr" | "de" | "en" | "mixed" | "unknown";
  raw_text: string; // everything legible on screenshot 1, verbatim
  fraud_score: number; // 0-100, this model's own likelihood-of-tampering estimate
  fraud_flags: string[]; // subset of FRAUD_FLAG_VALUES
  screenshot_integrity_ok: boolean;
  notes: string | null;
  screenshot2: D17Screenshot2Extraction;
  cross_check: D17CrossCheckResult;
}

export const FRAUD_FLAG_VALUES = [
  "overlay_text_detected",
  "clone_region_suspected",
  "fake_screenshot_composite",
  "cropping_suspected",
  "blur_or_noise_anomaly",
  "compression_anomaly",
  "font_inconsistency",
  "metadata_anomaly",
  "color_manipulation",
] as const;

export function buildVerificationPrompt(orderContext: { amountTnd: number; currency: string; planCode: string }): string {
  return `You are analyzing TWO screenshots uploaded by a student as proof of a D17 mobile-transfer payment for a German-exam-prep subscription (order: ${orderContext.amountTnd} ${orderContext.currency}, plan "${orderContext.planCode}").

IMAGE 1 is the D17 "Payment Success" screen shown immediately after a transfer — it should show the successful transfer, the destination D17 number, the amount, and a Transaction Authorization Number.
IMAGE 2 is the D17 app's Transaction History / Journal D17 entry for the same transfer — it should show the date, time, destination number, amount, and Authorization Number as recorded in the transaction log.

Do THREE things in one pass: (1) transcribe every legible field on IMAGE 1 into the top-level fields below, (2) transcribe the subset of fields listed under "screenshot2" from IMAGE 2, and (3) compare the two images and report whether they describe the same transaction.

RULES — follow exactly:
- Extract ONLY what is actually visible. Never invent, guess, translate, or "correct" any value. If a field is not legible or not present, set it to null (or "unclear"/"unknown" for the enum fields).
- The screenshots may be in Arabic, French, German, or English, or a mix. Transcribe text in its original language/script — do not translate.
- "amount" and "currency": the payment amount and currency shown on IMAGE 1, exactly as printed (numeric amount only, no currency symbol, e.g. 55.00).
- "payment_datetime": IMAGE 1's own date/time as shown (not today's date), as an ISO 8601 string if you can determine it, else null.
- "reference": a general transaction reference / Réf as printed on IMAGE 1, verbatim, or null if no such field is visible. Do NOT guess or partially reconstruct it.
- "destination_number": the official D17 phone number the transfer was sent to, as printed on either image (prefer IMAGE 1 if both show it), or null.
- "destination_iban": an IBAN shown as the transfer destination on either image, or null — most D17 transfers will NOT show an IBAN; only fill this if one is actually printed.
- "transaction_id": a "Transaction ID" field as printed, if visible and DISTINCT from any Authorization Number field — these are two different printed fields on some D17 screens, do not merge them. Null if not present.
- "authorization_number": the "Authorization Number" / "Numéro d'autorisation" field as printed, or null if not present. This is usually the strongest identifier on the screenshot — read it very carefully, character by character.
- "notification_source": your best classification of what kind of screenshot IMAGE 1 is, from the visible UI (a D17 app screen, a bank SMS, a bank app screen, some other screenshot, or unclear if you cannot tell).
- "ocr_confidence": your own 0-100 confidence in the overall transcription's accuracy across BOTH images (low if either image is blurry, low-resolution, or partially cropped).
- "raw_text": every piece of legible text on IMAGE 1, concatenated, verbatim, in reading order.
- "screenshot2": transcribe from IMAGE 2 only — "amount", "currency", "payment_datetime", "destination" (the D17 number/IBAN shown in the journal entry), "authorization_number" (the same Authorization Number field as on IMAGE 1, as shown in this journal entry, or null if not present/legible), and "raw_text" (every legible piece of text on IMAGE 2, verbatim). Same null-if-not-legible rule applies.
- "cross_check": compare IMAGE 1 and IMAGE 2 directly — do the destination number/IBAN, amount, date/time, and Authorization Number (if visible on both) actually match between the two images? Set "consistent" to false if you find ANY concrete mismatch between fields that are legible on both images. If a field is only legible on one image, that alone is not a mismatch. "notes" should briefly state what you compared and any mismatch found, in one or two sentences.
- Fraud signals are a SEPARATE, purely technical assessment of the IMAGES THEMSELVES (not of whether the payment looks legitimate business-wise): look for visible overlay text pasted on top of the original UI, cloned/duplicated regions, signs of image compositing (mismatched lighting/edges), suspicious cropping that could hide information, unusual blur/noise/compression patterns inconsistent with a normal phone screenshot, inconsistent fonts within what should be one UI, unnatural color/hue shifts or tinting inconsistent with a normal phone screenshot (possible recoloring/editing), or anything suggesting EXIF/metadata tampering. Consider both images. Only include a flag in "fraud_flags" if you genuinely observe that specific visual signal — do not include flags speculatively. Most legitimate screenshot pairs should have zero flags.
- "fraud_score": your own 0-100 estimate of how likely these images have been technically tampered with (not a judgment of the payment amount/reference — just the image files themselves). 0 = look like untouched phone screenshots, 100 = clear signs of editing.
- "screenshot_integrity_ok": true unless you have a concrete, specific reason to believe either image was edited.

Return ONLY this JSON (no markdown fences):
{
  "ocr_confidence": number,
  "amount": number | null,
  "currency": string | null,
  "payment_datetime": string | null,
  "reference": string | null,
  "destination_number": string | null,
  "destination_iban": string | null,
  "transaction_id": string | null,
  "authorization_number": string | null,
  "notification_source": "d17_app" | "bank_sms" | "bank_app" | "screenshot_other" | "unclear",
  "language_detected": "ar" | "fr" | "de" | "en" | "mixed" | "unknown",
  "raw_text": string,
  "fraud_score": number,
  "fraud_flags": string[],
  "screenshot_integrity_ok": boolean,
  "notes": string | null,
  "screenshot2": {
    "amount": number | null,
    "currency": string | null,
    "payment_datetime": string | null,
    "destination": string | null,
    "authorization_number": string | null,
    "raw_text": string
  },
  "cross_check": {
    "consistent": boolean,
    "notes": string
  }
}`;
}

const NOTIFICATION_SOURCES = ["d17_app", "bank_sms", "bank_app", "screenshot_other", "unclear"] as const;
const LANGUAGES = ["ar", "fr", "de", "en", "mixed", "unknown"] as const;

function parseScreenshot2(raw: any): D17Screenshot2Extraction {
  return {
    amount: typeof raw?.amount === "number" && Number.isFinite(raw.amount) ? raw.amount : null,
    currency: typeof raw?.currency === "string" && raw.currency.trim() ? raw.currency.trim() : null,
    payment_datetime: typeof raw?.payment_datetime === "string" && raw.payment_datetime.trim() ? raw.payment_datetime : null,
    destination: typeof raw?.destination === "string" && raw.destination.trim() ? raw.destination.trim() : null,
    authorization_number: typeof raw?.authorization_number === "string" && raw.authorization_number.trim() ? raw.authorization_number.trim() : null,
    raw_text: typeof raw?.raw_text === "string" ? raw.raw_text : "",
  };
}

function parseCrossCheck(raw: any): D17CrossCheckResult {
  return {
    consistent: raw?.consistent !== false,
    notes: typeof raw?.notes === "string" ? raw.notes : "",
  };
}

/** Lenient/defaulting parse of Gemini's raw JSON response, matching the
 * "never invent, null if unclear" philosophy: malformed or partial fields
 * degrade to null/unclear/0 rather than throwing, so a garbled response
 * still flows into the rule engine as a low-confidence input (correctly
 * landing on manual_review) instead of crashing the whole request. */
export function parseExtraction(raw: any): D17VerificationExtraction {
  const clamp100 = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);
  const optionalString = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    ocr_confidence: clamp100(raw?.ocr_confidence),
    amount: typeof raw?.amount === "number" && Number.isFinite(raw.amount) ? raw.amount : null,
    currency: optionalString(raw?.currency),
    payment_datetime: typeof raw?.payment_datetime === "string" && raw.payment_datetime.trim() ? raw.payment_datetime : null,
    reference: optionalString(raw?.reference),
    destination_number: optionalString(raw?.destination_number),
    destination_iban: optionalString(raw?.destination_iban),
    transaction_id: optionalString(raw?.transaction_id),
    authorization_number: optionalString(raw?.authorization_number),
    notification_source: NOTIFICATION_SOURCES.includes(raw?.notification_source) ? raw.notification_source : "unclear",
    language_detected: LANGUAGES.includes(raw?.language_detected) ? raw.language_detected : "unknown",
    raw_text: typeof raw?.raw_text === "string" ? raw.raw_text : "",
    fraud_score: clamp100(raw?.fraud_score),
    fraud_flags: Array.isArray(raw?.fraud_flags) ? raw.fraud_flags.filter((f: unknown) => typeof f === "string") : [],
    screenshot_integrity_ok: raw?.screenshot_integrity_ok !== false,
    notes: typeof raw?.notes === "string" ? raw.notes : null,
    screenshot2: parseScreenshot2(raw?.screenshot2),
    cross_check: parseCrossCheck(raw?.cross_check),
  };
}
