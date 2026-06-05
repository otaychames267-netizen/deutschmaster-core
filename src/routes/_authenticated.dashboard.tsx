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
import { PenLine, Mic, BookOpen, Headphones, Puzzle, Edit3, Speech, Sparkles, Clock, Calendar, Award, ArrowRight, GraduationCap, TrendingUp, Activity } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

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
  const [savingLevel, setSavingLevel] = useState(false);

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

  const setLevel = async (lv: "TELC_B1" | "TELC_B2") => {
    if (!user || savingLevel || profile?.level === lv) return;
    setSavingLevel(true);
    const { error } = await supabase.from("profiles").update({ level: lv, target_level: lv }).eq("id", user.id);
    setSavingLevel(false);
    if (error) return toast.error(error.message);
    setProfile((p: any) => ({ ...p, level: lv, target_level: lv }));
    toast.success(`Switched to ${lv.replace("_", " ")}`);
  };

  const EXAM_AREAS = [
    { id: "schriftlich", label: "Schriftlich", icon: PenLine, desc: "Written TELC exam area", modules: [{ label: "Lesen", icon: BookOpen }, { label: "Hören", icon: Headphones }, { label: "Sprachbausteine", icon: Puzzle }, { label: "Schreiben", icon: Edit3 }] },
    { id: "muendlich", label: "Mündlich", icon: Mic, desc: "Oral TELC exam area", modules: [{ label: "Sprechen", icon: Speech }] },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header row: greeting + level toggle */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back, {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}</h1>
          <p className="text-sm text-muted-foreground">{levelLabel ? `Your ${levelLabel} preparation hub` : "Pick a level to get started"}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1 shadow-sm">
            <span className="text-xs text-muted-foreground px-1">Level</span>
            <ToggleGroup type="single" value={profile?.level ?? ""} onValueChange={(v) => v && setLevel(v as "TELC_B1" | "TELC_B2")} size="sm" disabled={savingLevel}>
              <ToggleGroupItem value="TELC_B1" className="text-xs font-semibold data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">B1</ToggleGroupItem>
              <ToggleGroupItem value="TELC_B2" className="text-xs font-semibold data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">B2</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button asChild size="sm"><Link to="/learn/$level" params={{ level: levelSlug }}><GraduationCap className="h-4 w-4 mr-1" /> Continue</Link></Button>
        </div>
      </div>

      {/* TOP ROW — 4 stat cards above the fold */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Current level" value={levelLabel ?? "—"} sub={`Target: ${formatLevel(profile?.target_level) ?? "—"}`} accent />
        <StatCard icon={Calendar} label="Exam countdown" value={profile?.exam_date ? `${examDays}d` : "—"} sub={profile?.exam_date ? format(new Date(profile.exam_date), "PP") : "Set in profile"} />
        <TrialStatCard sub={sub} loading={subscriptionLoading} isTrial={isTrial} isActive={isActive} trialDay={trialDay} remaining={remaining} planLabel={planLabel} />
        <StatCard icon={TrendingUp} label="Profile" value={`${completion}%`} sub={completion < 100 ? "Complete your profile" : "All set"}>
          <Progress value={completion} className="h-1.5 mt-2" />
        </StatCard>
      </div>

      {/* SECOND ROW — Schriftlich + Mündlich */}
      <div className="grid gap-4 md:grid-cols-2">
        {EXAM_AREAS.map((area) => (
          <Link key={area.id} to="/learn/$level" params={{ level: levelSlug }} className="group block">
            <Card className="h-full overflow-hidden border-border/60 transition-all hover:border-accent hover:shadow-md hover:-translate-y-0.5">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-accent/10 p-2.5 text-accent-foreground ring-1 ring-accent/20">
                    <area.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center justify-between">
                      {area.label}
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">{area.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-1.5">
                  {area.modules.map((m) => (
                    <div key={m.label} className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1.5 text-xs">
                      <m.icon className="h-3 w-3 text-accent" /> <span className="truncate">{m.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
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