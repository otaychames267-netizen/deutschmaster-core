-- HIGH SECURITY FIX: D17 admin "test with a synthetic screenshot" fixtures
-- (public/d17-test-fixtures/*.png) were served as plain static files —
-- reachable via a direct unauthenticated fetch('/d17-test-fixtures/sample-
-- pass.png') by literally anyone, not just admins. The UI button that uses
-- them is gated behind `{isAdmin && (...)}`, which is only a client-side
-- React check — the images themselves, and the production
-- submitVerificationAttempt() function they're fed into, have no such gate.
--
-- These images are deliberately "baked to pass" the real fraud-detection
-- pipeline (OCR + rule engine + duplicate check) for a specific order
-- amount/reference. Any authenticated non-admin user could: (1) fetch the
-- public PNG directly, (2) create a real Schriftlich D17 order via the
-- normal billing flow, (3) call submitVerificationAttempt with the fixture
-- bytes + the hardcoded reference visible in the route source — and get a
-- real paid subscription approved for free. The cross-account duplicate
-- check (exact hash + dHash-10 near-duplicate) limits reuse of the exact
-- same bytes, but a trivially re-encoded copy would likely evade it.
--
-- Fix: move the fixtures into a private, admin-only storage bucket. The
-- production verification pipeline itself is untouched — it's correct for
-- it to treat all image bytes equally; the actual bug was that
-- "guaranteed-to-pass" test images were sitting in a publicly fetchable
-- location at all.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('d17-test-fixtures', 'd17-test-fixtures', false, 5242880, ARRAY['image/png'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "admin read d17-test-fixtures" ON storage.objects;
CREATE POLICY "admin read d17-test-fixtures" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'd17-test-fixtures' AND public.has_role(auth.uid(), 'admin'));
