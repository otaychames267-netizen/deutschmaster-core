-- Legacy 'premium' plan (full access, granted as the 3-day trial plan) still held
-- the old 40 TND price. Align it to the canonical full-access price (60 TND = Komplett)
-- so no stale/conflicting price remains anywhere in the database.
UPDATE public.plans SET price_tnd = 60 WHERE code = 'premium';
