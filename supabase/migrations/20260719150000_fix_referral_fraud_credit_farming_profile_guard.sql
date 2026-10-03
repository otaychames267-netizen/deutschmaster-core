-- Three fixes from the pre-launch adversarial audit (2026-07-19), each a
-- real exploitable gap confirmed via code/data-flow tracing.

-- ============================================================
-- 1) referrals_insert_own is a stale client-writable INSERT policy that
-- only constrains referred_id, leaving referrer_id fully attacker-
-- controlled. register_referral(p_code) (20260718020000_ban_referral_
-- audit.sql) is the real, validated path — it's the only thing the app
-- code calls (src/lib/auth.tsx:95) and the only thing that was ever meant
-- to create referral rows. The old table-level policy was never dropped
-- when register_referral() was introduced. A user could otherwise insert
-- {referrer_id: <any-uuid>, referred_id: auth.uid(), status:'pending'}
-- directly, which process_referral_conversion() would later find and use
-- to grant that referrer_id real subscription-extension days — the same
-- "forge a row, let a trusted downstream function act on it" pattern
-- already fixed for d17_orders (20260717020000).
DROP POLICY IF EXISTS "referrals_insert_own" ON public.referrals;

-- ============================================================
-- 2) refund_essay_credit(uuid) only checked auth.uid() = p_user_id, with
-- no link to any actual failed/refundable grading event — any user could
-- call it repeatedly to inflate their own essay-grading credit balance
-- without limit, bypassing the paid credit system entirely. Its one real
-- caller (src/routes/api.schreiben.grade-essay.ts:119) invokes it via the
-- user's own session (not service_role) specifically to compensate a
-- credit that was deducted moments earlier when the AI grading call then
-- failed — so the fix can't simply require service_role. Instead, cap
-- refunds to never exceed the count of genuine 'essay_grading' deductions
-- ever recorded for that user: a user can claw back credits they actually
-- spent (the legitimate case), but can never manufacture new ones beyond
-- that ceiling.
CREATE OR REPLACE FUNCTION public.refund_essay_credit(p_user_id uuid, p_reason text DEFAULT 'essay_grading_refund')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deductions int;
  v_refunds    int;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT count(*) INTO v_deductions FROM public.credit_transactions
    WHERE user_id = p_user_id AND reason = 'essay_grading' AND delta = -1;
  SELECT count(*) INTO v_refunds FROM public.credit_transactions
    WHERE user_id = p_user_id AND reason = 'essay_grading_refund' AND delta = 1;

  IF v_refunds >= v_deductions THEN
    RAISE EXCEPTION 'No outstanding essay-grading deduction to refund';
  END IF;

  UPDATE public.student_credits
    SET balance = balance + 1, updated_at = now()
    WHERE user_id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, delta, reason)
    VALUES (p_user_id, 1, p_reason);
END;
$$;
GRANT EXECUTE ON FUNCTION public.refund_essay_credit(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_essay_credit(uuid, text) FROM anon;

-- ============================================================
-- 3) profiles.suspended was never added to the self-escalation guard
-- trigger, unlike role/is_admin/is_banned (both already fixed for the
-- same underlying "no WITH CHECK on profiles_update_own" gap in
-- 20260715010000 and 20260718020000). No current app code reads this
-- column (confirmed via grep — all real suspension checks go through
-- subscriptions.status), so this isn't live-exploitable today, but it's
-- the same unremediated shape of bug the team has already fixed twice for
-- sibling columns, and costs nothing to close now.
CREATE OR REPLACE FUNCTION public.guard_profiles_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
     OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
     OR NEW.suspended IS DISTINCT FROM OLD.suspended THEN
    IF auth.uid() IS NOT NULL
       AND NOT public.has_role(auth.uid(), 'admin'::app_role)
       AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
      RAISE EXCEPTION 'Only admins can change role, is_admin, is_banned, or suspended.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
