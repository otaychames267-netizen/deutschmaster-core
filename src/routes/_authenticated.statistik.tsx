import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Clock, Flame, Target, TrendingUp, BookOpenCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/statistik")({
  head: () => ({ meta: [{ title: "Statistik — Lingovia" }] }),
  component: StatistikPage,
});

function StatistikPage() {
  const stats = [
    { icon: Clock, label: "Lernzeit (Woche)", value: "0 min", sub: "Ziel: 150 min" },
    { icon: BookOpenCheck, label: "Abgeschlossene Übungen", value: "0", sub: "Alle Bereiche" },
    { icon: Flame, label: "Lernserie", value: "0 Tage", sub: "Heute lernen, um zu starten" },
    { icon: Target, label: "Tagesziel", value: "0 / 30 min", sub: "Heute" },
  ];
  const areas = [
    { label: "Lesen", value: 0 },
    { label: "Hören", value: 0 },
    { label: "Sprachbausteine", value: 0 },
    { label: "Schreiben", value: 0 },
    { label: "Mündlich", value: 0 },
  ];
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-accent/15 p-3 text-accent ring-1 ring-accent/30"><BarChart3 className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Statistik</h1>
          <p className="text-sm text-muted-foreground">Lernzeit, Übungen und Fortschritt im Überblick.</p>
        </div>
      </div>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide"><s.icon className="h-3.5 w-3.5" /> {s.label}</div>
              <p className="text-2xl font-bold mt-1.5">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-accent" /> Fortschritt nach Bereich</CardTitle>
          <CardDescription>Sobald Übungen abgeschlossen sind, erscheint hier dein Fortschritt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {areas.map((a) => (
            <div key={a.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{a.label}</span><span className="text-muted-foreground">{a.value}%</span>
              </div>
              <Progress value={a.value} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}