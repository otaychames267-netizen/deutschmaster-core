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
import { PenLine, Mic, BookOpen, Headphones, Puzzle, Edit3, Speech, MessageSquare, Users, Sparkles, Clock, Calendar, Award, ArrowRight, GraduationCap, TrendingUp, Activity, Flame, Target, UserPlus, ClipboardList, PlayCircle, BarChart3, X, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Lingovia" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const ensureTrial = useServerFn(ensureUserTrial);
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [lastActivity, setLastActivity] = useState<{ label: string; to: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem("dm-welcome-seen");
      if (!seen) setShowWelcome(true);
      const raw = window.localStorage.getItem("dm-last-activity");
      if (raw) setLastActivity(JSON.parse(raw));
    } catch {}
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    try { window.localStorage.setItem("dm-welcome-seen", "1"); } catch {}
  };

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
      to: "/schriftlich" as const,
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
      to: "/muendlich" as const,
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
      {/* WELCOME ONBOARDING POPUP */}
      {showWelcome && (
        <Card className="relative border-accent/40 bg-gradient-to-br from-accent/10 via-card to-card overflow-hidden">
          <button
            onClick={dismissWelcome}
            aria-label="Schließen"
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition"
          ><X className="h-4 w-4" /></button>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-accent font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Start here
            </div>
            <CardTitle className="text-xl">Willkommen bei Lingovia</CardTitle>
            <CardDescription>Folge diesen 4 Schritten, um schnell loszulegen.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: 1, label: "Open Schriftlich", to: "/schriftlich" },
              { n: 2, label: "Complete Lesen Teil 1", to: "/schriftlich/vorbereitung" },
              { n: 3, label: "Complete Hören Teil 1", to: "/schriftlich/vorbereitung" },
              { n: 4, label: "Try your first simulation", to: "/pruefung" },
            ].map((s) => (
              <Link key={s.n} to={s.to} className="group rounded-lg border border-border/60 bg-card/60 p-3 hover:border-accent/50 hover:shadow-md transition">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-accent/15 text-accent text-xs font-bold grid place-items-center ring-1 ring-accent/30">{s.n}</span>
                  <span className="text-sm font-medium truncate">{s.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition" />
                </div>
              </Link>
            ))}
          </CardContent>
          <div className="px-6 pb-4">
            <button onClick={dismissWelcome} className="text-xs text-muted-foreground hover:text-foreground">Diesen Hinweis nicht mehr anzeigen</button>
          </div>
        </Card>
      )}

      {/* WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-accent/10 via-card to-card p-6 md:p-7">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-1">Willkommen zurück</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {levelLabel ? `Dein ${levelLabel}-Vorbereitungshub — wähle, wo du heute lernen möchtest.` : "Wähle ein Level, um zu starten."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {levelLabel && <Badge variant="outline" className="bg-card/60"><GraduationCap className="h-3 w-3 mr-1" /> {levelLabel}</Badge>}
            {isTrial && <Badge className="bg-accent/15 text-accent hover:bg-accent/20 border-accent/30"><Sparkles className="h-3 w-3 mr-1" /> Trial · Tag {trialDay}/3</Badge>}
            {profile?.exam_date && <Badge variant="secondary"><Calendar className="h-3 w-3 mr-1" /> Prüfung in {examDays}d</Badge>}
          </div>
        </div>
      </div>

      {/* CONTINUE LEARNING + EXAM COUNTDOWN */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 border-accent/30 bg-gradient-to-br from-accent/5 via-card to-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><PlayCircle className="h-4 w-4 text-accent" /> Continue learning</CardTitle>
            <CardDescription>
              {lastActivity ? `Letzte Aktivität: ${lastActivity.label}` : "Noch keine Aktivität — starte unten mit Schriftlich oder Mündlich."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link to={lastActivity?.to ?? "/schriftlich/vorbereitung"}>
                {lastActivity ? "Weiterlernen" : "Jetzt starten"} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card className={profile?.exam_date ? "border-accent/30" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-accent" /> My exam date</CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.exam_date ? (
              <>
                <p className="text-3xl font-bold tabular-nums">{examDays}<span className="text-base font-medium text-muted-foreground"> days</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(profile.exam_date), "PPP")}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">Set your exam date to start the countdown.</p>
                <Button asChild size="sm" variant="outline"><Link to="/profile">Set exam date</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* HERO ROW — Schriftlich + Mündlich */}
      <div className="grid gap-5 md:grid-cols-2">
        {EXAM_AREAS.map((area) => (
          <Link key={area.id} to={area.to} className="group block">
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

      {/* PRÜFUNGSSIMULATION strip */}
      <Link to="/pruefung" className="block group">
        <Card className="border-border/60 hover:border-accent/50 transition hover:shadow-lg">
          <CardContent className="py-4 px-5 flex items-center gap-4">
            <div className="rounded-lg bg-accent/15 p-2.5 text-accent ring-1 ring-accent/30"><ClipboardList className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Prüfungssimulation</p>
              <p className="text-xs text-muted-foreground">Realistische TELC-Prüfung — Schriftlich & Mündlich (Phase 2)</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition" />
          </CardContent>
        </Card>
      </Link>

      {/* SECONDARY ROW — 4 stat cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Current level" value={levelLabel ?? "—"} sub={`Target: ${formatLevel(profile?.target_level) ?? "—"}`} accent />
        <StatCard icon={Calendar} label="Exam countdown" value={profile?.exam_date ? `${examDays}d` : "—"} sub={profile?.exam_date ? format(new Date(profile.exam_date), "PP") : "Set in profile"} />
        <TrialStatCard sub={sub} loading={subscriptionLoading} isTrial={isTrial} isActive={isActive} trialDay={trialDay} remaining={remaining} planLabel={planLabel} />
        <StatCard icon={TrendingUp} label="Profile" value={`${completion}%`} sub={completion < 100 ? "Complete your profile" : "All set"}>
          <Progress value={completion} className="h-1.5 mt-2" />
        </StatCard>
      </div>

      {/* MOTIVATION ROW — daily goal, streak, weekly progress */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide"><Target className="h-3.5 w-3.5" /> Tagesziel</div>
            <p className="text-2xl font-bold mt-1.5">0 / 30 min</p>
            <Progress value={0} className="h-1.5 mt-2" />
            <p className="text-xs text-muted-foreground mt-1.5">Heute lernen, um dein Ziel zu erreichen.</p>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide"><Flame className="h-3.5 w-3.5" /> Lernserie</div>
            <p className="text-2xl font-bold mt-1.5">0 Tage</p>
            <p className="text-xs text-muted-foreground">Starte heute deine Serie.</p>
          </CardContent>
        </Card>
        <Link to="/referrals" className="group">
          <Card className="border-border/60 hover:border-accent/50 hover:shadow-md transition h-full">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide"><UserPlus className="h-3.5 w-3.5" /> Freunde einladen</div>
              <p className="text-base font-bold mt-1.5">+3 Tage Trial pro Freund</p>
              <p className="text-xs text-accent group-hover:underline mt-1 inline-flex items-center">Jetzt einladen <ArrowRight className="h-3 w-3 ml-0.5" /></p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* THIRD ROW — recent activity + link to full statistics */}
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
        <Link to="/statistik" className="group">
          <Card className="h-full hover:border-accent/50 hover:shadow-md transition">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-accent" /> Full statistics</CardTitle>
              <CardDescription>Lernzeit, Übungen, Streak & Mock-Ergebnisse.</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-accent inline-flex items-center group-hover:underline">
                Statistik öffnen <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition" />
              </span>
            </CardContent>
          </Card>
        </Link>
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