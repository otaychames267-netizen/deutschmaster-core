import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * "Dein Fortschritt" — the student's own AI-trainer results over time, shown on the trainer start page. Source: voice_tutor_corrections.feedback.scores
 * (the exam-style estimate written by the post-session report: three Teil scores out of 25, total out of 75, CEFR level; pass mark 45). RLS lets a student
 * read only their own rows. Only sessions whose report was created appear (the report is generated when a session ends). It is an AI ESTIMATE without
 * pronunciation — the footnote says so, same wording as the report's own score card.
 */
const db = supabase as any;
const PASS_MARK = 45, MAX = 75;

interface Point { at: string; total: number; level: string | null; t1: number; t2: number; t3: number }

function parsePoint(row: { created_at: string; feedback: any }): Point | null {
  const s = row.feedback?.scores;
  const total = Number(s?.overall_score);
  if (!s || !Number.isFinite(total)) return null;
  return { at: row.created_at, total, level: typeof s.cefr_level === "string" ? s.cefr_level : null, t1: Number(s.teil1_score) || 0, t2: Number(s.teil2_score) || 0, t3: Number(s.teil3_score) || 0 };
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

function Sparkline({ points }: { points: Point[] }) {
  const W = 260, H = 64, PAD = 6;
  const x = (i: number) => (points.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (points.length - 1));
  const lo = Math.max(0, Math.min(PASS_MARK, ...points.map((p) => p.total)) - 6), hi = Math.min(MAX, Math.max(PASS_MARK, ...points.map((p) => p.total)) + 6);
  const y = (v: number) => H - PAD - ((Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo)) * (H - 2 * PAD);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Verlauf deiner letzten ${points.length} Ergebnisse, zuletzt ${last.total} von ${MAX}`} className="h-16 w-full">
      <line x1={PAD} x2={W - PAD} y1={y(PASS_MARK)} y2={y(PASS_MARK)} className="stroke-emerald-500/50" strokeWidth="1" strokeDasharray="4 3" />
      <text x={W - PAD} y={y(PASS_MARK) - 3} textAnchor="end" className="fill-emerald-600 text-[8px] dark:fill-emerald-400">{PASS_MARK}</text>
      {points.length > 1 && <path d={path} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      {points.map((p, i) => (
        <circle key={p.at} cx={x(i)} cy={y(p.total)} r={i === points.length - 1 ? 3.5 : 2.5} className={p.total >= PASS_MARK ? "fill-emerald-500" : "fill-rose-500"} />
      ))}
    </svg>
  );
}

export function VoiceTutorProgress() {
  const [points, setPoints] = useState<Point[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await db.from("voice_tutor_corrections").select("created_at, feedback").order("created_at", { ascending: false }).limit(14);
        if (!alive) return;
        const parsed = ((data ?? []) as { created_at: string; feedback: any }[]).map(parsePoint).filter((p): p is Point => p !== null).reverse(); // oldest -> newest
        setPoints(parsed);
      } catch { if (alive) setPoints([]); }
    })();
    return () => { alive = false; };
  }, []);

  if (points === null) return null;

  if (points.length === 0) {
    return (
      <section aria-label="Dein Fortschritt" className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Dein Fortschritt</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Nach deiner ersten Sitzung siehst du hier deine geschätzte Punktzahl — und mit jeder weiteren Sitzung, wie du dich verbesserst.
        </p>
        <p dir="rtl" lang="ar" className="mt-1 text-[11px] leading-relaxed text-muted-foreground">بعد جلستك الأولى تظهر هنا درجتك التقديرية، ومع كل جلسة جديدة تشوف تقدّمك.</p>
      </section>
    );
  }

  const last = points[points.length - 1];
  const best = Math.max(...points.map((p) => p.total));
  const recent = points.slice(-5);
  const avg = Math.round(recent.reduce((a, p) => a + p.total, 0) / recent.length);
  const trend = points.length >= 2 ? last.total - points[0].total : 0;

  return (
    <section aria-label="Dein Fortschritt" className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground"><TrendingUp className="h-4 w-4 text-primary" aria-hidden /> Dein Fortschritt</h2>
        {points.length >= 2 && (
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${trend >= 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/15 text-rose-700 dark:text-rose-400"}`}>
            {trend >= 0 ? "+" : "−"}{Math.abs(trend)} seit Start
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Zuletzt", value: `${last.total}`, sub: `/ ${MAX}` },
          { label: "Bestwert", value: `${best}`, sub: `/ ${MAX}` },
          { label: `Ø letzte ${recent.length}`, value: `${avg}`, sub: `/ ${MAX}` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-muted/50 px-2 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="text-xl font-black tabular-nums text-foreground">{s.value}<span className="text-[10px] font-semibold text-muted-foreground"> {s.sub}</span></p>
          </div>
        ))}
      </div>

      <div className="mt-3"><Sparkline points={points} /></div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{fmtDay(points[0].at)}</span><span>{fmtDay(last.at)}</span></div>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Letzte Sitzungen · Teil 1 · 2 · 3 (je /25)</p>
      <ul className="mt-1 divide-y divide-border text-xs">
        {[...points].reverse().slice(0, 5).map((p) => (
          <li key={p.at} className="flex items-center justify-between gap-3 py-1.5">
            <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{fmtDay(p.at)}</span>
            <span className="min-w-0 flex-1 whitespace-nowrap tabular-nums text-muted-foreground">{p.t1} · {p.t2} · {p.t3}<span className="hidden sm:inline"> (Teil 1 · 2 · 3)</span></span>
            <span className="shrink-0 font-bold tabular-nums text-foreground">{p.total}<span className="font-normal text-muted-foreground"> / {MAX}</span></span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.total >= PASS_MARK ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/15 text-rose-700 dark:text-rose-400"}`}>
              {p.total >= PASS_MARK ? "Bestanden" : "Noch nicht"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        KI-Schätzung nach dem telc-Raster, ohne Aussprache — keine offizielle Bewertung. Bestanden = ab {PASS_MARK} von {MAX} Punkten.
      </p>
    </section>
  );
}
