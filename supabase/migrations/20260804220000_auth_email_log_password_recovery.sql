-- Extends auth_email_log's email_type to cover password recovery.
--
-- Root cause (investigated 2026-08-04): "Error sending recovery email" on
-- /forgot-password reproduced directly against the Auth API as a raw 500
-- {"error_code":"unexpected_failure","msg":"Error sending recovery email"}.
-- The Auth service log for that exact request showed the real underlying
-- cause: `"error":"535 \"Authentication credentials invalid\""` — Supabase
-- Auth's own SMTP relay (smtp.resend.com) is rejecting whatever credential
-- is configured as smtp_pass. This is the SAME root cause already
-- documented in confirmation-email.server.ts's header comment from
-- 2026-07-29 (Resend rejected that smtp_pass outright), and the Management
-- API's PATCH for that one field is documented there as unreliable
-- (silent no-ops / wipes). Signup confirmation was migrated off Supabase's
-- native mailer for exactly this reason; password recovery was the one
-- flow never migrated. This migration is step 1 of doing the same for it —
-- see src/lib/auth/confirmation-email.server.ts's sendPasswordRecoveryEmail
-- and src/routes/api.auth.forgot-password.ts.
alter table public.auth_email_log drop constraint if exists auth_email_log_email_type_check;
alter table public.auth_email_log add constraint auth_email_log_email_type_check
  check (email_type in ('signup_confirmation', 'resend_confirmation', 'password_recovery'));
