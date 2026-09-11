-- SECURITY FIX: the six "*_student" views (hoeren_statements_student,
-- sb_t1_gaps_student, sb_t2_gaps_student, lesen_t1_texts_student,
-- lesen_t2_questions_student, lesen_t3_situations_student) were created
-- before plan-scoped content gating (20260716020000) existed, and were never
-- updated to respect it. Postgres views without security_invoker execute
-- with the VIEW OWNER's privileges, not the querying role's — so these
-- views bypassed the "auth read <table>" RLS policies entirely and served
-- real exam content (statement text, gap options, reading passages) to ANY
-- authenticated user regardless of subscription plan, confirmed empirically
-- against the live DB with a zero-subscription probe account.
--
-- Fix: set security_invoker = true (Postgres 15+ / Supabase-supported) so
-- each view evaluates RLS as the calling user, inheriting the same
-- has_plan_access() gating already enforced on the underlying base tables.
ALTER VIEW public.hoeren_statements_student   SET (security_invoker = true);
ALTER VIEW public.sb_t1_gaps_student          SET (security_invoker = true);
ALTER VIEW public.sb_t2_gaps_student          SET (security_invoker = true);
ALTER VIEW public.lesen_t1_texts_student      SET (security_invoker = true);
ALTER VIEW public.lesen_t2_questions_student  SET (security_invoker = true);
ALTER VIEW public.lesen_t3_situations_student SET (security_invoker = true);
