/**
 * duplicate-check.server.ts — the D17 pipeline's auto-reject hard gate for
 * reused screenshots/references. Evaluated BEFORE any Gemini call, so a hit
 * here saves budget entirely (see src/lib/d17/verify.functions.ts).
 *
 * Every query excludes rows from the CURRENT order: a user's legitimate
 * 2nd/3rd retry of the same screenshot (up to the 3-attempt cap) must never
 * self-flag as a duplicate of itself.
 *
 * The dHash near-duplicate comparison is done in JS, not SQL, to avoid a
 * Postgres-version dependency on bit_count(bigint) (added in PG14) — a
 * bounded time-window fetch plus a JS popcount is portable and testable
 * without hitting the DB.
 */
import { hammingDistance } from "./image-hash.server";

const DHASH_DUPLICATE_THRESHOLD = Number(process.env.DHASH_DUPLICATE_THRESHOLD ?? 10);
const DUPLICATE_LOOKBACK_DAYS = 180; // D17 verification is explicitly temporary — no need to scan an unbounded table

export type DuplicateMatchType = "exact_image" | "near_duplicate_image" | "exact_ocr_text" | "cross_account_reference";

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
  ocrTextHashSha256: string | null;
  reference: string | null;
}

export async function findDuplicate(supabaseAdmin: any, params: FindDuplicateParams): Promise<DuplicateMatch | null> {
  const { data: exactImage } = await supabaseAdmin
    .from("d17_verification_attempts")
    .select("id, order_id, user_id")
    .eq("image_hash_sha256", params.imageHashSha256)
    .neq("order_id", params.orderId)
    .limit(1)
    .maybeSingle();
  if (exactImage) {
    return { type: "exact_image", matchedAttemptId: exactImage.id, matchedOrderId: exactImage.order_id, matchedUserId: exactImage.user_id };
  }

  if (params.ocrTextHashSha256) {
    const { data: exactText } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("id, order_id, user_id")
      .eq("ocr_text_hash_sha256", params.ocrTextHashSha256)
      .neq("order_id", params.orderId)
      .limit(1)
      .maybeSingle();
    if (exactText) {
      return { type: "exact_ocr_text", matchedAttemptId: exactText.id, matchedOrderId: exactText.order_id, matchedUserId: exactText.user_id };
    }
  }

  if (params.reference) {
    const { data: refMatch } = await supabaseAdmin
      .from("d17_verification_attempts")
      .select("id, order_id, user_id")
      .eq("ocr_reference", params.reference)
      .neq("order_id", params.orderId)
      .limit(1)
      .maybeSingle();
    if (refMatch) {
      return { type: "cross_account_reference", matchedAttemptId: refMatch.id, matchedOrderId: refMatch.order_id, matchedUserId: refMatch.user_id };
    }
  }

  const since = new Date(Date.now() - DUPLICATE_LOOKBACK_DAYS * 86400_000).toISOString();
  const { data: candidates } = await supabaseAdmin
    .from("d17_verification_attempts")
    .select("id, order_id, user_id, image_dhash")
    .neq("order_id", params.orderId)
    .gte("created_at", since);
  for (const c of candidates ?? []) {
    const dist = hammingDistance(params.imageDhash, BigInt(c.image_dhash));
    if (dist <= DHASH_DUPLICATE_THRESHOLD) {
      return { type: "near_duplicate_image", matchedAttemptId: c.id, matchedOrderId: c.order_id, matchedUserId: c.user_id };
    }
  }

  return null;
}
