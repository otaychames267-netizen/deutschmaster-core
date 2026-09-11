import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

const CREDITS_CHANGED_EVENT = "credits:changed";

/** Call after any action that spends/refunds/grants credits so every mounted
 * useStudentCredits() instance (e.g. the header pill) picks up the new balance
 * without needing a shared store. */
export function notifyCreditsChanged() {
  window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
}

/** Student's essay-grading credit balance. Mirrors useUserProgress()'s shape. */
export function useStudentCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_my_credit_balance");
    if (!error && typeof data === "number") setBalance(data);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    window.addEventListener(CREDITS_CHANGED_EVENT, load);
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, load);
  }, [load]);

  return { balance, loading, refresh: load };
}
