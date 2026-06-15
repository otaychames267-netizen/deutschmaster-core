import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Lock, CheckCircle2 } from "lucide-react";

export function useTelcLevel() {
  const { user } = useAuth();
  const [level, setLevel] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("level").eq("id", user.id).maybeSingle()
      .then(({ data }) => setLevel(data?.level ?? null));
  }, [user]);
  return level === "TELC_B2" ? "TELC B2" : level === "TELC_B1" ? "TELC B1" : "—";
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  backTo,
  backLabel,
  breadcrumbs,
}: {
  icon: any;
  title: string;
  subtitle: string;
  backTo?: string;
  backLabel?: string;
  breadcrumbs?: { label: string; to?: string }[];
}) {
  const level = useTelcLevel();
  return (
    <div className="space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
              {b.to ? (
                <Link to={b.to} className="hover:text-foreground transition">{b.label}</Link>
              ) : (
                <span className="text-foreground font-medium">{b.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {backTo && (
        <Link to={backTo} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
          <ChevronLeft className="h-3.5 w-3.5" /> {backLabel ?? "Zurück"}
        </Link>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-accent/15 p-3 text-accent ring-1 ring-accent/30 shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">{level}</Badge>
      </div>
    </div>
  );
}

export function ChoiceCard({
  to,
  icon: Icon,
  title,
  desc,
  badge,
}: {
  to: string;
  icon: any;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-6 transition hover:border-accent/60 hover:shadow-xl hover:-translate-y-0.5"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/20 transition" />
      <div className="relative space-y-3">
        <div className="rounded-lg bg-accent/15 p-3 text-accent w-fit ring-1 ring-accent/30">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          {badge && <Badge variant="secondary" className="text-[10px]">{badge}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}

export function ModuleGroup({ title, children }: { title: string; children: ReactNode }) {
  return <ModuleGroupWithProgress title={title}>{children}</ModuleGroupWithProgress>;
}

export function ModuleGroupWithProgress({
  title,
  progress,
  children,
}: { title: string; progress?: number; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {typeof progress === "number" && (
          <div className="flex items-center gap-2 min-w-0 w-40 max-w-[50%]">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
              {progress >= 100 ? "Completed" : `${progress}%`}
            </span>
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export function PartCard({
  title,
  desc,
  icon: Icon,
  comingSoon = true,
  progress,
  locked,
}: {
  title: string;
  desc: string;
  icon: any;
  comingSoon?: boolean;
  progress?: number;
  locked?: "premium" | "platinum";
}) {
  return (
    <div className="relative rounded-lg border border-border/60 bg-card p-4 transition hover:border-accent/50 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-accent/10 p-2 text-accent ring-1 ring-accent/20">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{title}</p>
            {progress === 100 && <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          {locked && (
            <Badge className="mt-2 text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20">
              <Lock className="h-3 w-3 mr-1" /> Premium
            </Badge>
          )}
          {!locked && comingSoon && typeof progress !== "number" && (
            <Badge variant="secondary" className="mt-2 text-[10px]">Demnächst</Badge>
          )}
        </div>
      </div>
    </div>
  );
}