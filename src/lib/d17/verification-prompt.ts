/**
 * verification-prompt.ts — the single combined Gemini vision prompt for the
 * D17 payment-screenshot pipeline: OCR extraction AND fraud-signal detection
 * in one call, to conserve the shared daily Gemini budget (see
 * src/lib/grading/essay-grader-gemini.ts's isBudgetExceeded/recordUsage,
 * reused as-is by src/lib/d17/verify.functions.ts).
 *
 * Same "never invent, null if unclear" discipline as
 * src/lib/import/gemini-vision.ts's extraction prompts. The rule engine
 * (src/lib/d17/rule-engine.ts) treats every field here as an ADVISORY input,
 * never the decision itself — this prompt only has to be an honest,
 * best-effort transcription, not a judge.
 */

export interface D17VerificationExtraction {
  ocr_confidence: number; // 0-100
  amount: number | null;
  currency: string | null;
  payment_datetime: string | null; // ISO 8601, or null if not legible
  reference: string | null; // transaction reference/Réf as printed, or null if absent/illegible
  notification_source: "d17_app" | "bank_sms" | "bank_app" | "screenshot_other" | "unclear";
  language_detected: "ar" | "fr" | "de" | "en" | "mixed" | "unknown";
  raw_text: string; // everything legible on the screenshot, verbatim
  fraud_score: number; // 0-100, this model's own likelihood-of-tampering estimate
  fraud_flags: string[]; // subset of FRAUD_FLAG_VALUES
  screenshot_integrity_ok: boolean;
  notes: string | null;
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
] as const;

export function buildVerificationPrompt(orderContext: { amountTnd: number; currency: string; planCode: string }): string {
  return `You are analyzing a screenshot uploaded by a student as proof of a D17/bank-transfer payment for a German-exam-prep subscription (order: ${orderContext.amountTnd} ${orderContext.currency}, plan "${orderContext.planCode}"). Do TWO things in one pass: (1) transcribe every legible field on the screenshot, and (2) report technical signals suggesting the image may have been edited or fabricated.

RULES — follow exactly:
- Extract ONLY what is actually visible. Never invent, guess, translate, or "correct" any value. If a field is not legible or not present, set it to null (or "unclear"/"unknown" for the enum fields).
- The screenshot may be in Arabic, French, German, or English, or a mix. Transcribe text in its original language/script — do not translate.
- "amount" and "currency": the payment amount and currency shown in the notification, exactly as printed (numeric amount only, no currency symbol, e.g. 55.00).
- "payment_datetime": the payment's own date/time as shown on the screenshot (not today's date), as an ISO 8601 string if you can determine it, else null.
- "reference": the transaction reference / Réf / transaction ID as printed, verbatim, or null if no such field is visible anywhere on the screenshot. Do NOT guess or partially reconstruct it — either you can read it or the field is null.
- "notification_source": your best classification of what kind of screenshot this is, from the visible UI (a D17 app screen, a bank SMS, a bank app screen, some other screenshot, or unclear if you cannot tell).
- "ocr_confidence": your own 0-100 confidence in the overall transcription's accuracy (low if the image is blurry, low-resolution, or partially cropped).
- "raw_text": every piece of legible text on the image, concatenated, verbatim, in reading order.
- Fraud signals are a SEPARATE, purely technical assessment of the IMAGE ITSELF (not of whether the payment looks legitimate business-wise): look for visible overlay text pasted on top of the original UI, cloned/duplicated regions, signs of image compositing (mismatched lighting/edges), suspicious cropping that could hide information, unusual blur/noise/compression patterns inconsistent with a normal phone screenshot, inconsistent fonts within what should be one UI, or anything suggesting EXIF/metadata tampering. Only include a flag in "fraud_flags" if you genuinely observe that specific visual signal — do not include flags speculatively. Most legitimate screenshots should have zero flags.
- "fraud_score": your own 0-100 estimate of how likely this specific image has been technically tampered with (not a judgment of the payment amount/reference — just the image file itself). 0 = looks like an untouched phone screenshot, 100 = clear signs of editing.
- "screenshot_integrity_ok": true unless you have a concrete, specific reason to believe the image was edited.

Return ONLY this JSON (no markdown fences):
{
  "ocr_confidence": number,
  "amount": number | null,
  "currency": string | null,
  "payment_datetime": string | null,
  "reference": string | null,
  "notification_source": "d17_app" | "bank_sms" | "bank_app" | "screenshot_other" | "unclear",
  "language_detected": "ar" | "fr" | "de" | "en" | "mixed" | "unknown",
  "raw_text": string,
  "fraud_score": number,
  "fraud_flags": string[],
  "screenshot_integrity_ok": boolean,
  "notes": string | null
}`;
}

const NOTIFICATION_SOURCES = ["d17_app", "bank_sms", "bank_app", "screenshot_other", "unclear"] as const;
const LANGUAGES = ["ar", "fr", "de", "en", "mixed", "unknown"] as const;

/** Lenient/defaulting parse of Gemini's raw JSON response, matching the
 * "never invent, null if unclear" philosophy: malformed or partial fields
 * degrade to null/unclear/0 rather than throwing, so a garbled response
 * still flows into the rule engine as a low-confidence input (correctly
 * landing on manual_review) instead of crashing the whole request. */
export function parseExtraction(raw: any): D17VerificationExtraction {
  const clamp100 = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);
  return {
    ocr_confidence: clamp100(raw?.ocr_confidence),
    amount: typeof raw?.amount === "number" && Number.isFinite(raw.amount) ? raw.amount : null,
    currency: typeof raw?.currency === "string" && raw.currency.trim() ? raw.currency.trim() : null,
    payment_datetime: typeof raw?.payment_datetime === "string" && raw.payment_datetime.trim() ? raw.payment_datetime : null,
    reference: typeof raw?.reference === "string" && raw.reference.trim() ? raw.reference.trim() : null,
    notification_source: NOTIFICATION_SOURCES.includes(raw?.notification_source) ? raw.notification_source : "unclear",
    language_detected: LANGUAGES.includes(raw?.language_detected) ? raw.language_detected : "unknown",
    raw_text: typeof raw?.raw_text === "string" ? raw.raw_text : "",
    fraud_score: clamp100(raw?.fraud_score),
    fraud_flags: Array.isArray(raw?.fraud_flags) ? raw.fraud_flags.filter((f: unknown) => typeof f === "string") : [],
    screenshot_integrity_ok: raw?.screenshot_integrity_ok !== false,
    notes: typeof raw?.notes === "string" ? raw.notes : null,
  };
}
