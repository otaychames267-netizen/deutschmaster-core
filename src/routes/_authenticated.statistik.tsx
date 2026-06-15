import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, Clock, Flame, Target, TrendingUp, BookOpenCheck } from "lucide-react";
import { getMyProgress } from "@/lib/exercises/progress.functions";

export const Route = createFileRoute("/_authenticated/statistik")({
  head: () => ({ meta: [{ title: "Statistik — Lingovia" }] }),
  component: StatistikPage,
});

const MODULE_LABELS: Record<string, string> = {
  lesen: "Lesen", hoeren: "Hören", sprachbausteine: "Sprachbausteine", schreiben: "Schreiben", muendlich: "Mündlich",
};

type Progress = Awaited<ReturnType<typeof getMyProgress>>;

function StatistikPage() {
  const fetchProgress = useServerFn(getMyProgress);
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => { fetchProgress().then((r) => setP(r as Progress)).catch(() => {}); }, [fetchProgress]);

  const stats = [
    { icon: Clock, label: "Heute gelernt", value: `${p?.minutesToday ?? 0} min`, sub: "Ziel: 30 min" },
    { icon: BookOpenCheck, label: "Versuche (60 Tage)", value: String(p?.totalAttempts ?? 0), sub: `Genauigkeit ${p?.accuracy ?? 0}%` },
    { icon: Flame, label: "Lernserie", value: `${p?.streak ?? 0} Tage`, sub: (p?.streak ?? 0) > 0 ? "Weiter so!" : "Heute lernen, um zu starten" },
    { icon: Target, label: "Tagesziel", value: `${p?.minutesToday ?? 0} / 30 min`, sub: "Heute" },
  ];
  const areas = (["lesen", "hoeren", "sprachbausteine", "schreiben", "muendlich"] as const).map((k) => {
    const m = p?.modules?.[k];
    const pct = m && m.total ? Math.round((m.completed / m.total) * 100) : 0;
    return { label: MODULE_LABELS[k], value: pct, sub: m ? `${m.completed}/${m.total} · Ø ${m.avg}%` : "—" };
  });

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
                <span>{a.label}</span><span className="text-muted-foreground">{a.value}% · {a.sub}</span>
              </div>
              <Progress value={a.value} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}