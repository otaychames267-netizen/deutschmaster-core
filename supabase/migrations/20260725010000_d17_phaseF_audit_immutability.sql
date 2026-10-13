-- D17 fraud-hardening Phase F: make the audit trail actually immutable.
-- d17_verification_attempts and d17_admin_actions are append-only by
-- application-code discipline only today — service_role still holds real
-- UPDATE/DELETE grants at the DB level, so a bug or a compromised
-- service-role credential could silently rewrite history an admin later
-- relies on to explain a decision. No legitimate code path updates or
-- deletes rows in either table (verified: every write site is a plain
-- .insert(), never .update()/.delete()) — INSERT stays untouched.

CREATE OR REPLACE FUNCTION public.reject_d17_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Table % is an append-only audit log — % is not permitted.', TG_TABLE_NAME, TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_d17_verification_attempts_immutable ON public.d17_verification_attempts;
CREATE TRIGGER trg_d17_verification_attempts_immutable
  BEFORE UPDATE OR DELETE ON public.d17_verification_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_d17_audit_mutation();

DROP TRIGGER IF EXISTS trg_d17_admin_actions_immutable ON public.d17_admin_actions;
CREATE TRIGGER trg_d17_admin_actions_immutable
  BEFORE UPDATE OR DELETE ON public.d17_admin_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_d17_audit_mutation();
