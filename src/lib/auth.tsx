import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserLevel = "TELC_B1" | "TELC_B2" | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  level: UserLevel;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  level: null,
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

async function fetchLevel(userId: string): Promise<UserLevel> {
  const { data } = await supabase
    .from("profiles")
    .select("level")
    .eq("id", userId)
    .maybeSingle();
  return (data?.level as UserLevel) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [level, setLevel]     = useState<UserLevel>(null);

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
        if (mounted) {
          setIsAdmin(false);
          setLevel(null);
        }
        return;
      }

      const req = ++adminReqRef.current;
      Promise.all([fetchIsAdmin(nextId), fetchLevel(nextId)]).then(([admin, lvl]) => {
        if (mounted && req === adminReqRef.current) {
          setIsAdmin(admin);
          setLevel(lvl);
        }
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
    <AuthContext.Provider value={{ user, session, loading, isAdmin, level, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
