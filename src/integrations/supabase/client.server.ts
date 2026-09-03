// Server-side Supabase client with service role key — bypasses RLS.
// Use only for admin operations in server functions and routes.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { sanitizeEnvValue } from '@/lib/env-guard';

function createSupabaseAdminClient() {
  const RAW_SUPABASE_URL = process.env.SUPABASE_URL;
  const RAW_SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!RAW_SUPABASE_URL || !RAW_SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!RAW_SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!RAW_SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ];
    // Full detail goes to server logs only (console.error, never client-visible).
    // The thrown message is what TanStack Start serializes verbatim into the
    // failed request's network response body for ANY caller, so it must never
    // contain env var names or setup instructions.
    console.error(`[Supabase Admin] Missing server environment variable(s): ${missing.join(', ')}. Add them to your .env file.`);
    throw new Error('Service temporarily unavailable. Please try again later.');
  }

  let SUPABASE_URL: string;
  let SUPABASE_SERVICE_ROLE_KEY: string;
  try {
    SUPABASE_URL = sanitizeEnvValue('SUPABASE_URL', RAW_SUPABASE_URL);
    SUPABASE_SERVICE_ROLE_KEY = sanitizeEnvValue('SUPABASE_SERVICE_ROLE_KEY', RAW_SUPABASE_SERVICE_ROLE_KEY);
  } catch (error) {
    console.error(`[Supabase Admin] ${(error as Error).message}`);
    throw new Error('Service temporarily unavailable. Please try again later.');
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
