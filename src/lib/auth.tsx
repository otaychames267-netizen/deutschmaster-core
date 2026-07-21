import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_REFERRAL_STORAGE_KEY } from "@/lib/referral-capture";

export type UserLevel = "TELC_B1" | "TELC_B2" | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  roleLoading: boolean;
  level: UserLevel;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  roleLoading: true,
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
  const [loading, setLoading]         = useState(true);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [level, setLevel]             = useState<UserLevel>(null);

  const currentUserIdRef = useRef<string | null>(null);
  const loadingRef       = useRef(true);
  const adminReqRef      = useRef(0);
  const referralLinkAttemptedRef = useRef(false);

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
          setRoleLoading(false);
        }
        return;
      }

      // Link a referral code captured at /register?ref=CODE (relayed via
      // localStorage across the email-confirmation gate, since no session
      // exists at signup time to call this RPC with) — once per app
      // lifetime, best-effort, never lets a referral hiccup affect login.
      if (!referralLinkAttemptedRef.current) {
        referralLinkAttemptedRef.current = true;
        try {
          const code = localStorage.getItem(PENDING_REFERRAL_STORAGE_KEY);
          if (code) {
            localStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
            // await, not .rpc(...).catch(...) — same missing-.catch() bug as
            // the server-side referral-conversion call sites (see
            // src/lib/d17/verify.functions.ts); it silently prevented the
            // request from ever firing here (the enclosing try/catch just
            // masked it as "localStorage unavailable").
            void (async () => {
              try {
                await (supabase as any).rpc("register_referral", { p_code: code });
              } catch { /* best-effort — a referral hiccup must never affect login */ }
            })();
          }
        } catch { /* localStorage unavailable — skip silently */ }
      }

      const req = ++adminReqRef.current;
      if (mounted) setRoleLoading(true);
      Promise.all([fetchIsAdmin(nextId), fetchLevel(nextId)]).then(([admin, lvl]) => {
        if (mounted && req === adminReqRef.current) {
          setIsAdmin(admin);
          setLevel(lvl);
          setRoleLoading(false);
        }
      });
    }

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (mounted) apply("INIT", sess);
    }).catch(() => {
      // getSession failed — don't hang the app; resolve loading so the gate can redirect.
      if (mounted && loadingRef.current) { setLoading(false); loadingRef.current = false; }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (mounted) apply(event, sess);
    });

    // Safety net: never let the app hang on the loading screen forever if the auth
    // check stalls (slow network, storage/lock issue). onAuthStateChange will still
    // update state later and self-heal if a session does resolve.
    const safety = setTimeout(() => {
      if (mounted && loadingRef.current) { setLoading(false); loadingRef.current = false; }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, roleLoading, level, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
