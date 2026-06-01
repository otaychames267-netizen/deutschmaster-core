import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(async () => {
          const { data } = await supabase.from("user_roles").select("role").eq("user_id", sess.user.id).eq("role", "admin").maybeSingle();
          setIsAdmin(!!data);
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
        supabase.from("user_roles").select("role").eq("user_id", sess.user.id).eq("role", "admin").maybeSingle().then(({ data }) => setIsAdmin(!!data));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut: async () => { await supabase.auth.signOut(); } }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
