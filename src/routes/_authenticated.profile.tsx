import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useUserProgress, levelProgress, xpForNextLevel, xpForCurrentLevel } from "@/lib/useUserProgress";
import {
  Loader2, Save, Calendar, CreditCard,
  Shield, Bell, ChevronRight, Mail, Flame,
  Trophy, Sparkles, Target, Clock, Gift,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

interface Profile {
  full_name: string | null;
  level: string | null;
  exam_date: string | null;
  avatar_url: string | null;
}

function Avatar({ name, email, size = "md" }: { name: string; email: string; size?: "md" | "lg" }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : email[0].toUpperCase();
  const cls = size === "lg" ? "h-20 w-20 text-2xl rounded-2xl" : "h-14 w-14 text-lg rounded-xl";
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-primary to-primary/60 font-bold text-primary-foreground shadow-md ${cls}`}>
      {initials}
    </div>
  );
}

function ProfilePage() {
  const { user } = useAuth();
  const { progress, achievements, loading: progressLoading } = useUserProgress();

  const [profile, setProfile]   = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [level, setLevel]       = useState("");
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, level, exam_date, avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile(data);
          setFullName(data.full_name ?? "");
          setLevel(data.level ?? "");
          setExamDate(data.exam_date ?? "");
        }
        setLoading(false);
      });
  }, [user?.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null, level: level || null, exam_date: examDate || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to save. Please try again.");
    else toast.success("Profile updated.");
  }

  if (loading || progressLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = fullName || user?.email?.split("@")[0] || "User";
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  const xpProgress = levelProgress(progress.total_xp, progress.level);
  const xpCurr = xpForCurrentLevel(progress.level);
  const xpNext = xpForNextLevel(progress.level);
  const unlockedAchs = achievements.filter((a) => a.unlocked_at);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Profile</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your account, stats, and progress.</p>
      </div>

      {/* Hero card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={fullName} email={user?.email ?? "U"} size="lg" />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">{displayName}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {user?.email}
                </div>
                {memberSince && <p className="mt-0.5 text-xs text-muted-foreground">Member since {memberSince}</p>}
              </div>
              {level && (
                <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  TELC {level === "TELC_B1" ? "B1" : "B2"}
                </span>
              )}
            </div>

            {/* XP Bar */}
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Level {progress.level}
                </span>
                <span className="text-muted-foreground">{progress.total_xp - xpCurr} / {xpNext - xpCurr} XP to Level {progress.level + 1}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
            </div>

            {/* Mini stats */}
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border bg-muted/20 p-2.5">
                <div className="flex items-center justify-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-base font-bold text-foreground">{progress.streak_current}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Day streak</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-2.5">
                <div className="flex items-center justify-center gap-1">
                  <Target className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-base font-bold text-foreground">{progress.exercises_completed}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Exercises</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-2.5">
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-base font-bold text-foreground">{unlockedAchs.length}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Achievements</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent achievements */}
      {unlockedAchs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Recent achievements</p>
            <Link to="/achievements" className="text-xs font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {unlockedAchs.slice(0, 6).map((ach) => (
              <div
                key={ach.id}
                title={ach.description}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2"
              >
                <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-foreground">{ach.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Personal information</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="fullName">Full name</label>
          <input
            id="fullName" type="text" autoComplete="name"
            value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email address</label>
          <div className="flex items-center gap-2 rounded-xl border border-input bg-muted/50 px-3.5 py-2.5">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Read-only</span>
          </div>
          <p className="text-xs text-muted-foreground">Email changes are managed through Security settings.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="level">Target exam</label>
            <select id="level" value={level} onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors">
              <option value="">Not set</option>
              <option value="TELC_B1">TELC B1</option>
              <option value="TELC_B2">TELC B2</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="examDate">Exam date <span className="text-muted-foreground">(optional)</span></label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input id="examDate" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Your data is stored securely.</p>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-px disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </form>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Shield,   label: "Security & 2FA",  desc: "Passwords & sessions",     to: "/security"       as const },
          { icon: CreditCard, label: "Billing",      desc: "Plans & subscription",       to: "/billing"        as const },
          { icon: Bell,     label: "Notifications",   desc: "Alert preferences",          to: "/notifications"  as const },
          { icon: Gift,     label: "Referrals",       desc: "Invite & earn rewards",      to: "/referrals"      as const },
        ].map((link) => (
          <Link key={link.label} to={link.to}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <link.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{link.label}</p>
              <p className="truncate text-xs text-muted-foreground">{link.desc}</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
