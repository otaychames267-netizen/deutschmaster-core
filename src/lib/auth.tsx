import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const currentUserIdRef = useRef<string | null>(null);
  const loadingRef       = useRef(true);
  const adminReqRef      = useRef(0);

  useEffect(() => {
    let mounted = true;

    function apply(event: AuthChangeEvent | "INIT", sess: Session | null) {
      const nextId = sess?.user?.id ?? null;
      if (event === "TOKEN_REFRESHED") return;
      if (!loadingRef.current && currentUserIdRef.current === nextId && event !== "USER_UPDATED") return;

      currentUserIdRef.current = nextId;
      if (mounted) {
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);
        loadingRef.current = false;
      }

      if (!nextId) {
        if (mounted) setIsAdmin(false);
        return;
      }

      const req = ++adminReqRef.current;
      fetchIsAdmin(nextId).then((admin) => {
        if (mounted && req === adminReqRef.current) setIsAdmin(admin);
      });
    }

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (mounted) apply("INIT", sess);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (mounted) apply(event, sess);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
