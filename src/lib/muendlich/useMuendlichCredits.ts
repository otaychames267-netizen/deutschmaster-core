import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface MuendlichCredits {
  isSubscribed: boolean;
  minutesBalance: number;
  windowExpiresAt: string | null;
}

/** Live top-bar minute counter — polls the existing get_my_muendlich_credits()
 * RPC (own-eyes-only by construction: it reads auth.uid() server-side). */
export function useMuendlichCredits(pollMs = 20_000) {
  const [credits, setCredits] = useState<MuendlichCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await db.rpc("get_my_muendlich_credits");
    // Multi-OUT-param functions come back from PostgREST as a one-row array
    // (unlike single-scalar RPCs like get_my_credit_balance, which return a
    // bare value) — confirmed against the real network response, not assumed.
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setCredits({ isSubscribed: row.is_subscribed, minutesBalance: row.minutes_balance, windowExpiresAt: row.window_expires_at });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
  }, [refresh, pollMs]);

  return { credits, loading, refresh };
}
