/**
 * duplicate-check.server.ts — the D17 pipeline's auto-reject hard gate for
 * reused screenshots/references. Evaluated BEFORE any Gemini call, so a hit
 * here saves budget entirely (see src/lib/d17/verify.functions.ts).
 *
 * Every query excludes rows from the CURRENT order: a user's legitimate
 * 2nd/3rd retry of the same screenshot (up to the attempt cap) must never
 * self-flag as a duplicate of itself.
 *
 * Two screenshots are checked per attempt (Screenshot 1 "Payment Success"
 * and Screenshot 2 "Transaction History/Journal D17"). A reused image is
 * fraud regardless of which slot it's reused into or was originally
 * uploaded as, so every image/hash comparison checks the incoming pair
 * against BOTH stored columns (`*_1` and `*_2`) on other attempts.
 *
 * The dHash near-duplicate comparison is done in JS, not SQL, to avoid a
 * Postgres-version dependency on bit_count(bigint) (added in PG14) — a
 * bounded time-window fetch plus a JS popcount is portable and testable
 * without hitting the DB.
 */
import { hammingDistance } from "./image-hash.server";
import { normalizeReference } from "./rule-engine";

const DHASH_DUPLICATE_THRESHOLD = Number(process.env.DHASH_DUPLICATE_THRESHOLD ?? 10);
const DUPLICATE_LOOKBACK_DAYS = 180; // D17 verification is explicitly temporary — no need to scan an unbounded table

export type DuplicateMatchType =
  | "exact_image"
  | "near_duplicate_image"
  | "exact_ocr_text"
  | "cross_account_reference"
  | "transaction_id_duplicate"
  | "authorization_number_duplicate";

export interface DuplicateMatch {
  type: DuplicateMatchType;
  matchedAttemptId: string;
  matchedOrderId: string;
  matchedUserId: string;
}

export interface FindDuplicateParams {
  orderId: string;
  imageHashSha256: string;
  imageDhash: bigint;
  /** Null when only Screenshot 1 was uploaded (single-image manual-review
   * path, see verify.functions.ts) — every comparison below already skips a
   * missing hash/dhash rather than erroring on it. */
  imageHashSha256_2: string | null;
  imageDhash_2: bigint | null;
  ocrTextHashSha256: string | null;
  ocrTextHashSha256_2: string | null;
  reference: string | null;
  transactionId: string | null;
  authorizationNumber: string | null;
  /** The authorization number the student TYPED (D17's sole identifier).
   * Checked against every other order's stored identifiers so a reused
   * authorization number is caught even when THIS upload's OCR failed to read
   * it — and, because it's known before the Gemini call, a reused number is
   * hard-rejected in the pre-OCR pass without spending any Gemini budget. */
  userEnteredReference: string | null;
}

async function findAttemptByColumn(
  supabaseAdmin: any,
  orderId: string,
  column: string,
  value: string,
): Promise<{ id: string; order_id: string; user_id: string } | null> {
  const { data } = await supabaseAdmin
    .from("d17_verification_attempts")
    .select("id, order_id, user_id")
    .eq(column, value)
    .neq("order_id", orderId)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function findDuplicate(supabaseAdmin: any, params: FindDuplicateParams): Promise<DuplicateMatch | null> {
  // Exact image reuse — check both incoming images against both stored
  // image-hash columns, so a Screenshot 1 reused as someone else's
  // Screenshot 2 (or vice versa) is still caught.
  const incomingImageHashes = [params.imageHashSha256, params.imageHashSha256_2];
  for (const hash of incomingImageHashes) {
    if (!hash) continue;
    const { data: match } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("id, order_id, user_id")
      .or(`image_hash_sha256.eq.${hash},image_hash_sha256_2.eq.${hash}`)
      .neq("order_id", params.orderId)
      .limit(1)
      .maybeSingle();
    if (match) {
      return { type: "exact_image", matchedAttemptId: match.id, matchedOrderId: match.order_id, matchedUserId: match.user_id };
    }
  }

  const incomingTextHashes = [params.ocrTextHashSha256, params.ocrTextHashSha256_2].filter((h): h is string => Boolean(h));
  for (const hash of incomingTextHashes) {
    const { data: match } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("id, order_id, user_id")
      .or(`ocr_text_hash_sha256.eq.${hash},ocr_text_hash_sha256_2.eq.${hash}`)
      .neq("order_id", params.orderId)
      .limit(1)
      .maybeSingle();
    if (match) {
      return { type: "exact_ocr_text", matchedAttemptId: match.id, matchedOrderId: match.order_id, matchedUserId: match.user_id };
    }
  }

  // Identifier reuse, NORMALIZED — checked against the normalized_identifier
  // column every attempt writes (finalizeAttempt), not the raw OCR columns
  // directly. Fixes a real gap: comparing raw strings meant a trivially
  // reformatted duplicate (spaces/dashes/leading zeros — "482193" vs
  // "482-193" vs "0482193") could evade this check even though the
  // same-attempt OCR-vs-user-entered comparison (rule-engine.ts) already
  // treats those as equal via the same normalizeReference(). The primary,
  // race-free path for the user-entered value is reserve_d17_identifier
  // (called earlier in verify.functions.ts, before any Gemini spend); this
  // check additionally covers the OCR-extracted identifiers, which are only
  // known post-OCR.
  const normalizedCandidates = Array.from(
    new Set(
      [params.userEnteredReference, params.authorizationNumber, params.reference, params.transactionId]
        .filter((v): v is string => Boolean(v))
        .map(normalizeReference)
        .filter((v) => v.length > 0),
    ),
  );
  for (const candidate of normalizedCandidates) {
    const match = await findAttemptByColumn(supabaseAdmin, params.orderId, "normalized_identifier", candidate);
    if (match) {
      return { type: "authorization_number_duplicate", matchedAttemptId: match.id, matchedOrderId: match.order_id, matchedUserId: match.user_id };
    }
  }

  const since = new Date(Date.now() - DUPLICATE_LOOKBACK_DAYS * 86400_000).toISOString();
  const { data: candidates } = await supabaseAdmin
    .from("d17_verification_attempts")
    .select("id, order_id, user_id, image_dhash, image_dhash_2")
    .neq("order_id", params.orderId)
    .gte("created_at", since);
  const incomingDhashes = [params.imageDhash, params.imageDhash_2].filter((h): h is bigint => h !== null);
  for (const c of candidates ?? []) {
    const storedDhashes = [c.image_dhash, c.image_dhash_2].filter((h: string | null): h is string => Boolean(h)).map((h: string) => BigInt(h));
    for (const incoming of incomingDhashes) {
      for (const stored of storedDhashes) {
        if (hammingDistance(incoming, stored) <= DHASH_DUPLICATE_THRESHOLD) {
          return { type: "near_duplicate_image", matchedAttemptId: c.id, matchedOrderId: c.order_id, matchedUserId: c.user_id };
        }
      }
    }
  }

  return null;
}
