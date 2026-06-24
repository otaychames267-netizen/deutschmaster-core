import { Link } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";
import { Moon, Sun, GraduationCap, CheckCircle2, Shield, Clock } from "lucide-react";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const PANEL_FEATURES = [
  "Full access during your 3-day trial",
  "Every TELC B1 & B2 exam section",
  "Prüfungssimulation with instant scoring",
  "Available in 7 languages",
];

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left panel — branding ────────────────────────────── */}
      <div className="relative hidden flex-1 overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-10">
        {/* Decorative gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,oklch(0.5_0.18_264/0.4),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,oklch(0.78_0.14_82/0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_30%_50%_at_10%_70%,oklch(0.68_0.15_248/0.12),transparent)]" />

        {/* Dot-grid decoration */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">AuraLingovia</span>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          {/* Quote */}
          <blockquote>
            <p className="text-xl font-medium leading-relaxed text-white/90">
              "AuraLingovia is the only platform that covers every part of the
              TELC exam with authentic content — and the analytics are incredible."
            </p>
            <footer className="mt-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white ring-1 ring-white/20">
                AR
              </div>
              <div>
                <p className="text-sm font-medium text-white">Amina R.</p>
                <p className="text-xs text-white/50">Passed TELC B2 · March 2026</p>
              </div>
            </footer>
          </blockquote>

          {/* Feature checklist */}
          <ul className="space-y-2.5">
            {PANEL_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-white/50" />
                {f}
              </li>
            ))}
          </ul>

          {/* Trust row */}
          <div className="flex items-center gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Bank-grade security</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Instant access</span>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────── */}
      <div className="flex flex-1 flex-col lg:max-w-[520px]">
        {/* Top bar */}
        <div className="flex items-center justify-between p-6">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">AuraLingovia</span>
          </Link>
          <div className="hidden lg:block" />

          <button
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 pb-10 pt-2">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && (
                <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Protected by Supabase Auth · Payments by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
