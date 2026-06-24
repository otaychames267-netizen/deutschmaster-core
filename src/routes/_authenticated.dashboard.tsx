import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Headphones, PenLine, Mic,
  ChevronRight, TrendingUp, Target, Clock, Flame,
  Zap, AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

interface Profile {
  full_name: string | null;
  level: string | null;
  onboarding_completed: boolean;
}

interface Subscription {
  status: string;
  plan_code: string;
  expires_at: string;
}

const QUICK_ACCESS = [
  {
    label: "Lesen",
    description: "Reading comprehension",
    icon: BookOpen,
    colorClass: "bg-blue-500/10 text-blue-500",
    to: "/schriftlich/vorbereitung/lesen/teil-1",
  },
  {
    label: "Hören",
    description: "Listening exercises",
    icon: Headphones,
    colorClass: "bg-violet-500/10 text-violet-500",
    to: "/schriftlich/vorbereitung/hoeren/teil-1",
  },
  {
    label: "Schreiben",
    description: "Writing practice",
    icon: PenLine,
    colorClass: "bg-amber-500/10 text-amber-500",
    to: "/schriftlich/vorbereitung/schreiben/beschwerde",
  },
  {
    label: "Mündlich",
    description: "Speaking simulation",
    icon: Mic,
    colorClass: "bg-rose-500/10 text-rose-500",
    to: "/muendlich/vorbereitung",
  },
];

function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [profile, setProfile]           = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [profileRes, subRes] = await Promise.all([
        supabase.from("profiles").select("full_name, level, onboarding_completed").eq("id", user.id).maybeSingle(),
        supabase
          .from("subscriptions")
          .select("status, plan_code, expires_at")
          .eq("user_id", user.id)
          .in("status", ["active", "trial"])
          .order("expires_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setProfile(profileRes.data);
      setSubscription(subRes.data);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const firstName = profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const levelBadge = profile?.level === "TELC_B1" ? "B1" : profile?.level === "TELC_B2" ? "B2" : null;
  const hasSubscription = !!subscription;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t("dashboard.welcome")}, {firstName} 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {levelBadge
              ? `Preparing for TELC ${levelBadge} — keep going.`
              : "Choose your level to get started."}
          </p>
        </div>
        {levelBadge && (
          <span className="inline-flex h-7 items-center rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary">
            TELC {levelBadge}
          </span>
        )}
      </div>

      {/* Subscription alert */}
      {!hasSubscription && !loading && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-foreground">Start your free 3-day trial</p>
            <p className="mt-0.5 text-muted-foreground">
              Unlock all practice exams and simulations.
            </p>
          </div>
          <Link
            to="/billing"
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: t("dashboard.streak"), value: "0", icon: Flame, color: "text-orange-500" },
          { label: t("dashboard.exams_done"), value: "0", icon: Target, color: "text-blue-500" },
          { label: t("dashboard.avg_score"), value: "—", icon: TrendingUp, color: "text-emerald-500" },
          { label: "Study time", value: "0h", icon: Clock, color: "text-violet-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick access */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Quick access</h2>
          <Link to="/schriftlich/vorbereitung" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            {t("dashboard.view_all")} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACCESS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.colorClass}`}>
                <item.icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="truncate text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>

      {/* Prüfungssimulation CTA */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_50%,oklch(0.5_0.18_264/0.08),transparent)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-gold" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Full simulation
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Prüfungssimulation</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete a full TELC exam under realistic conditions — timed, structured, scored.
            </p>
          </div>
          <Link
            to="/schriftlich/pruefung"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-0.5"
          >
            Start simulation <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
