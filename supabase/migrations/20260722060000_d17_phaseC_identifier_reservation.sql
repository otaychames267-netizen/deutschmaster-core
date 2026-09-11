-- D17 fraud-hardening Phase C: close a real TOCTOU race in authorization-
-- number/reference duplicate detection. findDuplicate() (duplicate-check.
-- server.ts) was a plain SELECT-before-INSERT with no lock — two
-- near-simultaneous submissions of the same identifier from different
-- orders could both pass the "no duplicate found" check before either
-- attempt row existed, exactly the class of race the attempt-cap trigger
-- (20260715020000_d17_v4_atomic_attempt_cap.sql) was already fixed for
-- elsewhere in this same pipeline.
--
-- A plain unique index alone can't close this atomically from application
-- code (the check and the eventual attempt-row insert are two separate
-- round trips, with OCR work in between). Instead: a dedicated reservation
-- table with a unique constraint on the normalized identifier, claimed via
-- a single atomic `INSERT ... ON CONFLICT DO NOTHING` — the unique index
-- itself is what makes two concurrent claims for the same identifier
-- resolve to exactly one winner, not any locking the application does.

CREATE TABLE public.d17_identifier_reservations (
  normalized_identifier text PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.d17_orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reserved_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.d17_identifier_reservations IS
  'One row per D17 authorization number ever submitted, claimed atomically via reserve_d17_identifier(). Never expires — an authorization number is globally unique forever, matching duplicate-check.server.ts''s existing unbounded (non-time-windowed) exact-identifier lookups.';

ALTER TABLE public.d17_identifier_reservations ENABLE ROW LEVEL SECURITY;
-- Internal pipeline primitive only — no client ever reads or writes this
-- table directly, only via the SECURITY DEFINER RPC below and admin/service
-- tooling.
GRANT ALL ON public.d17_identifier_reservations TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_d17_identifier(
  p_normalized_identifier text,
  p_order_id uuid,
  p_user_id uuid
) RETURNS TABLE(reserved boolean, held_by_order_id uuid, held_by_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.d17_identifier_reservations;
BEGIN
  INSERT INTO public.d17_identifier_reservations (normalized_identifier, order_id, user_id)
  VALUES (p_normalized_identifier, p_order_id, p_user_id)
  ON CONFLICT (normalized_identifier) DO NOTHING
  RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_row.order_id, v_row.user_id;
    RETURN;
  END IF;

  -- Someone already holds it. Re-reserving from the SAME order (a legitimate
  -- retry after a transient system failure — see verify.functions.ts's
  -- fail-closed AI-error handling, which never writes an attempt row and so
  -- never consumes an attempt slot) is a no-op success, not a conflict. A
  -- genuinely different order is blocked.
  SELECT * INTO v_row FROM public.d17_identifier_reservations WHERE normalized_identifier = p_normalized_identifier;
  IF v_row.order_id = p_order_id THEN
    RETURN QUERY SELECT true, v_row.order_id, v_row.user_id;
  ELSE
    RETURN QUERY SELECT false, v_row.order_id, v_row.user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_d17_identifier(text, uuid, uuid) TO service_role;

-- Audit/admin-display column: what normalized identifier this attempt's
-- reservation (if any) was filed under. Populated alongside the reservation
-- call, not by a trigger — keeps the write path in one place (verify.functions.ts).
ALTER TABLE public.d17_verification_attempts
  ADD COLUMN IF NOT EXISTS normalized_identifier text;
