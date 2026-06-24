import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, BookOpen, CreditCard, FileText, ChevronRight,
  TrendingUp, Activity, AlertCircle, ShieldCheck,
  ArrowUpRight, Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminIndexPage,
});

interface Stats {
  users: number;
  activeSubscriptions: number;
  trials: number;
  publishedExams: number;
  pendingImports: number;
  pendingUsers: number;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  email: string | null;
  level: string | null;
  created_at: string;
}

function AdminIndexPage() {
  const [stats, setStats]         = useState<Stats>({
    users: 0, activeSubscriptions: 0, trials: 0,
    publishedExams: 0, pendingImports: 0, pendingUsers: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trial"),
      supabase.from("exams").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("pdf_imports").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
      supabase
        .from("profiles")
        .select("id, full_name, level, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([users, active, trials, exams, imports, recent]) => {
      setStats({
        users:               users.count   ?? 0,
        activeSubscriptions: active.count  ?? 0,
        trials:              trials.count  ?? 0,
        publishedExams:      exams.count   ?? 0,
        pendingImports:      imports.count ?? 0,
        pendingUsers:        0,
      });
      setRecentUsers((recent.data ?? []) as RecentUser[]);
      setLoading(false);
    });
  }, []);

  const METRIC_CARDS = [
    {
      label: "Total users",
      value: stats.users,
      icon: Users,
      to: "/admin/users",
      bg: "bg-blue-500/10",
      text: "text-blue-500",
      trend: null,
    },
    {
      label: "Active subscriptions",
      value: stats.activeSubscriptions,
      icon: CreditCard,
      to: "/admin/subscriptions",
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
      trend: null,
    },
    {
      label: "Free trials",
      value: stats.trials,
      icon: Clock,
      to: "/admin/subscriptions",
      bg: "bg-amber-500/10",
      text: "text-amber-500",
      trend: null,
    },
    {
      label: "Published exams",
      value: stats.publishedExams,
      icon: BookOpen,
      to: "/admin/exams",
      bg: "bg-violet-500/10",
      text: "text-violet-500",
      trend: null,
    },
  ];

  const QUICK_LINKS = [
    { label: "User management",       icon: Users,       to: "/admin/users",         desc: "Manage accounts, roles, bans" },
    { label: "Subscriptions",         icon: CreditCard,  to: "/admin/subscriptions", desc: "Active, trial, expired plans" },
    { label: "Exercises",             icon: BookOpen,    to: "/admin/exercises",     desc: "Create and edit content" },
    { label: "Analytics",             icon: TrendingUp,  to: "/admin/analytics",     desc: "Revenue and engagement" },
    { label: "Messages",              icon: Activity,    to: "/admin/messages",      desc: "Support inbox" },
    { label: "PDF Import",            icon: FileText,    to: "/admin/pdf-import",    desc: "Exam content pipeline" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admin panel</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Platform overview</h1>
        </div>
        <Link
          to="/admin/analytics"
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <TrendingUp className="h-3.5 w-3.5" /> Analytics
        </Link>
      </div>

      {/* Pending alert */}
      {stats.pendingImports > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="flex-1 text-sm text-foreground">
            <strong>{stats.pendingImports}</strong> PDF import{stats.pendingImports > 1 ? "s" : ""} need{stats.pendingImports === 1 ? "s" : ""} review.
          </p>
          <Link to="/admin/pdf-import" className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">
            Review <ChevronRight className="inline h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRIC_CARDS.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={`h-4.5 w-4.5 ${card.text}`} />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {loading ? "—" : card.value.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent users */}
        <div className="col-span-full rounded-2xl border border-border bg-card shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Recent signups</p>
            <Link to="/admin/users" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : recentUsers.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">No users yet</div>
          ) : (
            <div className="divide-y divide-border">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(u.full_name?.[0] ?? u.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.full_name ?? u.email ?? u.id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {u.level && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {u.level === "TELC_B1" ? "B1" : u.level === "TELC_B2" ? "B2" : u.level}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="col-span-full rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Quick links</p>
          </div>
          <div className="divide-y divide-border">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50 group"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <link.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
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
      </div>
    </div>
  );
}
