import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { sanitizeEnvValue } from '@/lib/env-guard';

function createSupabaseClient() {
  const RAW_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const RAW_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!RAW_SUPABASE_URL || !RAW_SUPABASE_ANON_KEY) {
    const missing = [
      ...(!RAW_SUPABASE_URL ? ['VITE_SUPABASE_URL'] : []),
      ...(!RAW_SUPABASE_ANON_KEY ? ['VITE_SUPABASE_ANON_KEY'] : []),
    ];
    throw new Error(`Missing environment variable(s): ${missing.join(', ')}. Add them to your .env file.`);
  }

  const SUPABASE_URL = sanitizeEnvValue('VITE_SUPABASE_URL', RAW_SUPABASE_URL);
  const SUPABASE_ANON_KEY = sanitizeEnvValue('VITE_SUPABASE_ANON_KEY', RAW_SUPABASE_ANON_KEY);

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
