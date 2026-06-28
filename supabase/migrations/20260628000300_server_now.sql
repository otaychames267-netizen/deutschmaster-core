-- Authoritative server clock for synchronized countdown (clients compute offset).
CREATE OR REPLACE FUNCTION server_now() RETURNS timestamptz LANGUAGE sql STABLE AS $$ SELECT now() $$;
GRANT EXECUTE ON FUNCTION server_now() TO authenticated;
