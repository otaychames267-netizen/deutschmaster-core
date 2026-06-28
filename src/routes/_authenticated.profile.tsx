import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useUserProgress, levelProgress, xpForNextLevel, xpForCurrentLevel } from "@/lib/useUserProgress";
import {
  Loader2, Save, Calendar, CreditCard,
  Shield, Bell, ChevronRight, Mail, Flame,
  Trophy, Target, Clock, Gift,
  KeyRound, Eye, EyeOff, Zap, Star,
  Camera, User, TrendingUp, Monitor, CheckCircle2, AlertCircle,
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
  bio: string | null;
}

function Avatar({ name, email, size = "md" }: { name: string; email: string; size?: "md" | "lg" | "xl" }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : email[0].toUpperCase();
  const cls = {
    xl: "h-24 w-24 text-3xl rounded-2xl",
    lg: "h-20 w-20 text-2xl rounded-2xl",
    md: "h-14 w-14 text-lg rounded-xl",
  }[size];
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-primary to-primary/60 font-bold text-primary-foreground shadow-md ${cls}`}>
      {initials}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-6 py-4">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function ProfilePage() {
  const { user } = useAuth();
  const { progress, achievements, loading: progressLoading } = useUserProgress();

  const [profile, setProfile]   = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio]           = useState("");
  const [level, setLevel]       = useState("");
  const [examDate, setExamDate] = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [subscription, setSubscription] = useState<{ status: string; plan_code: string; expires_at: string } | null>(null);

  // Change password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [savingPw, setSavingPw]   = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("full_name, level, exam_date, avatar_url").eq("id", user.id).maybeSingle(),
      supabase.from("subscriptions").select("status, plan_code, expires_at").eq("user_id", user.id).in("status", ["active", "trial"]).order("expires_at", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([profileRes, subRes]) => {
      if (profileRes.data) {
        setProfile({ ...(profileRes.data as Profile), bio: null });
        setFullName(profileRes.data.full_name ?? "");
        setLevel(profileRes.data.level ?? "");
        setExamDate(profileRes.data.exam_date ?? "");
      }
      setSubscription(subRes.data ?? null);
      setLoading(false);
    });
  }, [user?.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null, level: (level || null) as "TELC_B1" | "TELC_B2" | null, exam_date: examDate || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error("Failed to save. Please try again.");
    else toast.success("Profile updated.");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPw || !confirmPw) return;
    if (newPw !== confirmPw) { toast.error("Passwords do not match."); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    }
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
  const studyHours = Math.floor(progress.total_study_sec / 3600);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">

      {/* ── Profile hero ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Cover gradient */}
        <div className="h-24 bg-gradient-to-r from-primary/30 via-violet-500/20 to-primary/10 relative">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, var(--color-primary) 0%, transparent 60%)" }} />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:gap-5 -mt-12">
            {/* Avatar */}
            <div className="relative">
              <Avatar name={fullName} email={user?.email ?? "U"} size="xl" />
              <button
                title="Change avatar (coming soon)"
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted shadow-sm hover:bg-muted/70 transition-colors"
              >
                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-4 sm:mt-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-foreground">{displayName}</h1>
                {level && (
                  <span className="rounded-xl bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary ring-1 ring-primary/20">
                    TELC {level === "TELC_B1" ? "B1" : "B2"}
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {user?.email}
              </p>
              {memberSince && <p className="text-xs text-muted-foreground">Member since {memberSince}</p>}
            </div>
          </div>

          {/* XP progress */}
          <div className="mt-5 border-t border-border pt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-foreground">
                <Zap className="h-3.5 w-3.5 text-violet-500" /> Level {progress.level}
              </span>
              <span className="text-muted-foreground">{progress.total_xp - xpCurr} / {xpNext - xpCurr} XP to Level {progress.level + 1}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all duration-700"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-4 gap-3 text-center">
            {[
              { icon: Flame,    value: String(progress.streak_current), label: "Day streak",  color: "text-orange-500",  bg: "bg-orange-500/10" },
              { icon: Target,   value: String(progress.exercises_completed), label: "Exercises", color: "text-blue-500", bg: "bg-blue-500/10" },
              { icon: Clock,    value: `${studyHours}h`,                label: "Study time",  color: "text-violet-500", bg: "bg-violet-500/10" },
              { icon: Trophy,   value: String(unlockedAchs.length),     label: "Achievements",color: "text-amber-500",  bg: "bg-amber-500/10" },
            ].map(({ icon: Icon, value, label, color, bg }) => (
              <div key={label} className="rounded-xl border border-border bg-muted/20 p-2.5">
                <div className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
                <p className="text-sm font-black text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Achievements ──────────────────────────────────────── */}
      {unlockedAchs.length > 0 && (
        <Section title="Recent achievements" icon={Trophy}>
          <div className="flex flex-wrap gap-2">
            {unlockedAchs.slice(0, 6).map((ach) => (
              <div key={ach.id} title={ach.description}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-medium text-foreground">{ach.title}</span>
              </div>
            ))}
          </div>
          {unlockedAchs.length > 6 && (
            <Link to="/achievements" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all {unlockedAchs.length} achievements <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </Section>
      )}

      {/* ── Personal information ──────────────────────────────── */}
      <Section title="Personal information" icon={User}>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="fullName">Full name</label>
            <input id="fullName" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="bio">Bio <span className="text-muted-foreground">(optional)</span></label>
            <textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself and your TELC preparation journey…"
              className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Email address</label>
            <div className="flex items-center gap-2 rounded-xl border border-input bg-muted/50 px-3.5 py-2.5">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Read-only</span>
            </div>
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
      </Section>

      {/* ── Change password ───────────────────────────────────── */}
      <Section title="Change password" icon={KeyRound}>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <p className="text-xs text-muted-foreground">Choose a strong password of at least 8 characters.</p>

          {[
            { id: "newPw",     label: "New password",     value: newPw,     onChange: setNewPw },
            { id: "confirmPw", label: "Confirm password", value: confirmPw, onChange: setConfirmPw },
          ].map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor={field.id}>{field.label}</label>
              <div className="relative">
                <input
                  id={field.id}
                  type={showPw ? "text" : "password"}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}

          {newPw && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    newPw.length < 8 ? "w-1/4 bg-rose-500" :
                    newPw.length < 12 ? "w-2/4 bg-amber-500" :
                    "w-full bg-emerald-500"
                  }`}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {newPw.length < 8 ? "Weak" : newPw.length < 12 ? "Good" : "Strong"}
              </span>
            </div>
          )}

          <div className="flex justify-end border-t border-border pt-4">
            <button type="submit" disabled={savingPw || !newPw || !confirmPw}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-px disabled:opacity-60">
              {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Update password
            </button>
          </div>
        </form>
      </Section>

      {/* ── Study statistics ──────────────────────────────────── */}
      <Section title="Study overview" icon={TrendingUp}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground mb-3">XP progress to Level {progress.level + 1}</p>
            <p className="text-2xl font-black text-foreground">{progress.total_xp.toLocaleString()} XP</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground mb-3">Best streak</p>
            <p className="text-2xl font-black text-foreground">{progress.streak_longest} days</p>
            <p className="mt-1 text-xs text-muted-foreground">Current: {progress.streak_current} days</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Link to="/statistik"
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            Full statistics <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </Section>

      {/* ── Subscription info ────────────────────────────────── */}
      <Section title="Subscription" icon={CreditCard}>
        {subscription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${subscription.status === "trial" ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                  {subscription.status === "trial"
                    ? <AlertCircle className="h-5 w-5 text-amber-500" />
                    : <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  }
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground capitalize">{subscription.plan_code} Plan</p>
                  <p className="text-xs text-muted-foreground">
                    {subscription.status === "trial" ? "Free trial" : "Active subscription"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${subscription.status === "trial" ? "text-amber-500" : "text-emerald-500"}`}>
                  {Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))}
                </p>
                <p className="text-xs text-muted-foreground">days left</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {subscription.status === "trial" ? "Expires" : "Renews"}{" "}
              {new Date(subscription.expires_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <Link to="/billing" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
              Manage subscription <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">No active subscription</p>
              <p className="text-xs text-muted-foreground">Start a free trial to access all exam content.</p>
            </div>
            <Link to="/billing" className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
              View plans
            </Link>
          </div>
        )}
      </Section>

      {/* ── Active sessions ───────────────────────────────────── */}
      <Section title="Active sessions & devices" icon={Monitor}>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <Monitor className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Current session</p>
              <p className="text-xs text-muted-foreground truncate">
                {typeof navigator !== "undefined" ? navigator.userAgent.split(")")[0].split("(")[1] ?? "Web browser" : "Web browser"}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Active now
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            To sign out of all other devices, use{" "}
            <Link to="/security" className="font-medium text-primary hover:underline">Security → Sign out all devices</Link>.
          </p>
        </div>
      </Section>

      {/* ── Quick links ───────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Shield,     label: "Security & 2FA",  desc: "Passwords & sessions",   to: "/security"      as const },
          { icon: CreditCard, label: "Billing",         desc: "Plans & subscription",   to: "/billing"       as const },
          { icon: Bell,       label: "Notifications",   desc: "Alert preferences",      to: "/notifications" as const },
          { icon: Gift,       label: "Referrals",       desc: "Invite & earn rewards",  to: "/referrals"     as const },
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
