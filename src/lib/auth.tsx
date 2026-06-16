import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { recordLoginSuccess, expireOverdueSubscriptions } from "@/lib/session-tracking";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ user: null, session: null, loading: true, isAdmin: false, signOut: async () => {} });

async function checkAdmin(userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);
  const loadingRef = useRef(true);
  const adminRequestRef = useRef(0);
  const loginRecordedForRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const setAuthLoading = (value: boolean) => {
      loadingRef.current = value;
      if (mounted) setLoading(value);
    };

    const applySession = (event: AuthChangeEvent | "SESSION_FALLBACK", sess: Session | null) => {
      const nextUser = sess?.user ?? null;
      const nextUserId = nextUser?.id ?? null;

      console.debug("[Lingovia diagnostics] Auth event", {
        event,
        userId: nextUserId,
        ignored: event === "TOKEN_REFRESHED" || (!loadingRef.current && currentUserIdRef.current === nextUserId && event !== "USER_UPDATED"),
      });

      if (event === "TOKEN_REFRESHED") return;
      if (!loadingRef.current && currentUserIdRef.current === nextUserId && event !== "USER_UPDATED") return;

      currentUserIdRef.current = nextUserId;
      setSession(sess);
      setUser(nextUser);
      setAuthLoading(false);

      if (!nextUserId) {
        loginRecordedForRef.current = null;
        setIsAdmin(false);
        return;
      }

      const requestId = ++adminRequestRef.current;
      setTimeout(async () => {
        const admin = await checkAdmin(nextUserId);
        if (mounted && requestId === adminRequestRef.current) setIsAdmin(admin);
        if (event === "SIGNED_IN" && loginRecordedForRef.current !== nextUserId) {
          loginRecordedForRef.current = nextUserId;
          recordLoginSuccess(nextUserId).catch(() => {});
        }
        expireOverdueSubscriptions().catch(() => {});
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      applySession(event, sess);
    });

    const fallbackTimer = window.setTimeout(() => {
      if (!loadingRef.current) return;
      supabase.auth.getSession().then(({ data: { session: sess } }) => applySession("SESSION_FALLBACK", sess));
    }, 1200);

    return () => {
      mounted = false;
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut: async () => { await supabase.auth.signOut(); } }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
