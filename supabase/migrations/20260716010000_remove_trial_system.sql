-- Remove the free-trial system entirely per explicit user decision: "There
-- must be no trial subscription at all. Remove the trial system completely."
--
-- trial_claims backed ensureUserTrial (src/lib/trial.functions.ts, now
-- deleted) — confirmed via full-codebase grep that ensureUserTrial was never
-- called from any route/component, so no live user ever actually got a
-- trial subscription row through it. 0 rows in trial_claims, no FK
-- dependents — safe to drop outright.
DROP TABLE IF EXISTS public.trial_claims;

-- Deliberately NOT touched: subscription_status enum's 'trial' value and
-- subscriptions.is_trial column. Postgres enum-value removal requires
-- recreating the type and re-pointing every dependent column/policy/
-- function — real risk for near-zero benefit once nothing ever sets
-- status = 'trial' or is_trial = true again (confirmed: no remaining call
-- site does either, post trial.functions.ts deletion). Left dormant.
