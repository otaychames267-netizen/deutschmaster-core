-- Owner 2026-10-11: tier names. Schriftlich (+ Mündlich, ohne KI) is now shown as "Gold", the Komplett plan with the KI-Sprachtrainer (code komplett_ai) as "Platinum".
-- Only the DISPLAY names change (plans.name is read by admin screens); plan codes, prices, access rules and every existing subscription are untouched. The legacy
-- 'komplett' (no AI), 'muendlich' and 'premium' plans keep their names so they are not confused with the sold tiers.
UPDATE public.plans SET name = 'Gold' WHERE code::text = 'schriftlich';
UPDATE public.plans SET name = 'Platinum' WHERE code::text = 'komplett_ai';
