-- Client / SSR error log. Until now a crash only showed "Something went wrong" on the student's screen and a console line nobody saw, so the
-- cause of the reports from "some subscribers" could not be found. Written by the app's root error boundary, the failed-chunk handler and the
-- SSR error page; read by staff only. Writes go through log_client_error (truncates, de-duplicates and caps the volume), never directly.

CREATE TABLE IF NOT EXISTS public.client_error_log (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid,
  kind        text NOT NULL CHECK (kind IN ('boundary', 'chunk', 'window', 'ssr')),
  path        text,
  message     text NOT NULL,
  stack       text,
  user_agent  text,
  context     jsonb
);
CREATE INDEX IF NOT EXISTS client_error_log_created_idx ON public.client_error_log (created_at DESC);
CREATE INDEX IF NOT EXISTS client_error_log_message_idx ON public.client_error_log (kind, message);

ALTER TABLE public.client_error_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_error_log_staff_read ON public.client_error_log;
CREATE POLICY client_error_log_staff_read ON public.client_error_log FOR SELECT TO authenticated USING (public.is_d17_staff(auth.uid()));
-- no INSERT / UPDATE / DELETE policy: nobody writes except through the RPC below (and the service role)

CREATE OR REPLACE FUNCTION public.log_client_error(
  p_kind    text,
  p_path    text,
  p_message text,
  p_stack   text  DEFAULT NULL,
  p_context jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ua  text;
  v_msg text := left(coalesce(p_message, ''), 600);
  v_path text := left(coalesce(p_path, ''), 200);
BEGIN
  IF length(trim(v_msg)) = 0 OR p_kind IS NULL OR p_kind NOT IN ('boundary', 'chunk', 'window', 'ssr') THEN
    RETURN;
  END IF;
  -- volume cap: a bug that fires in a loop (or abuse of this public RPC) can never fill the table
  IF (SELECT count(*) FROM public.client_error_log AS l WHERE l.created_at > now() - interval '10 minutes') >= 300 THEN
    RETURN;
  END IF;
  -- same user + same error + same page within 10 minutes = one row
  IF EXISTS (
    SELECT 1 FROM public.client_error_log AS l
    WHERE l.created_at > now() - interval '10 minutes' AND l.kind = p_kind AND l.message = v_msg
      AND l.path IS NOT DISTINCT FROM v_path AND l.user_id IS NOT DISTINCT FROM v_uid
  ) THEN
    RETURN;
  END IF;
  BEGIN
    v_ua := left((current_setting('request.headers', true)::json) ->> 'user-agent', 300);
  EXCEPTION WHEN OTHERS THEN
    v_ua := NULL;
  END;
  INSERT INTO public.client_error_log (user_id, kind, path, message, stack, user_agent, context)
  VALUES (v_uid, p_kind, v_path, v_msg, left(p_stack, 2500), v_ua, p_context);
END;
$$;
REVOKE ALL ON FUNCTION public.log_client_error(text, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_client_error(text, text, text, text, jsonb) TO anon, authenticated;
