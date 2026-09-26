-- Fix: image_dhash was declared `bigint` (signed 64-bit, max ~9.2e18), but
-- computeDHash() produces an UNSIGNED 64-bit value (0 to 2^64-1) — any hash
-- with the top bit set would overflow a signed bigint on insert. Storing as
-- text (the base-10 string form) sidesteps both that and the separate risk
-- of JSON bigint-precision loss over PostgREST for values beyond
-- Number.MAX_SAFE_INTEGER. Application code already reads/writes this as a
-- string/BigInt on both ends (src/lib/d17/image-hash.server.ts,
-- duplicate-check.server.ts), so no JS logic changes are needed.
ALTER TABLE public.d17_verification_attempts
  ALTER COLUMN image_dhash TYPE text USING image_dhash::text;
