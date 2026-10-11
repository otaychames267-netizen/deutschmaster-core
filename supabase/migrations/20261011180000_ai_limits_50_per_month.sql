-- Owner 2026-10-11: the AI Sprachtrainer allowance goes from 1 session/day + 30/month to 2/day + 50/month (100 over the 2-month pack), and the per-student monthly
-- spend ceiling of the 1:1 mode from 5 to 8 USD. Measured cost of one full 1:1 session incl. the report is ~0.117 USD (worst seen 0.13): 50 sessions = ~5.9 USD,
-- which the old 5 USD ceiling would have cut off at ~43 sessions. The ceiling check is spent_this_month + worst_session(0.27) <= budget (see
-- 20261008110000_muendlich_ai_budget_per_mode.sql), so 8 USD admits all 50 sessions up to ~0.155 USD each on average — and still bounds the cost per student.
-- The 2:1 mode (hidden from students) keeps its own 5 USD ceiling; the daily/monthly counts are shared keys but counted per mode.
INSERT INTO public.platform_settings (key, value) VALUES
  ('muendlich_ai_monthly_limit', '50'::jsonb),
  ('muendlich_ai_daily_limit', '2'::jsonb),
  ('muendlich_ai_budget_usd_one_to_one', '8'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
