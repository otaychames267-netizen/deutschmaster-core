import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type UserLevel } from "@/lib/auth";
import { toast } from "sonner";
import {
  Timer, Play, Send, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Loader2, BookOpen,
  Headphones, Wrench, PenLine, Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/schriftlich/pruefung")({
  component: SchriftlichPruefungPage,
});

/* ─── Constants ─────────────────────────────────────────────── */

const EXAM_DURATION_SEC = 145 * 60; // 2h25

const SECTIONS = [
  { key: "lesen",         label: "Lesen",          icon: BookOpen,    teile: ["teil_1","teil_2","teil_3"] },
  { key: "sprachbausteine", label: "Sprachbausteine", icon: Wrench,    teile: ["teil_1","teil_2"] },
  { key: "hoeren",        label: "Hören",           icon: Headphones,  teile: ["teil_1","teil_2","teil_3"] },
  { key: "schreiben",     label: "Schreiben",       icon: PenLine,     teile: [] },
] as const;

/* ─── Timer ─────────────────────────────────────────────────── */

function useCountdown(totalSec: number, running: boolean, onExpire: () => void) {
  const [remaining, setRemaining] = useState(totalSec);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(ref.current!);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current!);
  }, [running, onExpire]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const formatted = `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  const pct = (remaining / totalSec) * 100;

  return { remaining, formatted, pct };
}

/* ─── Types ─────────────────────────────────────────────────── */

interface ExamRecord {
  id: string;
  title: string;
  section: string;
  teil: string | null;
}

interface ItemRecord {
  id: string;
  exam_id: string;
  position: number;
  kind: string;
  content: Record<string, unknown>;
  points: number;
}

/* ─── Simple item renderers (inline, minimal) ─────────────────── */

function McqItem({ content, answer, onChange }: { content: Record<string, unknown>; answer: string; onChange: (v:string)=>void }) {
  const question = content.question as string ?? content.passage as string ?? "";
  const options   = (content.options as {label:string;text:string}[]) ?? [];
  return (
    <div className="space-y-4">
      {(content.passage as string) && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {content.passage as string}
        </div>
      )}
      {question && question !== content.passage && <p className="font-medium text-foreground text-sm">{question}</p>}
      <div className="space-y-2">
        {options.map((opt) => (
          <button key={opt.label} onClick={() => onChange(opt.label)}
            className={`flex w-full items-start gap-2.5 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
              answer === opt.label ? "border-primary bg-primary/5 font-medium" : "border-border bg-card hover:border-primary/30"
            }`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold mt-0.5 ${
              answer === opt.label ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}>{opt.label}</span>
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function GapItem({ content, answer, onChange }: { content: Record<string, unknown>; answer: string; onChange: (v:string)=>void }) {
  const options = (content.options as string[]) ?? [];
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed">
        {content.before as string} <span className="rounded border border-dashed border-primary px-3 py-0.5 font-medium text-primary">{answer || "___"}</span> {content.after as string}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {options.map((opt, i) => (
          <button key={opt} onClick={() => onChange(opt)}
            className={`rounded-xl border px-3 py-2 text-sm transition-all ${
              answer === opt ? "border-primary bg-primary/5 font-medium" : "border-border bg-card hover:border-primary/30"
            }`}>
            {String.fromCharCode(65+i)}. {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function WritingItem({ content, answer, onChange }: { content: Record<string, unknown>; answer: string; onChange: (v:string)=>void }) {
  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm leading-relaxed whitespace-pre-wrap">{content.task as string}</div>
      <textarea value={answer} onChange={(e) => onChange(e.target.value)} rows={10}
        placeholder="Schreiben Sie Ihren Text hier…"
        className="w-full resize-none rounded-xl border border-input bg-background p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/20" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{wordCount} Wörter</span>
        <span>Ziel: 80–100 Wörter</span>
      </div>
    </div>
  );
}

function renderItem(item: ItemRecord, answer: string, onChange: (v:string)=>void) {
  if (item.kind === "gap_fill") return <GapItem content={item.content} answer={answer} onChange={onChange} />;
  if (item.kind === "writing_prompt") return <WritingItem content={item.content} answer={answer} onChange={onChange} />;
  return <McqItem content={item.content} answer={answer} onChange={onChange} />;
}

/* ─── Pre-exam screen ───────────────────────────────────────── */

function PreExamScreen({ hasContent, onStart }: { hasContent: boolean; onStart: () => void }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Prüfungssimulation — Schriftlich</h1>
        <p className="text-sm text-muted-foreground">Vollständige schriftliche Prüfung: Lesen + Sprachbausteine + Hören + Schreiben</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Gesamtzeit", "2h 25min"], ["Sektionen", "4"], ["Teile", "9"], ["Aufgaben", "~45"]].map(([l,v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-primary">{v}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
        <p className="font-semibold text-foreground">Prüfungsablauf</p>
        {SECTIONS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <Icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
        ))}
      </div>

      {!hasContent && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-foreground">Noch keine Aufgaben verfügbar</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Die Prüfungssimulation wird automatisch generiert, sobald der Admin Übungen über den PDF-Import hochgeladen hat. Nutzen Sie bis dahin die einzelnen Vorbereitung-Sektionen.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Wichtige Hinweise</p>
          <ul className="mt-2 space-y-1">
            <li>• Der Timer läuft nach dem Start nicht an und kann nicht pausiert werden.</li>
            <li>• Ihre Antworten werden automatisch gespeichert.</li>
            <li>• Bei Ablauf der Zeit wird die Prüfung automatisch abgegeben.</li>
          </ul>
        </div>
      </div>

      <button
        onClick={onStart}
        disabled={!hasContent}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Play className="h-4 w-4" /> Prüfung starten
      </button>
    </div>
  );
}

/* ─── Results screen ────────────────────────────────────────── */

function ResultsScreen({ score, totalItems, answeredItems }: { score: number; totalItems: number; answeredItems: number }) {
  const passed = score >= 60;
  return (
    <div className="mx-auto max-w-lg space-y-6 pb-8 text-center">
      <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-2xl ${passed ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
        {passed ? <CheckCircle2 className="h-12 w-12 text-emerald-500" /> : <AlertCircle className="h-12 w-12 text-destructive" />}
      </div>
      <div>
        <p className="text-4xl font-bold text-foreground">{score.toFixed(0)}%</p>
        <p className="mt-1 text-muted-foreground">{answeredItems} / {totalItems} Aufgaben beantwortet</p>
        <p className={`mt-2 font-semibold ${passed ? "text-emerald-500" : "text-destructive"}`}>
          {passed ? "Bestanden! Weiter so." : "Nicht bestanden — üben Sie weiter!"}
        </p>
      </div>
      <button onClick={() => window.location.reload()}
        className="mx-auto flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
        Neue Prüfung starten
      </button>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */

function SchriftlichPruefungPage() {
  const { user, level } = useAuth();
  const [phase, setPhase] = useState<"pre" | "exam" | "result">("pre");
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultScore, setResultScore] = useState(0);

  const handleExpire = useCallback(() => {
    toast.warning("Zeit abgelaufen! Prüfung wird automatisch abgegeben.");
    submitExam();
  }, []);

  const { formatted: timerFormatted, pct: timerPct } = useCountdown(
    EXAM_DURATION_SEC,
    phase === "exam",
    handleExpire,
  );

  useEffect(() => {
    if (!level) return;

    async function fetchItems() {
      setLoading(true);

      const allItems: ItemRecord[] = [];

      for (const section of SECTIONS) {
        const teile = section.teile.length > 0 ? section.teile : [null];
        for (const teil of teile) {
          let q = supabase
            .from("exams")
            .select("id, title, section, teil")
            .eq("level", level as UserLevel)
            .eq("module", "schriftlich")
            .eq("section", section.key)
            .eq("exam_type", "vorbereitung")
            .eq("status", "published")
            .order("display_order", { ascending: true })
            .limit(1);

          if (teil) q = q.eq("teil", teil);
          else q = q.is("teil", null);

          const { data: exams } = await q;
          if (!exams || exams.length === 0) continue;

          const exam = exams[0] as ExamRecord;
          const { data: examItems } = await supabase
            .from("exam_items")
            .select("id, exam_id, position, kind, content, points")
            .eq("exam_id", exam.id)
            .order("position", { ascending: true });

          if (examItems) allItems.push(...(examItems as ItemRecord[]));
        }
      }

      setItems(allItems);
      setLoading(false);
    }

    fetchItems();
  }, [level]);

  async function startExam() {
    if (!user) return;

    const { data: sess } = await supabase
      .from("attempt_sessions")
      .insert({
        user_id: user.id,
        exam_id: items[0]?.exam_id ?? "",
        status: "in_progress",
        expires_at: new Date(Date.now() + EXAM_DURATION_SEC * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (sess) setSessionId(sess.id as string);
    setCurrent(0);
    setAnswers({});
    setPhase("exam");
  }

  function handleChange(itemId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
    if (sessionId) {
      supabase.from("attempt_answers")
        .upsert({ session_id: sessionId, item_id: itemId, answer: value as never })
        .then(() => {});
    }
  }

  async function submitExam() {
    if (!sessionId || !user || submitting) return;
    setSubmitting(true);

    await supabase.from("attempt_sessions")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", sessionId);

    const answered = Object.keys(answers).length;
    const score = items.length > 0 ? Math.round((answered / items.length) * 70) : 0;

    await supabase.from("attempt_results").insert({
      session_id:    sessionId,
      user_id:       user.id,
      exam_id:       items[0]?.exam_id ?? "",
      score,
      points_earned: answered,
      points_total:  items.length,
      passed:        score >= 60,
    });

    setResultScore(score);
    setSubmitting(false);
    setPhase("result");
    toast.success("Prüfung abgegeben!");
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === "pre") {
    return <PreExamScreen hasContent={items.length > 0} onStart={startExam} />;
  }

  if (phase === "result") {
    return <ResultsScreen score={resultScore} totalItems={items.length} answeredItems={Object.keys(answers).length} />;
  }

  const item = items[current];
  const isLast = current === items.length - 1;
  const timerCritical = timerPct < 10;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 -mx-1 rounded-2xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            Aufgabe {current + 1} / {items.length}
          </p>
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-mono font-semibold ${
            timerCritical ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border text-foreground"
          }`}>
            <Timer className="h-4 w-4" /> {timerFormatted}
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timerCritical ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>
        <div className="mt-2 flex gap-1 flex-wrap">
          {items.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`h-1.5 flex-1 min-w-[4px] max-w-[8px] rounded-full transition-colors ${
                i === current ? "bg-primary" : answers[items[i].id] ? "bg-emerald-500" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Item */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {renderItem(item, answers[item.id] ?? "", (v) => handleChange(item.id, v))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrent((c) => Math.max(0, c-1))} disabled={current === 0}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground disabled:opacity-40 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Zurück
        </button>

        {isLast ? (
          <button onClick={submitExam} disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Abgeben
          </button>
        ) : (
          <button onClick={() => setCurrent((c) => Math.min(items.length-1, c+1))}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Weiter <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
