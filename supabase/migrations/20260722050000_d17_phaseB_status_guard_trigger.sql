-- D17 fraud-hardening Phase B: DB-level guard against an order's status
-- moving backward from a terminal state into an active one. Today every
-- write to d17_orders goes through application code (server functions using
-- the service-role client) which already never does this — this trigger is
-- defense-in-depth against a future bug or a compromised service-role
-- credential, mirroring the existing guard_profiles_role_change pattern
-- (20260715010000_d17_v4_role_escalation_guard.sql), except deliberately
-- WITHOUT that migration's `auth.uid() IS NULL` service-role bypass: D17
-- order writes are ALWAYS service-role in this app (no RLS policy grants
-- students write access to d17_orders at all), so bypassing service-role
-- here would make the trigger enforce nothing in practice. No legitimate
-- code path today needs to reopen a terminal order — if one is ever added
-- (an explicit "admin reset"), it should go through a dedicated, audited
-- RPC that this trigger is deliberately made to reject by default.

CREATE OR REPLACE FUNCTION public.guard_d17_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  terminal_statuses public.d17_order_status[] := ARRAY['auto_approved', 'admin_approved', 'rejected', 'expired']::public.d17_order_status[];
  active_statuses public.d17_order_status[] := ARRAY['awaiting_payment', 'under_review', 'manual_review']::public.d17_order_status[];
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status = ANY(terminal_statuses)
     AND NEW.status = ANY(active_statuses) THEN
    RAISE EXCEPTION 'Cannot move D17 order % from terminal status % back to %.', OLD.id, OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_d17_order_status_transition ON public.d17_orders;
CREATE TRIGGER trg_guard_d17_order_status_transition
  BEFORE UPDATE ON public.d17_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_d17_order_status_transition();
