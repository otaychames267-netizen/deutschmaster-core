-- D17 v4 Phase 17: the payment-screenshots storage bucket had no
-- file_size_limit and no allowed_mime_types (both null — unbounded uploads
-- of any file type). The client enforces a 10MB PNG/JPG/WEBP-only check,
-- but that's client-side only; a caller bypassing the UI (direct storage
-- API call) could previously upload an arbitrarily large file of any type.
-- This is the primary fix (prevents oversized/wrong-type files from ever
-- being stored at all); validateImageOrThrow's new buffer-size check
-- (image-hash.server.ts) is a secondary, redundant guard for defense in
-- depth.
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10 MB, matches the client's own limit
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'payment-screenshots';
