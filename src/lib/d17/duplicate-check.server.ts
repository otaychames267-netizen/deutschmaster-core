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
  imageHashSha256_2: string;
  imageDhash_2: bigint;
  ocrTextHashSha256: string | null;
  ocrTextHashSha256_2: string | null;
  reference: string | null;
  transactionId: string | null;
  authorizationNumber: string | null;
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

  if (params.reference) {
    const match = await findAttemptByColumn(supabaseAdmin, params.orderId, "ocr_reference", params.reference);
    if (match) {
      return { type: "cross_account_reference", matchedAttemptId: match.id, matchedOrderId: match.order_id, matchedUserId: match.user_id };
    }
  }

  if (params.transactionId) {
    const match = await findAttemptByColumn(supabaseAdmin, params.orderId, "ocr_transaction_id", params.transactionId);
    if (match) {
      return { type: "transaction_id_duplicate", matchedAttemptId: match.id, matchedOrderId: match.order_id, matchedUserId: match.user_id };
    }
  }

  if (params.authorizationNumber) {
    const match = await findAttemptByColumn(supabaseAdmin, params.orderId, "ocr_authorization_number", params.authorizationNumber);
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
  const incomingDhashes = [params.imageDhash, params.imageDhash_2];
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
