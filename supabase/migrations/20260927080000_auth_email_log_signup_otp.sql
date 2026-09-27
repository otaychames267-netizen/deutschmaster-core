-- Extends auth_email_log's email_type to cover the new code-based signup
-- flow (2026-09-27): 'signup_confirmation' (the old clickable-link email)
-- is replaced by 'signup_otp' (a short code typed back into the same
-- registration page) — see confirmation-email.server.ts's
-- createUserAndSendCode(). Old rows keep their 'signup_confirmation' value
-- unchanged; only new sends use the new label.
alter table public.auth_email_log drop constraint if exists auth_email_log_email_type_check;
alter table public.auth_email_log add constraint auth_email_log_email_type_check
  check (email_type in ('signup_confirmation', 'signup_otp', 'resend_confirmation', 'password_recovery'));
