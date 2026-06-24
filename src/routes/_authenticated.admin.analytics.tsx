import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, CreditCard, TrendingUp, Target,
  ArrowUpRight, Activity,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalyticsPage,
});

/* Placeholder chart data — replace with real queries once you have volume */
const SIGNUP_DATA = [
  { month: "Jan", users: 0 }, { month: "Feb", users: 0 },
  { month: "Mar", users: 0 }, { month: "Apr", users: 0 },
  { month: "May", users: 0 }, { month: "Jun", users: 0 },
];

const REVENUE_DATA = [
  { month: "Jan", eur: 0 }, { month: "Feb", eur: 0 },
  { month: "Mar", eur: 0 }, { month: "Apr", eur: 0 },
  { month: "May", eur: 0 }, { month: "Jun", eur: 0 },
];

function KPICard({
  label, value, icon: Icon, color, note,
}: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function AdminAnalyticsPage() {
  const [totals, setTotals] = useState({
    users: 0,
    activeSubs: 0,
    trials: 0,
    attempts: 0,
  });

  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trial"),
      supabase.from("exam_attempts").select("id", { count: "exact", head: true }),
    ]).then(([users, active, trials, attempts]) => {
      setTotals({
        users:      users.count   ?? 0,
        activeSubs: active.count  ?? 0,
        trials:     trials.count  ?? 0,
        attempts:   attempts.count ?? 0,
      });
    });
  }, []);

  const conversionRate = totals.users > 0
    ? ((totals.activeSubs / totals.users) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Platform metrics and growth overview.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard label="Total users"       value={totals.users.toLocaleString()}      icon={Users}      color="bg-blue-500/10 text-blue-500"    note="All time" />
        <KPICard label="Active subscribers" value={totals.activeSubs.toLocaleString()} icon={CreditCard} color="bg-emerald-500/10 text-emerald-500" note="Paid plans" />
        <KPICard label="Conversion rate"   value={`${conversionRate}%`}               icon={TrendingUp} color="bg-violet-500/10 text-violet-500"  note="Trial → paid" />
        <KPICard label="Exam attempts"     value={totals.attempts.toLocaleString()}   icon={Target}     color="bg-amber-500/10 text-amber-500"    note="All time" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">New signups</p>
              <p className="text-xs text-muted-foreground">Monthly user registrations</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SIGNUP_DATA} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", fontSize: "0.75rem" }} />
                <Area type="monotone" dataKey="users" stroke="var(--color-primary)" strokeWidth={2} fill="url(#usersGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Monthly revenue</p>
              <p className="text-xs text-muted-foreground">EUR — Stripe data after integration</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_DATA} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", fontSize: "0.75rem" }} />
                <Bar dataKey="eur" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">Revenue will populate once Stripe is connected</p>
        </div>
      </div>

      {/* Subscription breakdown */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="mb-5 text-sm font-semibold text-foreground">Subscription breakdown</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Active",   value: totals.activeSubs, pct: totals.users > 0 ? (totals.activeSubs / totals.users) * 100 : 0, color: "bg-emerald-500" },
            { label: "Trial",    value: totals.trials,     pct: totals.users > 0 ? (totals.trials / totals.users) * 100 : 0,     color: "bg-blue-500"   },
            { label: "No plan",  value: Math.max(0, totals.users - totals.activeSubs - totals.trials),
              pct: totals.users > 0 ? (Math.max(0, totals.users - totals.activeSubs - totals.trials) / totals.users) * 100 : 0,
              color: "bg-muted-foreground/30" },
          ].map((s) => (
            <div key={s.label} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-foreground">{s.label}</span>
                <span className="font-medium text-foreground">{s.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${s.color} transition-all duration-700`}
                  style={{ width: `${Math.round(s.pct)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{s.pct.toFixed(1)}% of users</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
