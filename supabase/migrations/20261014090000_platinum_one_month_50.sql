-- Owner decision 2026-10-14 ("muendlich platinium khaliha 50 dinar wle tougher lbe9i"): Platinum (komplett_ai) 1 month = 50 TND; everything else unchanged
-- (Platinum 2 months = 86, 3 months = 122; Gold 30 / 50 / 70).
-- Pack list prices stay genuine = months x the 1-month price (the student could really pay 2 x 50 / 3 x 50), so the strike-through remains honest: 100 / 150.
--
-- ROLLBACK (previous values):
--   UPDATE public.plans SET price_tnd = 47, list_price_tnd_2m = 94, list_price_tnd_3m = 141 WHERE code::text = 'komplett_ai';

UPDATE public.plans SET price_tnd = 50, list_price_tnd_2m = 100, list_price_tnd_3m = 150
 WHERE code::text = 'komplett_ai';
