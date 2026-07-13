/**
 * Image hashing for the D17 verification pipeline's duplicate detection.
 * Uses `sharp` (already a dependency) exclusively — no perceptual-hash
 * library exists in this repo, and a hand-rolled dHash is small enough not
 * to warrant adding one. dHash catches "same image reused/re-compressed/
 * re-screenshotted," not "same transaction differently cropped" — cropping
 * that hides a reference number is a fraud-detection concern, not a
 * duplicate-detection one.
 */
import { createHash } from "crypto";
import sharp from "sharp";

export function sha256Hash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function sha256HashText(text: string): string {
  return createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

/** Re-encoding via sharp strips EXIF/metadata. `.rotate()` auto-orients from
 * the EXIF orientation tag *before* it's discarded, so visual orientation
 * survives even though the metadata itself does not. */
export async function stripExifAndReencode(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).rotate().png().toBuffer();
}

const MIN_DIMENSION_PX = 200;
const BLANK_STDDEV_THRESHOLD = 3; // near-zero per-channel std deviation = a flat, blank/near-solid-color image

/**
 * Server-side re-validation before OCR/Gemini ever see the file — the
 * client's own type/size check (verify.tsx) is never trusted alone, per
 * this repo's "server never trusts the frontend" convention. Throws a
 * clear, user-facing message on any failure; never lets an invalid file
 * reach the pipeline's hashing/duplicate-check/OCR stages.
 */
export async function validateImageOrThrow(buffer: Buffer, label: string): Promise<void> {
  const metadata = await sharp(buffer)
    .metadata()
    .catch(() => {
      throw new Error(`${label} could not be read — the file may be corrupted. Please upload a valid PNG, JPG, or WEBP screenshot.`);
    });
  if (!metadata.width || !metadata.height) {
    throw new Error(`${label} could not be read — the file may be corrupted. Please upload a valid PNG, JPG, or WEBP screenshot.`);
  }
  if (metadata.width < MIN_DIMENSION_PX || metadata.height < MIN_DIMENSION_PX) {
    throw new Error(`${label} resolution is too low to read (${metadata.width}x${metadata.height}px). Please upload a clearer screenshot.`);
  }

  const stats = await sharp(buffer).stats();
  const maxChannelStdDev = Math.max(...stats.channels.map((c) => c.stdev));
  if (maxChannelStdDev < BLANK_STDDEV_THRESHOLD) {
    throw new Error(`${label} appears blank or unreadable. Please upload a screenshot showing your D17 payment confirmation.`);
  }
}

const DHASH_WIDTH = 9;
const DHASH_HEIGHT = 8;

/** Difference hash: resize to 9x8 grayscale, compare each pixel to its right
 * neighbor, pack the 64 comparisons into a bigint. Near-identical images
 * produce hashes with a small Hamming distance; unrelated images produce
 * large distances. Sensitive to aspect-ratio changes/heavy cropping by
 * design — that's intentionally NOT this function's job. */
export async function computeDHash(buffer: Buffer): Promise<bigint> {
  const { data } = await sharp(buffer)
    .grayscale()
    .resize(DHASH_WIDTH, DHASH_HEIGHT, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = 0n;
  let bitIndex = 0n;
  for (let row = 0; row < DHASH_HEIGHT; row++) {
    for (let col = 0; col < DHASH_WIDTH - 1; col++) {
      const left = data[row * DHASH_WIDTH + col];
      const right = data[row * DHASH_WIDTH + col + 1];
      if (left > right) hash |= 1n << bitIndex;
      bitIndex += 1n;
    }
  }
  return hash;
}

export function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x > 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}
