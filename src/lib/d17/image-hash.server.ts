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
