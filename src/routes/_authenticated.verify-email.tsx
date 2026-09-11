import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { resendConfirmationEmail } from "@/lib/auth/resend-confirmation.functions";
import { useTheme } from "@/lib/theme";
import { GraduationCap, Loader2, Moon, Sun, MailCheck, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/verify-email")({
  component: VerifyEmailPage,
});

/** Holding page for signed-in users whose email is not yet confirmed. Gated in
 * from _authenticated.tsx — nobody without a session reaches this route, and
 * confirmed users are bounced straight past it. Polls for confirmation so a
 * user who verifies in another tab is let in without a manual reload. */
function VerifyEmailPage() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown]   = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        if (pollRef.current) clearInterval(pollRef.current);
        nav({ to: "/dashboard", replace: true });
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [nav]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    if (!user?.email || resending || cooldown > 0) return;
    setResending(true);
    try {
      await resendConfirmationEmail();
      toast.success("Verification email sent.");
      setCooldown(30);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend the email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold text-foreground">AuraLingovia</span>
        </div>
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Confirm your email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a verification link to{" "}
            <strong className="text-foreground">{user?.email}</strong>. Click it to
            unlock your account — this page will continue automatically.
          </p>

          <button
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {resending && <Loader2 className="h-4 w-4 animate-spin" />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
          </button>

          <button
            onClick={() => void signOut()}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
