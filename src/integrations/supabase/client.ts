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
      // supabase-js 2.106 forwards an undefined lockAcquireTimeout to auth-js, which overrides auth-js's own 5 s default — and a navigator-lock acquire with no timeout waits FOREVER.
      // Reproduced 2026-10-16: with a second tab of the site holding the auth lock (stuck refresh on a bad mobile network, frozen background tab) every other tab — including the
      // Google /auth/callback page — sat on 'Signing you in…' indefinitely, and so would any page's first getSession(). With an explicit timeout auth-js gives up waiting and steals
      // the orphaned lock.
      lockAcquireTimeout: 5000,
    },
    // The lock is held for the whole duration of a token refresh / session lookup, and a request over a flaky mobile network that never answers (no timeout in fetch) keeps it held until the
    // browser gives up — minutes. Every other tab then waits behind it. Auth calls get a hard ceiling so a hung request fails (and is retried by auth-js) instead of pinning the lock.
    global: { fetch: authSafeFetch },
  });
}

const AUTH_FETCH_TIMEOUT_MS = 30_000;

function authSafeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.includes('/auth/v1/')) return fetch(input, init);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), AUTH_FETCH_TIMEOUT_MS);
  const outer = init?.signal;
  if (outer) {
    if (outer.aborted) ctrl.abort();
    else outer.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
