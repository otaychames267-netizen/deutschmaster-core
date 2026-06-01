import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: AdminAnalytics,
});

function bucketByDay(rows: any[], dateKey: string, days = 14) {
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) map.set(format(subDays(new Date(), i), "MMM d"), 0);
  rows.forEach((r) => {
    const k = format(startOfDay(new Date(r[dateKey])), "MMM d");
    if (map.has(k)) map.set(k, (map.get(k) || 0) + 1);
  });
  return Array.from(map.entries()).map(([day, v]) => ({ day, v }));
}

function AdminAnalytics() {
  const [growth, setGrowth] = useState<any[]>([]);
  const [subData, setSubData] = useState<any[]>([]);
  const [revData, setRevData] = useState<any[]>([]);
  const [byPlan, setByPlan] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const since = subDays(new Date(), 14).toISOString();
      const [u, s, p] = await Promise.all([
        supabase.from("profiles").select("created_at").gte("created_at", since),
        supabase.from("subscriptions").select("created_at,plan_code,status").gte("created_at", since),
        supabase.from("payments").select("created_at,amount,status"),
      ]);
      setGrowth(bucketByDay(u.data ?? [], "created_at"));
      setSubData(bucketByDay(s.data ?? [], "created_at"));
      const planMap = new Map<string, number>();
      (s.data ?? []).forEach((r: any) => planMap.set(r.plan_code, (planMap.get(r.plan_code) || 0) + 1));
      setByPlan(Array.from(planMap.entries()).map(([plan, count]) => ({ plan, count })));
      const revMap = new Map<string, number>();
      for (let i = 13; i >= 0; i--) revMap.set(format(subDays(new Date(), i), "MMM d"), 0);
      (p.data ?? []).filter((x: any) => x.status === "succeeded").forEach((r: any) => {
        const k = format(startOfDay(new Date(r.created_at)), "MMM d");
        if (revMap.has(k)) revMap.set(k, (revMap.get(k) || 0) + Number(r.amount));
      });
      setRevData(Array.from(revMap.entries()).map(([day, v]) => ({ day, v })));
    })();
  }, []);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card><CardHeader><CardTitle>User Growth (14d)</CardTitle></CardHeader><CardContent className="h-64">
        <ResponsiveContainer><LineChart data={growth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" /></LineChart></ResponsiveContainer>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>New Subscriptions (14d)</CardTitle></CardHeader><CardContent className="h-64">
        <ResponsiveContainer><BarChart data={subData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="v" fill="hsl(var(--accent))" /></BarChart></ResponsiveContainer>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Revenue (14d, EUR)</CardTitle></CardHeader><CardContent className="h-64">
        <ResponsiveContainer><LineChart data={revData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" /></LineChart></ResponsiveContainer>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Subscriptions by Plan</CardTitle></CardHeader><CardContent className="h-64">
        <ResponsiveContainer><BarChart data={byPlan}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="plan" /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--accent))" /></BarChart></ResponsiveContainer>
      </CardContent></Card>
    </div>
  );
}