import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Save, Calendar, CreditCard,
  Shield, Bell, ChevronRight, Mail,
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

function Avatar({ name, email }: { name: string; email: string }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : email[0].toUpperCase();

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-brand text-xl font-bold text-primary-foreground shadow-md">
      {initials}
    </div>
  );
}

function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

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
      .update({
        full_name: fullName || null,
        level: level || null,
        exam_date: examDate || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to save. Please try again.");
    } else {
      toast.success("Profile updated successfully.");
    }
  }

  if (loading) {
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("nav.profile")}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage your account information and exam settings.</p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar name={fullName} email={user?.email ?? "U"} />
          <div>
            <p className="text-base font-semibold text-foreground">{displayName}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {user?.email}
            </div>
            {memberSince && (
              <p className="mt-0.5 text-xs text-muted-foreground">Member since {memberSince}</p>
            )}
          </div>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Personal information</h2>

        {/* Full name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email address</label>
          <div className="flex items-center gap-2 rounded-xl border border-input bg-muted/50 px-3.5 py-2.5">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Read-only</span>
          </div>
          <p className="text-xs text-muted-foreground">Email changes are managed through the security settings.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* TELC Level */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="level">
              Target exam
            </label>
            <select
              id="level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
            >
              <option value="">Not set</option>
              <option value="TELC_B1">TELC B1</option>
              <option value="TELC_B2">TELC B2</option>
            </select>
          </div>

          {/* Exam date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="examDate">
              Exam date <span className="text-muted-foreground">(optional)</span>
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="examDate"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Your information is stored securely.</p>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:-translate-y-px disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </form>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: Shield,     label: "Security & 2FA",    desc: "Manage passwords & two-factor auth", to: "/security" as const },
          { icon: CreditCard, label: "Billing & plans",   desc: "Manage your subscription",           to: "/billing"  as const },
          { icon: Bell,       label: "Notifications",     desc: "Manage your preferences",            to: "/notifications" as const },
        ].map((link) => (
          <Link
            key={link.label}
            to={link.to}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
          >
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
