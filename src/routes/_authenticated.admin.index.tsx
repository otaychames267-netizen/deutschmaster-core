import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, BookOpen, CreditCard, FileText, ChevronRight,
  TrendingUp, Activity, AlertCircle, ShieldCheck,
  ArrowUpRight, Clock, Gift, BarChart2, Database,
  Shield, Settings2, Zap, CheckCircle2,
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
}

interface RecentUser {
  id: string;
  full_name: string | null;
  email: string | null;
  level: string | null;
  created_at: string;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

function AdminIndexPage() {
  const [stats, setStats]             = useState<Stats>({ users: 0, activeSubscriptions: 0, trials: 0, publishedExams: 0, pendingImports: 0 });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trial"),
      supabase.from("exams").select("id", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("pdf_imports").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
      supabase.from("profiles").select("id, full_name, level, created_at").order("created_at", { ascending: false }).limit(6),
    ]).then(([users, active, trials, exams, imports, recent]) => {
      setStats({
        users:               users.count   ?? 0,
        activeSubscriptions: active.count  ?? 0,
        trials:              trials.count  ?? 0,
        publishedExams:      exams.count   ?? 0,
        pendingImports:      imports.count ?? 0,
      });
      setRecentUsers((recent.data ?? []) as RecentUser[]);
      setLoading(false);
    });
  }, []);

  const METRIC_CARDS = [
    { label: "Total users",     value: stats.users,               icon: Users,      to: "/admin/users",         color: "text-blue-500",    bg: "bg-blue-500/10",    ring: "ring-blue-500/15",    glow: "shadow-blue-500/10" },
    { label: "Active plans",    value: stats.activeSubscriptions, icon: CreditCard, to: "/admin/subscriptions", color: "text-emerald-500", bg: "bg-emerald-500/10", ring: "ring-emerald-500/15", glow: "shadow-emerald-500/10" },
    { label: "Free trials",     value: stats.trials,              icon: Clock,      to: "/admin/subscriptions", color: "text-amber-500",   bg: "bg-amber-500/10",   ring: "ring-amber-500/15",   glow: "shadow-amber-500/10" },
    { label: "Published exams", value: stats.publishedExams,      icon: BookOpen,   to: "/admin/exams",         color: "text-violet-500",  bg: "bg-violet-500/10",  ring: "ring-violet-500/15",  glow: "shadow-violet-500/10" },
  ];

  const ADMIN_SECTIONS = [
    { label: "Users",          icon: Users,      to: "/admin/users",         desc: "Accounts, roles, bans, level",       color: "text-blue-500",    bg: "bg-blue-500/10" },
    { label: "Subscriptions",  icon: CreditCard, to: "/admin/subscriptions", desc: "Active, trial, expired plans",        color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Analytics",      icon: BarChart2,  to: "/admin/analytics",     desc: "Revenue, engagement, retention",      color: "text-violet-500",  bg: "bg-violet-500/10" },
    { label: "Exams",          icon: BookOpen,   to: "/admin/exams",         desc: "Schriftlich & Mündlich exams",        color: "text-indigo-500",  bg: "bg-indigo-500/10" },
    { label: "PDF Import",     icon: FileText,   to: "/admin/pdf-import",    desc: "Bulk content pipeline & review",      color: "text-amber-500",   bg: "bg-amber-500/10" },
    { label: "Import Review",  icon: CheckCircle2, to: "/admin/import-review", desc: "Verify & approve staged exercises",   color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Mündlich PDFs",  icon: FileText,   to: "/admin/muendlich",     desc: "Upload Vorbereitung study PDFs",       color: "text-rose-500",    bg: "bg-rose-500/10" },
    { label: "Referrals",      icon: Gift,       to: "/admin/referrals",     desc: "Referral codes, milestones, rewards", color: "text-pink-500",    bg: "bg-pink-500/10" },
    { label: "Storage",        icon: Database,   to: "/admin/storage",       desc: "Audio files, PDFs, assets",           color: "text-cyan-500",    bg: "bg-cyan-500/10" },
    { label: "Roles",          icon: Shield,     to: "/admin/roles",         desc: "Permissions and role assignment",     color: "text-orange-500",  bg: "bg-orange-500/10" },
    { label: "Settings",       icon: Settings2,  to: "/admin/settings",      desc: "Platform config, pricing, limits",    color: "text-slate-500",   bg: "bg-slate-500/10" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">

      {/* ── Admin Hero Header ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-card to-card p-7 shadow-sm">
        <div className="pointer-events-none absolute -right-12 -top-8 h-40 w-40 rounded-full bg-amber-500/8 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 ring-1 ring-amber-500/25">
                <ShieldCheck className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70">Admin Panel</p>
                <h1 className="text-xl font-black tracking-tight text-foreground">Platform Overview</h1>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Manage users, content, subscriptions, and platform settings.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/analytics"
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <BarChart2 className="h-3.5 w-3.5" /> Analytics
            </Link>
            <Link
              to="/admin/pdf-import"
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <FileText className="h-3.5 w-3.5" /> Import
            </Link>
          </div>
        </div>
      </div>

      {/* ── Pending alert ─────────────────────────────────────── */}
      {stats.pendingImports > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 px-5 py-3.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="flex-1 text-sm text-foreground">
            <strong>{stats.pendingImports}</strong> PDF import{stats.pendingImports > 1 ? "s" : ""} pending review.
          </p>
          <Link to="/admin/pdf-import" className="flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline">
            Review <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* ── Metric Cards ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRIC_CARDS.map(card => (
          <Link
            key={card.label}
            to={card.to}
            className={`group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[${card.glow}]`}
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ring-1 ${card.ring}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight text-foreground">
                {loading ? <Skeleton className="h-7 w-12" /> : card.value.toLocaleString()}
              </p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{card.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">

        {/* Recent users */}
        <div className="col-span-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <p className="text-sm font-black text-foreground">Recent Signups</p>
              <p className="text-xs text-muted-foreground">Latest registered users</p>
            </div>
            <Link to="/admin/users" className="flex items-center gap-1 rounded-xl bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <div className="divide-y divide-border">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentUsers.length === 0 ? (
            <div className="flex h-36 items-center justify-center">
              <div className="text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">No users yet</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentUsers.map(u => (
                <div key={u.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-black text-primary ring-1 ring-primary/15">
                    {(u.full_name?.[0] ?? u.email?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{u.full_name ?? u.email ?? u.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {u.level && (
                    <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {u.level === "TELC_B1" ? "B1" : u.level === "TELC_B2" ? "B2" : u.level}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform health */}
        <div className="col-span-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-black text-foreground">Platform Health</p>
            <p className="text-xs text-muted-foreground">System status overview</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Database",    status: "Operational", ok: true },
              { label: "Auth",        status: "Operational", ok: true },
              { label: "Storage",     status: "Operational", ok: true },
              { label: "PDF Import",  status: stats.pendingImports > 0 ? `${stats.pendingImports} pending` : "Clear", ok: stats.pendingImports === 0 },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5">
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <span className={`flex items-center gap-1.5 text-xs font-bold ${item.ok ? "text-emerald-500" : "text-amber-500"}`}>
                  {item.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5" />
                    : <AlertCircle className="h-3.5 w-3.5" />}
                  {item.status}
                </span>
              </div>
            ))}

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Revenue snapshot</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-center">
                  <p className="text-lg font-black text-foreground">{stats.activeSubscriptions}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground">Paid</p>
                </div>
                <div className="rounded-xl bg-muted/60 px-3 py-2.5 text-center">
                  <p className="text-lg font-black text-foreground">{stats.trials}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground">Trial</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Admin Sections Grid ───────────────────────────────── */}
      <div>
        <div className="mb-4">
          <p className="text-sm font-black text-foreground">All Admin Sections</p>
          <p className="text-xs text-muted-foreground">Manage every aspect of the platform</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_SECTIONS.map(section => (
            <Link
              key={section.label}
              to={section.to}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${section.bg} ring-1 ring-border transition-all group-hover:scale-105`}>
                <section.icon className={`h-5 w-5 ${section.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-foreground">{section.label}</p>
                <p className="truncate text-xs text-muted-foreground">{section.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
