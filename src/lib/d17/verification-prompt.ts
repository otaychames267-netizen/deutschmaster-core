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
export const PROMPT_VERSION = "d17-verify-v3";

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
  return `You are analyzing TWO screenshots uploaded by a student as proof of a "D17" mobile-transfer payment made through the La Poste Tunisienne (البريد التونسي) D17 app, for a German-exam-prep subscription (order: ${orderContext.amountTnd} ${orderContext.currency}, plan "${orderContext.planCode}").

These are REAL D17 screens — here is exactly what each looks like so you can locate every field precisely:

IMAGE 1 — the "Payment Success" confirmation, header "Transfert d'argent", a La Poste Tunisienne diamond logo, then a white card reading "Félicitations !" with a green check, then the sentence: "Votre transfert d'un montant de <AMOUNT> au numéro <RECIPIENT> a été efectué avec succès", then a line "Numéro autorisation : <AUTH>", then an "OK" button. IMPORTANT: this screen has NO transaction date/time printed on it (the only clock visible is the phone's status bar — do NOT use that as the payment time).

IMAGE 2 — the "Journal D17" transaction-log entry, header "Journal D17", the La Poste logo, then "Opération D17", then the transaction timestamp in DD/MM/YYYY HH:MM:SS format (e.g. "17/07/2026 19:13:58"), then labelled rows: "Service" → "Transfert vers <RECIPIENT>", "Montant" → "<AMOUNT>" (this value is shown as NEGATIVE, e.g. "-30,000 TND", because it is a debit from the sender), "Numéro d'autorisation" → "<AUTH>".

Do THREE things in one pass: (1) transcribe IMAGE 1 into the top-level fields, (2) transcribe IMAGE 2 into "screenshot2", (3) compare the two and report consistency.

RULES — follow exactly:
- Extract ONLY what is actually visible. Never invent, guess, translate, or "correct" any value. If a field is not legible or not present, set it to null (or "unclear"/"unknown" for the enum fields). Read digits character-by-character.
- AMOUNT FORMAT (critical): D17 amounts use a COMMA as the DECIMAL separator with exactly 3 decimal places (Tunisian millimes). "1,000 TND" means 1.000 TND (one dinar). "30,000 TND" means 30.000 TND (thirty dinars). Output "amount" as a plain decimal number using a DOT and NO thousands grouping, e.g. 30.0 for "30,000 TND". NEVER multiply by 1000. If the amount is shown negative (a leading "-" on the Journal), output its ABSOLUTE value (drop the minus sign).
- "currency": as printed (e.g. "TND").
- "payment_datetime": On IMAGE 1 there is NO transaction date/time — set the top-level "payment_datetime" to null. The real transaction time is the "Opération D17" timestamp on IMAGE 2; put that in "screenshot2.payment_datetime", converting DD/MM/YYYY HH:MM:SS to an ISO 8601 string (day/month/year order — the first number is the DAY).
- "reference": D17 does NOT show a separate "reference"/"Réf" field — set this to null unless a genuinely distinct reference field is actually printed. Do not put the authorization number here.
- "destination_number": the recipient's D17 number — the digits after "au numéro" on IMAGE 1 (and after "Transfert vers" on IMAGE 2, which goes in screenshot2.destination). Typically 8 digits.
- "destination_iban": an IBAN if one is actually printed — D17 transfers normally do NOT show an IBAN, so this is almost always null.
- "transaction_id": null unless a field literally labelled "Transaction ID" and distinct from the authorization number is visible (normally not present on D17).
- "authorization_number": the value after "Numéro autorisation" (IMAGE 1) / "Numéro d'autorisation" (IMAGE 2). This is the SINGLE most important identifier on a D17 receipt — usually 6 digits. Read it extremely carefully. Put IMAGE 1's in the top-level field and IMAGE 2's in "screenshot2.authorization_number"; they should be identical.
- "notification_source": "d17_app" if the UI is clearly the La Poste Tunisienne / D17 app (logo, "Journal D17", "Numéro d'autorisation", "Transfert"); otherwise classify honestly (bank_sms / bank_app / screenshot_other / unclear).
- "language_detected": the screenshots are primarily French with some Arabic (the La Poste logo).
- "ocr_confidence": your 0-100 confidence in the transcription across BOTH images (low if blurry, low-res, or cropped so a key field is cut off).
- "raw_text": every legible piece of text on IMAGE 1, verbatim, in reading order (this is used to confirm the screen is a genuine D17 screen).
- "screenshot2": transcribe IMAGE 2 — "amount" (same comma-decimal + absolute-value rule), "currency", "payment_datetime" (the Opération D17 timestamp as ISO), "destination" (the number after "Transfert vers"), "authorization_number", "raw_text".
- "cross_check": compare the two images — the RECIPIENT number, the ABSOLUTE amount, and the AUTHORIZATION NUMBER must be identical on both. Set "consistent" to false only if a field legible on BOTH images actually disagrees (remember the Journal amount is the negative of the success-screen amount — that is NOT a disagreement once you take the absolute value). "notes": one or two sentences on what matched / what didn't.
- Fraud signals are a SEPARATE, purely technical assessment of the IMAGE FILES (not the payment's business legitimacy): look for overlay text pasted onto the UI, cloned/duplicated regions, compositing (mismatched lighting/edges/anti-aliasing around the amount, recipient, or authorization number specifically — the most likely fields a forger would alter), suspicious cropping hiding information, blur/noise/compression inconsistent with a normal phone screenshot, inconsistent fonts within one UI, unnatural color/hue shifts, or metadata-tampering hints. Pay special attention to whether the amount, recipient, and authorization number look like they belong to the same rendering pass as the surrounding text (same font, weight, baseline, kerning, anti-aliasing) — mismatches there are the strongest forgery signal. Only include a flag you genuinely observe; most legitimate pairs have zero flags.
- "fraud_score": your 0-100 estimate that the IMAGES were technically tampered with. 0 = look like untouched phone screenshots, 100 = clear editing.
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
