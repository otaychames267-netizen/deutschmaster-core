-- D17 payment audit (2026-07-27): amount_tnd/price_tnd were only ever
-- implicitly >= 30 TND because every row in `plans` currently happens to be
-- priced that way — nothing at the database level actually prevented a
-- sub-30-TND plan or order from ever existing (a typo'd admin price edit, a
-- future promo/discount plan, or a direct insert would all have silently
-- succeeded). This makes the floor explicit and structural: no plan or order
-- can be created below 30.000 TND regardless of application code path.
ALTER TABLE public.plans
  ADD CONSTRAINT plans_price_tnd_min_30 CHECK (price_tnd >= 30.00);

ALTER TABLE public.d17_orders
  ADD CONSTRAINT d17_orders_amount_tnd_min_30 CHECK (amount_tnd >= 30.00);
