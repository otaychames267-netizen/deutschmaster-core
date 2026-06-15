import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ensureUserTrial } from "@/lib/trial.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { PenLine, Mic, BookOpen, Headphones, Puzzle, Edit3, Speech, MessageSquare, Users, Sparkles, Clock, Calendar, Award, ArrowRight, GraduationCap, TrendingUp, Activity, Settings2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — DeutschMaster" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const ensureTrial = useServerFn(ensureUserTrial);
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setSubscriptionLoading(true);
    (async () => {
      const [profileResult, subscriptionResult, notificationResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
      ]);

      let subscription = subscriptionResult.data;
      if (!subscription) {
        try {
          const ensured = await ensureTrial();
          subscription = ensured.subscription;
        } catch (error) {
          console.error("Trial activation fallback failed", error);
        }
      }

      if (cancelled) return;
      setProfile(profileResult.data);
      setSub(subscription);
      setNotifs(notificationResult.data ?? []);
      setSubscriptionLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, ensureTrial]);

  const DAY_MS = 24 * 60 * 60 * 1000;
  const remaining = sub?.expires_at ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / DAY_MS)) : null;
  const trialDay = sub?.started_at ? Math.min(3, Math.max(1, Math.floor((Date.now() - new Date(sub.started_at).getTime()) / DAY_MS) + 1)) : 1;
  const examDays = profile?.exam_date ? differenceInDays(new Date(profile.exam_date), new Date()) : null;

  const profileFields = ["full_name","country","level","target_level","exam_date","study_goal"];
  const completion = profile
    ? Math.round((profileFields.filter((k) => profile[k]).length / profileFields.length) * 100)
    : 0;
  const formatLevel = (lv?: string | null) => lv ? lv.replace("_", " ") : null;
  const isTrial = sub?.status === "trial" || sub?.is_trial;
  const isActive = sub?.status === "active";
  const planLabel = sub?.plan_code ? String(sub.plan_code).replace(/_/g, " ") : "—";
  const levelLabel = formatLevel(profile?.level);
  const levelSlug = profile?.level === "TELC_B2" ? "b2" : "b1";

  const EXAM_AREAS = [
    {
      id: "schriftlich",
      label: "Schriftlich",
      icon: PenLine,
      tagline: "Written exam",
      desc: "Reading, listening, language elements & writing",
      modules: [
        { label: "Lesen", icon: BookOpen },
        { label: "Hören", icon: Headphones },
        { label: "Sprachbausteine", icon: Puzzle },
        { label: "Schreiben", icon: Edit3 },
      ],
    },
    {
      id: "muendlich",
      label: "Mündlich",
      icon: Mic,
      tagline: "Oral exam",
      desc: "Presentation, discussion & partner planning",
      modules: [
        { label: "Teil 1 · Präsentation", icon: Speech },
        { label: "Teil 2 · Diskussion", icon: MessageSquare },
        { label: "Teil 3 · Planen", icon: Users },
      ],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header row: greeting + level toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Welcome back, {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}</h1>
          <p className="text-sm text-muted-foreground">{levelLabel ? `Your ${levelLabel} preparation hub — choose where to study` : "Pick a level to get started"}</p>
        </div>
        {levelLabel && (
          <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground">
            <Link to="/profile"><Settings2 className="h-3.5 w-3.5 mr-1" /> Change level in Profile</Link>
          </Button>
        )}
      </div>

      {/* HERO ROW — Schriftlich + Mündlich — dominant learning entrypoints, above the fold */}
      <div className="grid gap-5 md:grid-cols-2">
        {EXAM_AREAS.map((area) => (
          <Link key={area.id} to="/learn/$level" params={{ level: levelSlug }} className="group block">
            <Card className="relative h-full overflow-hidden border-border/60 transition-all duration-300 hover:border-accent/60 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 min-h-[260px]">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-4 relative">
                <div className="flex items-start justify-between mb-2">
                  <div className="rounded-xl bg-accent/15 p-4 text-accent ring-1 ring-accent/30 group-hover:scale-110 transition-transform duration-300">
                    <area.icon className="h-8 w-8" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{area.tagline}</span>
                </div>
                <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight flex items-center justify-between">
                  {area.label}
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-accent" />
                </CardTitle>
                <CardDescription className="text-sm">{area.desc}</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid grid-cols-2 gap-2">
                  {area.modules.map((m) => (
                    <div key={m.label} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/50 backdrop-blur px-3 py-2.5 text-sm transition-colors group-hover:border-accent/30">
                      <m.icon className="h-4 w-4 text-accent shrink-0" /> <span className="truncate font-medium">{m.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-accent">
                  <GraduationCap className="h-4 w-4" /> Open {area.label} →
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* SECONDARY ROW — 4 stat cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Current level" value={levelLabel ?? "—"} sub={`Target: ${formatLevel(profile?.target_level) ?? "—"}`} accent />
        <StatCard icon={Calendar} label="Exam countdown" value={profile?.exam_date ? `${examDays}d` : "—"} sub={profile?.exam_date ? format(new Date(profile.exam_date), "PP") : "Set in profile"} />
        <TrialStatCard sub={sub} loading={subscriptionLoading} isTrial={isTrial} isActive={isActive} trialDay={trialDay} remaining={remaining} planLabel={planLabel} />
        <StatCard icon={TrendingUp} label="Profile" value={`${completion}%`} sub={completion < 100 ? "Complete your profile" : "All set"}>
          <Progress value={completion} className="h-1.5 mt-2" />
        </StatCard>
      </div>

      {/* THIRD ROW — recent activity + study stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-accent" /> Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/notifications">View all</Link></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifs.length === 0 ? (
              <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                Your study activity will appear here.
              </div>
            ) : notifs.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0">
                <div className="min-w-0"><p className="text-sm font-medium truncate">{n.title}</p><p className="text-xs text-muted-foreground truncate">{n.body}</p></div>
                <span className="text-xs text-muted-foreground shrink-0">{format(new Date(n.created_at), "MMM d")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /> Study statistics</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <StatRow label="Lessons completed" value="0" />
            <StatRow label="Exercises done" value="0" />
            <StatRow label="Study streak" value="0 days" />
            <p className="text-xs text-muted-foreground pt-2 border-t">Detailed analytics arrive with Phase 2 content.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent, children }: { icon: any; label: string; value: string; sub?: string; accent?: boolean; children?: React.ReactNode }) {
  return (
    <Card className={`transition hover:shadow-md ${accent ? "border-accent/40" : ""}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide"><Icon className="h-3.5 w-3.5" /> {label}</div>
        <p className="text-2xl font-bold mt-1.5 truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
        {children}
      </CardContent>
    </Card>
  );
}

function TrialStatCard({ sub, loading, isTrial, isActive, trialDay, remaining, planLabel }: any) {
  const accent = isTrial ? "border-accent bg-accent/5" : isActive ? "border-primary/30" : "border-destructive/40";
  return (
    <Card className={`relative overflow-hidden ${sub ? accent : ""}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {isTrial ? <Sparkles className="h-3.5 w-3.5" /> : <Award className="h-3.5 w-3.5" />} Subscription
        </div>
        {!sub && loading && <p className="text-2xl font-bold mt-1.5">Activating…</p>}
        {!sub && !loading && (
          <>
            <p className="text-2xl font-bold mt-1.5">No plan</p>
            <Link to="/billing" className="text-xs text-accent hover:underline">View plans →</Link>
          </>
        )}
        {sub && (
          <>
            <p className="text-2xl font-bold mt-1.5 truncate">
              {isTrial ? "Free trial" : isActive ? planLabel : sub.status}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {isTrial && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Day {trialDay}/3</Badge>}
              {isTrial && remaining !== null && <span className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline mr-0.5" />{remaining}d left</span>}
              {!isTrial && sub.expires_at && <span className="text-xs text-muted-foreground">to {format(new Date(sub.expires_at), "PP")}</span>}
            </div>
            {isTrial && <Link to="/billing" className="text-xs text-accent hover:underline mt-1 inline-block">Upgrade →</Link>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}