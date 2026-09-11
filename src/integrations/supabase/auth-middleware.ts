import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  // Empirically verified (probe script against a disposable test user) that
  // using the service-role key here does NOT bypass RLS: PostgREST derives
  // the acting Postgres role from the JWT in the Authorization header below
  // (always overridden to the caller's own token), not from this client's
  // base key/apikey header. Still switched to the real anon key — the
  // service-role secret has no reason to be attached to every authenticated
  // request, and the old name (SUPABASE_ANON_KEY holding the service-role
  // value) was actively misleading for anyone reading this file.
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_ANON_KEY ? ["SUPABASE_ANON_KEY"] : []),
    ];
    console.error(`[auth-middleware] Missing server environment variable(s): ${missing.join(", ")}. Add them to your .env file.`);
    throw new Error("Service temporarily unavailable. Please try again later.");
  }

  const request = getRequest();

  if (!request?.headers) {
    throw new Error("Unauthorized");
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) {
    throw new Error("Unauthorized");
  }

  return next({
    context: {
      supabase,
      userId: userData.user.id,
      claims: userData.user,
    },
  });
});
