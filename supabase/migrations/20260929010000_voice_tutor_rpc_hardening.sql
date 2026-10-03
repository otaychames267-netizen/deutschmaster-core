-- AI Voice Tutor Phase 1 hardening, found during verification testing:
--
-- 1. Neither deduct_voice_tutor_seconds() nor get_my_voice_tutor_cap_status()
--    ever had EXECUTE revoked from anon — both were only reachable by
--    `authenticated` in practice because deduct_voice_tutor_seconds happens
--    to check `auth.uid() IS NULL` internally. get_my_voice_tutor_cap_status
--    has no such check, so an anonymous caller currently gets back a silent,
--    harmless-looking (0, 2700) default row instead of a rejection — not a
--    data leak (nothing user-specific is exposed), but a real inconsistency
--    with its sibling function and with every other *_credits/status RPC in
--    this codebase (get_my_muendlich_credits, etc.), all of which reject
--    anon outright. Fixed the same way here.
CREATE OR REPLACE FUNCTION get_my_voice_tutor_cap_status(p_level TEXT DEFAULT 'TELC_B2')
RETURNS TABLE(seconds_used INT, seconds_remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;
  RETURN QUERY
    SELECT COALESCE(u.seconds_used, 0), 2700 - COALESCE(u.seconds_used, 0)
    FROM (SELECT 1) AS one_row
    LEFT JOIN voice_tutor_daily_usage u
      ON u.user_id = auth.uid() AND u.usage_date = CURRENT_DATE AND u.level = p_level;
END;
$$;

REVOKE EXECUTE ON FUNCTION deduct_voice_tutor_seconds(INT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION get_my_voice_tutor_cap_status(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION get_my_voice_tutor_cap_status(TEXT) TO authenticated;
