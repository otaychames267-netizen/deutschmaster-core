import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { differenceInDays, format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { PenLine, Mic, Puzzle, FileText, Dumbbell, LineChart, Sparkles, Clock, Calendar, Award, ArrowRight, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — DeutschMaster" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [notifs, setNotifs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => setSub(data));
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => setNotifs(data ?? []));
  }, [user]);

  const remaining = sub?.expires_at ? Math.max(0, differenceInDays(new Date(sub.expires_at), new Date())) : null;
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

  const SECTIONS = [
    { id: "schriftlich", label: "Schriftlich", icon: PenLine, desc: "Writing tasks & letters" },
    { id: "muendlich", label: "Mündlich", icon: Mic, desc: "Speaking & presentations" },
    { id: "sprachbausteine", label: "Sprachbausteine", icon: Puzzle, desc: "Grammar building blocks" },
    { id: "models", label: "Models", icon: FileText, desc: "Past exam papers" },
    { id: "exercises", label: "Exercises", icon: Dumbbell, desc: "Targeted drills" },
    { id: "progress", label: "Progress", icon: LineChart, desc: "Track your stats" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}</h1>
          <p className="text-muted-foreground">{levelLabel ? `Your ${levelLabel} preparation hub.` : "Set your level to get started."}</p>
        </div>
        <Button asChild><Link to="/learn"><GraduationCap className="h-4 w-4 mr-1" /> Continue learning</Link></Button>
      </div>

      {/* Trial / subscription banner — prominent */}
      {sub ? (
        <Card className={isTrial ? "border-accent bg-accent/5" : isActive ? "border-primary/30" : "border-destructive/40"}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-md ${isTrial ? "bg-accent/20" : "bg-primary/10"}`}>
                  {isTrial ? <Sparkles className="h-5 w-5 text-accent" /> : <Award className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {isTrial ? "Free trial active" : isActive ? `${planLabel} plan active` : `Subscription ${sub.status}`}
                    </p>
                    <Badge variant={isActive ? "default" : isTrial ? "secondary" : "destructive"}>{sub.status}</Badge>
                  </div>
                  {isTrial && remaining !== null && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3 inline mr-1" />
                      <span className="font-medium text-foreground">{remaining} day{remaining === 1 ? "" : "s"} remaining</span>
                      {sub.expires_at && <> · expires {format(new Date(sub.expires_at), "PPP")}</>}
                    </p>
                  )}
                  {!isTrial && sub.expires_at && (
                    <p className="text-sm text-muted-foreground mt-0.5">Renews / ends {format(new Date(sub.expires_at), "PPP")}</p>
                  )}
                </div>
              </div>
              <Button asChild variant={isTrial ? "default" : "outline"} size="sm">
                <Link to="/billing">{isTrial ? "Upgrade plan" : "Manage billing"} <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-6 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium">No active subscription</p>
              <p className="text-sm text-muted-foreground">Pick a plan to unlock full TELC preparation.</p>
            </div>
            <Button asChild size="sm"><Link to="/billing">View plans</Link></Button>
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1"><GraduationCap className="h-4 w-4" /> Current Level</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{levelLabel ?? "Not set"}</p>
            <p className="text-xs text-muted-foreground">Target: {formatLevel(profile?.target_level) ?? "—"}</p>
            <Button asChild variant="link" size="sm" className="px-0 h-auto mt-1"><Link to="/learn">Change level</Link></Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1"><Calendar className="h-4 w-4" /> Exam Countdown</CardTitle></CardHeader>
          <CardContent>
            {profile?.exam_date ? (
              <>
                <p className="text-2xl font-bold">{examDays}<span className="text-base font-normal text-muted-foreground"> days</span></p>
                <p className="text-xs text-muted-foreground">{format(new Date(profile.exam_date), "PPP")}</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-muted-foreground">—</p>
                <Button asChild variant="link" size="sm" className="px-0 h-auto"><Link to="/profile">Set exam date</Link></Button>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Profile completion</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-baseline">
              <p className="text-2xl font-bold">{completion}%</p>
              {completion < 100 && <Button asChild variant="link" size="sm" className="px-0 h-auto"><Link to="/profile">Complete</Link></Button>}
            </div>
            <Progress value={completion} />
          </CardContent>
        </Card>
      </div>

      {/* Learning sections */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold">Your {levelLabel ?? "TELC"} sections</h2>
          <Link to="/learn/$level" params={{ level: levelSlug }} className="text-sm text-accent hover:underline">Open level →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((s) => (
            <Link key={s.id} to="/learn/$level" params={{ level: levelSlug }} className="group">
              <Card className="h-full transition hover:border-accent hover:shadow-sm">
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-accent/10 text-accent-foreground"><s.icon className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium group-hover:text-accent transition-colors">{s.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link to="/notifications">View all</Link></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {notifs.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet — your activity will appear here.</p> :
            notifs.map((n) => (
              <div key={n.id} className="flex justify-between border-b pb-2 last:border-0">
                <div><p className="text-sm font-medium">{n.title}</p><p className="text-xs text-muted-foreground">{n.body}</p></div>
                <span className="text-xs text-muted-foreground">{format(new Date(n.created_at), "MMM d")}</span>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}