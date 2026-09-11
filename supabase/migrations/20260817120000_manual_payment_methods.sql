-- Two new manual (no-OCR) payment methods alongside the existing, hardened
-- D17 pipeline: Virement Postal and Virement Bancaire. Deliberately NOT
-- added to d17_orders — that table/pipeline is screenshot-OCR-specific
-- (attempts_used, rule engine, kill switches, session tokens for the
-- upload flow) and none of that applies here. These two methods are
-- simple: show instructions, student sends a receipt via WhatsApp, an
-- admin manually reviews and approves — same posture as the existing
-- admin_manual_subscription_action() tool, which this reuses for the
-- actual subscription grant (see src/lib/payment/manual-orders.functions.ts).
--
-- Explicitly separate table (not a d17_orders.method column) so the
-- existing D17 pipeline's columns/constraints/RLS/queries are never
-- touched by this change.

CREATE TABLE public.manual_payment_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code      plan_code NOT NULL,
  amount_tnd     numeric NOT NULL CHECK (amount_tnd >= 30),
  method         text NOT NULL CHECK (method IN ('postal', 'bancaire')),
  status         text NOT NULL DEFAULT 'pending_verification'
                   CHECK (status IN ('pending_verification', 'approved', 'rejected')),
  level          text,
  resolved_at    timestamptz,
  resolved_by    uuid REFERENCES auth.users(id),
  rejection_reason text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX manual_payment_orders_user_id_idx ON public.manual_payment_orders(user_id);
CREATE INDEX manual_payment_orders_status_idx ON public.manual_payment_orders(status) WHERE status = 'pending_verification';

ALTER TABLE public.manual_payment_orders ENABLE ROW LEVEL SECURITY;

-- Student: read/create only their own orders. No student UPDATE policy —
-- status transitions are admin-only, via SECURITY DEFINER server functions
-- (service-role), matching the D17 orders posture exactly.
CREATE POLICY "own manual payment orders select" ON public.manual_payment_orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_d17_staff(auth.uid()));

CREATE POLICY "own manual payment orders insert" ON public.manual_payment_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.manual_payment_orders TO authenticated;
