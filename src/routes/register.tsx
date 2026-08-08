import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthLayout } from "@/components/AuthLayout";
import { GoogleAuthButton, OrDivider } from "@/components/GoogleAuthButton";
import { getSiteUrl } from "@/lib/site-url";
import { PENDING_REFERRAL_STORAGE_KEY } from "@/lib/referral-capture";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
  ];
  if (!password) return null;
  return (
    <div className="mt-1.5 flex gap-3">
      {checks.map((c) => (
        <span key={c.label} className={`flex items-center gap-1 text-xs ${c.ok ? "text-emerald-500" : "text-muted-foreground"}`}>
          <CheckCircle2 className="h-3 w-3" /> {c.label}
        </span>
      ))}
    </div>
  );
}

function RegisterPage() {
  const { t } = useTranslation();

  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [accepted, setAccepted]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [done, setDone]           = useState(false);

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
    if (!accepted) {
      setError("Please accept the Terms of Service.");
      return;
    }

    // Capture ?ref=CODE now, before signup — this app requires email
    // confirmation, so there's no session yet to call register_referral()
    // with; the code is relayed via localStorage and linked on the user's
    // first real authenticated session instead (see auth.tsx).
    const refCode = new URLSearchParams(window.location.search).get("ref");
    if (refCode && refCode.trim()) {
      try { localStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, refCode.trim()); } catch { /* localStorage unavailable — referral capture skipped, never blocks signup */ }
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        email_redirect_to: `${getSiteUrl()}/dashboard`,
      }),
    });
    const resBody = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(res.status === 429 ? resBody.message : (resBody.message ?? "Could not create account."));
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <AuthLayout title="Check your email" subtitle={t("auth.verify_sent")}>
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              We sent a verification email to <strong className="text-foreground">{email}</strong>.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("auth.check_spam")}</p>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t("auth.back_to_login")}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.sign_up")} subtitle="Create your account to get started">
      <GoogleAuthButton />
      <OrDivider />
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Full name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="fullName">
            {t("auth.full_name")}
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            placeholder="Your full name"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            {t("auth.password")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
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
          <PasswordStrength password={password} />
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="confirm">
            {t("auth.confirm_password")}
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
            placeholder="••••••••"
          />
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
          />
          <span className="text-muted-foreground">
            {t("auth.accept_terms")}{" "}
            <Link to="/terms" className="text-primary hover:underline">Terms</Link>
            {" & "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("auth.sign_up")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t("auth.sign_in")}
        </Link>
      </p>
    </AuthLayout>
  );
}
