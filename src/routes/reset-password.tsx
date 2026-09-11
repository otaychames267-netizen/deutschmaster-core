import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/AuthLayout";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

/**
 * Bug found in the 2026-07-18 final E2E audit: this page previously called
 * updateUser({password}) against WHATEVER session happened to be current,
 * with no check on why that session existed. If the browser already held a
 * different, unrelated, still-valid session (a prior login in the same
 * browser that hadn't expired — very easy to hit in normal use, e.g. testing
 * multiple accounts, or simply not having logged out), the password update
 * silently applied to THAT account instead of the one the email link was
 * for. The UI still showed "Password updated successfully" (the call did
 * succeed — just against the wrong account), which is exactly the reported
 * symptom: the OLD password keeps working on the intended account, because
 * its password was never actually touched.
 *
 * Fix: gate the form on the specific PASSWORD_RECOVERY auth event, not on
 * "a session exists". Supabase only fires PASSWORD_RECOVERY when it has just
 * processed real recovery tokens from the URL (the email link), so acting
 * only in response to that event guarantees updateUser() always targets the
 * account the link was actually issued for — never a stale unrelated session.
 */
type Phase = "checking" | "ready" | "invalid";

function ResetPasswordPage() {
  const { t } = useTranslation();
  const nav = useNavigate();

  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        done = true;
        setPhase("ready");
      }
    });
    // The recovery hash is processed asynchronously on client init; give it
    // a real window before concluding the link is invalid/expired.
    const timer = setTimeout(() => { if (!done) setPhase("invalid"); }, 6000);
    return () => { clearTimeout(timer); subscription.unsubscribe(); };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    toast.success("Password updated successfully.");
    // Sign out globally after a reset — forces every OTHER device/browser
    // session for this account to re-authenticate with the new password,
    // rather than silently continuing on the old one.
    await supabase.auth.signOut({ scope: "global" }).catch(() => {});
    nav({ to: "/login" });
  }

  if (phase === "checking") {
    return (
      <AuthLayout title="Verifying your link" subtitle="One moment…">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthLayout>
    );
  }

  if (phase === "invalid") {
    return (
      <AuthLayout title="Link invalid or expired" subtitle="This password reset link no longer works.">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">
            Reset links expire after a short time and can only be used once. Request a new one to continue.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            {t("auth.new_password")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="confirm">
            {t("auth.confirm_password")}
          </label>
          <input
            id="confirm"
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("auth.reset")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t("auth.back_to_login")}
        </Link>
      </p>
    </AuthLayout>
  );
}
