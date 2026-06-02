import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        const uid = sess.user.id;
        setTimeout(async () => {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
          setIsAdmin(!!data);
          // Track sign-in events (covers OAuth + password)
          if (event === "SIGNED_IN") {
            recordLoginSuccess(uid).catch(() => {});
          }
          expireOverdueSubscriptions().catch(() => {});
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
      if (sess?.user) {
        const uid = sess.user.id;
        supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle().then(({ data }) => setIsAdmin(!!data));
        expireOverdueSubscriptions().catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut: async () => { await supabase.auth.signOut(); } }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
