import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { fetchServerOffsetMs } from "@/lib/muendlich/room";
import { LockedExerciseOverview } from "@/components/LockedExerciseOverview";
import { toast } from "sonner";
import {
  Timer, Play, Send, ChevronRight, AlertCircle, CheckCircle2,
  Loader2, BookOpen, Headphones, Wrench, PenLine,
} from "lucide-react";
import {
  LesenT1Input, LesenT2Input, LesenT3Input, SBT1Input, SBT2Input, HoerenInput, SchreibenInput,
  type LesenT1Data, type LesenT2Data, type LesenT3Data, type SBT1Data, type SBT2Data, type HoerenData,
} from "@/components/exam-simulation/SimulationInputs";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/pruefung")({
  component: SchriftlichPruefungPage,
});

const EXAM_DURATION_SEC = 145 * 60; // 2h25

type SectionKey = "lesen_t1" | "lesen_t2" | "lesen_t3" | "sb_t1" | "sb_t2" | "hoeren_t1" | "hoeren_t2" | "hoeren_t3" | "schreiben";

const SECTIONS: { key: SectionKey; label: string; group: string; icon: typeof BookOpen }[] = [
  { key: "lesen_t1",   label: "Lesen — Teil 1",           group: "Lesen",           icon: BookOpen },
  { key: "lesen_t2",   label: "Lesen — Teil 2",           group: "Lesen",           icon: BookOpen },
  { key: "lesen_t3",   label: "Lesen — Teil 3",           group: "Lesen",           icon: BookOpen },
  { key: "sb_t1",      label: "Sprachbausteine — Teil 1", group: "Sprachbausteine", icon: Wrench },
  { key: "sb_t2",      label: "Sprachbausteine — Teil 2", group: "Sprachbausteine", icon: Wrench },
  { key: "hoeren_t1",  label: "Hören — Teil 1",           group: "Hören",           icon: Headphones },
  { key: "hoeren_t2",  label: "Hören — Teil 2",           group: "Hören",           icon: Headphones },
  { key: "hoeren_t3",  label: "Hören — Teil 3",           group: "Hören",           icon: Headphones },
  { key: "schreiben",  label: "Schreiben",                group: "Schreiben",       icon: PenLine },
];

interface AttemptRow {
  id: string;
  status: "in_progress" | "submitted" | "expired";
  expires_at: string;
  current_section: SectionKey;
  answers: Record<string, Record<string, unknown>>;
  schreiben_text: string | null;
  lesen_t1_id: string; lesen_t2_id: string; lesen_t3_id: string;
  sb_t1_id: string; sb_t2_id: string;
  hoeren_t1_id: string; hoeren_t2_id: string; hoeren_t3_id: string;
  schreiben_exam_id: string;
}

interface ResultShape {
  score_lesen: number; score_sb: number; score_hoeren: number; score_schreiben: number;
  score_total: number; passed: boolean;
}

/* ─── Content loaders — one per section, whitelisted columns only (never the answer key) ─── */

async function loadSectionContent(section: SectionKey, attempt: AttemptRow): Promise<unknown> {
  switch (section) {
    case "lesen_t1": {
      const [{ data: headlines }, { data: texts }] = await Promise.all([
        supabase.from("lesen_t1_headlines").select("letter, text").eq("exercise_id", attempt.lesen_t1_id),
        supabase.from("lesen_t1_texts").select("position, title, content").eq("exercise_id", attempt.lesen_t1_id).order("position"),
      ]);
      return { headlines: headlines ?? [], texts: texts ?? [] } as LesenT1Data;
    }
    case "lesen_t2": {
      const [{ data: passage }, { data: questions }] = await Promise.all([
        supabase.from("lesen_t2_passages").select("passage").eq("exercise_id", attempt.lesen_t2_id).maybeSingle(),
        supabase.from("lesen_t2_questions").select("number, question, option_a, option_b, option_c").eq("exercise_id", attempt.lesen_t2_id).order("number"),
      ]);
      return { passage: passage?.passage ?? "", questions: questions ?? [] } as LesenT2Data;
    }
    case "lesen_t3": {
      const [{ data: situations }, { data: texts }] = await Promise.all([
        supabase.from("lesen_t3_situations").select("number, description").eq("exercise_id", attempt.lesen_t3_id).order("number"),
        supabase.from("lesen_t3_texts").select("letter, title, content").eq("exercise_id", attempt.lesen_t3_id).order("letter"),
      ]);
      return { situations: situations ?? [], texts: texts ?? [] } as LesenT3Data;
    }
    case "sb_t1": {
      const [{ data: passage }, { data: gaps }] = await Promise.all([
        supabase.from("sb_t1_passages").select("passage").eq("exercise_id", attempt.sb_t1_id).maybeSingle(),
        (supabase as any).from("sb_t1_gaps_student").select("gap_number, option_a, option_b, option_c").eq("exercise_id", attempt.sb_t1_id).order("gap_number"),
      ]);
      return { passage: passage?.passage ?? "", gaps: gaps ?? [] } as SBT1Data;
    }
    case "sb_t2": {
      const [{ data: passage }, { data: words }] = await Promise.all([
        supabase.from("sb_t2_passages").select("passage").eq("exercise_id", attempt.sb_t2_id).maybeSingle(),
        supabase.from("sb_t2_words").select("word_number, word").eq("exercise_id", attempt.sb_t2_id).order("word_number"),
      ]);
      return { passage: passage?.passage ?? "", words: words ?? [] } as SBT2Data;
    }
    case "hoeren_t1":
    case "hoeren_t2":
    case "hoeren_t3": {
      const exId = section === "hoeren_t1" ? attempt.hoeren_t1_id : section === "hoeren_t2" ? attempt.hoeren_t2_id : attempt.hoeren_t3_id;
      const [{ data: ex }, { data: statements }] = await Promise.all([
        supabase.from("hoeren_exercises").select("instructions, image_path").eq("id", exId).maybeSingle(),
        (supabase as any).from("hoeren_statements_student").select("statement_number, statement_text").eq("exercise_id", exId).order("statement_number"),
      ]);
      const imageUrl = ex?.image_path ? supabase.storage.from("hoeren-images").getPublicUrl(ex.image_path).data.publicUrl : null;
      return { instructions: ex?.instructions ?? null, imageUrl, statements: statements ?? [] } as HoerenData;
    }
    case "schreiben": {
      const { data: item } = await supabase.from("exam_items").select("content").eq("exam_id", attempt.schreiben_exam_id).eq("kind", "writing_prompt").maybeSingle();
      return { task: (item?.content as any)?.task ?? "" };
    }
  }
}

/* ─── Pre-exam screen ───────────────────────────────────────── */

function PreExamScreen({ onStart, starting }: { onStart: () => void; starting: boolean }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Prüfungssimulation — Schriftlich</h1>
        <p className="text-sm text-muted-foreground">Vollständige schriftliche Prüfung: Lesen + Sprachbausteine + Hören + Schreiben</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Gesamtzeit", "2h 25min"], ["Sektionen", "4"], ["Teile", "9"], ["Aufgaben", "~45"]].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
            <p className="text-xl font-bold text-primary">{v}</p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
        <p className="font-semibold text-foreground">Prüfungsablauf</p>
        {(["Lesen", "Sprachbausteine", "Hören", "Schreiben"] as const).map((label) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Wichtige Hinweise</p>
          <ul className="mt-2 space-y-1">
            <li>• Sie bearbeiten die Teile nacheinander — immer nur ein Teil ist sichtbar.</li>
            <li>• Der Timer läuft nach dem Start durchgehend und kann nicht pausiert werden.</li>
            <li>• Ihre Antworten werden nach jedem Teil automatisch gespeichert.</li>
            <li>• Bei Ablauf der Zeit wird die Prüfung automatisch abgegeben und bewertet.</li>
            <li>• Sie können bis zu 20 vollständige Simulationen pro Monat starten.</li>
          </ul>
        </div>
      </div>

      <button onClick={onStart} disabled={starting}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Prüfung starten
      </button>
    </div>
  );
}

/* ─── Result screen ─────────────────────────────────────────── */

function ResultsScreen({ result }: { result: ResultShape }) {
  const rows = [
    { label: "Lesen", score: result.score_lesen, max: 75 },
    { label: "Sprachbausteine", score: result.score_sb, max: 30 },
    { label: "Hören", score: result.score_hoeren, max: 75 },
    { label: "Schreiben", score: result.score_schreiben, max: 45 },
  ];
  return (
    <div className="mx-auto max-w-lg space-y-6 pb-8 text-center">
      <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-2xl ${result.passed ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
        {result.passed ? <CheckCircle2 className="h-12 w-12 text-emerald-500" /> : <AlertCircle className="h-12 w-12 text-destructive" />}
      </div>
      <div>
        <p className="text-4xl font-bold text-foreground">{result.score_total} / 225</p>
        <p className={`mt-2 font-semibold ${result.passed ? "text-emerald-500" : "text-destructive"}`}>
          {result.passed ? "BESTANDEN" : "NICHT BESTANDEN"}
        </p>
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5 text-left">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{r.label}</span>
              <span className="text-muted-foreground">{r.score} / {r.max}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(r.score / r.max) * 100}%` }} />
            </div>
          </div>
        ))}
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
  const { user } = useAuth();
  const level = useActiveLevel();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess();

  const [phase, setPhase] = useState<"loading" | "pre" | "exam" | "submitting" | "result">("loading");
  const [starting, setStarting] = useState(false);
  const [attempt, setAttempt] = useState<AttemptRow | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [sectionData, setSectionData] = useState<unknown>(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [schreibenText, setSchreibenText] = useState("");
  const [result, setResult] = useState<ResultShape | null>(null);
  const [remaining, setRemaining] = useState(EXAM_DURATION_SEC);

  const offsetRef = useRef(0);
  const submittingRef = useRef(false);
  const currentSection = SECTIONS[sectionIndex]?.key;

  // ── Resume check on mount ──────────────────────────────────
  useEffect(() => {
    if (!user || !level || hasAccess !== true) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("simulation_attempts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "in_progress")
        .gt("expires_at", new Date().toISOString())
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        offsetRef.current = await fetchServerOffsetMs();
        setAttempt(data as AttemptRow);
        const idx = SECTIONS.findIndex((s) => s.key === (data as AttemptRow).current_section);
        setSectionIndex(idx >= 0 ? idx : 0);
        setPhase("exam");
      } else {
        setPhase("pre");
      }
    })();
  }, [user, level, hasAccess]);

  // ── Load current section's content + seed local answer state ──
  useEffect(() => {
    if (phase !== "exam" || !attempt || !currentSection) return;
    setSectionLoading(true);
    loadSectionContent(currentSection, attempt).then((data) => {
      setSectionData(data);
      if (currentSection === "schreiben") {
        setSchreibenText(attempt.schreiben_text ?? "");
      } else {
        setAnswers((attempt.answers?.[currentSection] as Record<string, unknown>) ?? {});
      }
      setSectionLoading(false);
    });
  }, [phase, attempt, currentSection]);

  const submitExam = useCallback(async () => {
    if (!attempt || !user || submittingRef.current) return;
    submittingRef.current = true;
    setPhase("submitting");
    try {
      if (currentSection === "schreiben") {
        await (supabase as any).rpc("save_simulation_progress", { p_attempt_id: attempt.id, p_schreiben_text: schreibenText });
      } else {
        await (supabase as any).rpc("save_simulation_progress", { p_attempt_id: attempt.id, p_section: currentSection, p_section_answers: answers });
      }
      await (supabase as any).rpc("score_simulation_sections", { p_attempt_id: attempt.id });

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/schreiben/submit-simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ attempt_id: attempt.id }),
      });
      if (!res.ok) throw new Error("submit failed");
      const data = await res.json();
      setResult(data as ResultShape);
      setPhase("result");
    } catch (e) {
      console.error("submitExam failed:", e);
      toast.error("Die Abgabe ist fehlgeschlagen. Bitte versuchen Sie es erneut.");
      submittingRef.current = false;
      setPhase("exam");
    }
  }, [attempt, user, currentSection, answers, schreibenText]);

  // ── Server-anchored timer ──────────────────────────────────
  useEffect(() => {
    if (phase !== "exam" || !attempt) return;
    const expiresAtMs = new Date(attempt.expires_at).getTime();
    const tick = () => {
      const serverNow = Date.now() + offsetRef.current;
      const rem = Math.max(0, Math.round((expiresAtMs - serverNow) / 1000));
      setRemaining(rem);
      if (rem === 0 && !submittingRef.current) {
        toast.warning("Zeit abgelaufen! Prüfung wird automatisch abgegeben.");
        submitExam();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, attempt, submitExam]);

  async function startExam() {
    if (!user) return;
    setStarting(true);
    try {
      const { data, error } = await (supabase as any).rpc("start_simulation", { p_user_id: user.id });
      if (error) throw error;
      offsetRef.current = await fetchServerOffsetMs();
      const { data: row } = await (supabase as any).from("simulation_attempts").select("*").eq("id", data.attempt_id).single();
      setAttempt(row as AttemptRow);
      setSectionIndex(0);
      setPhase("exam");
    } catch (e: any) {
      if (e?.message?.includes("MONTHLY_LIMIT_REACHED")) {
        toast.error("Sie haben Ihr monatliches Limit von 20 Simulationen erreicht.");
      } else if (e?.message?.includes("NOT_ENOUGH_CONTENT")) {
        toast.error("Noch nicht genug Aufgaben verfügbar. Bitte versuchen Sie es später erneut.");
      } else {
        toast.error("Die Prüfung konnte nicht gestartet werden.");
      }
    } finally {
      setStarting(false);
    }
  }

  async function handleWeiter() {
    if (!attempt) return;
    const isLast = sectionIndex === SECTIONS.length - 1;
    if (isLast) {
      await submitExam();
      return;
    }
    const nextSection = SECTIONS[sectionIndex + 1].key;
    try {
      if (currentSection === "schreiben") {
        await (supabase as any).rpc("save_simulation_progress", { p_attempt_id: attempt.id, p_schreiben_text: schreibenText, p_advance_to: nextSection });
      } else {
        await (supabase as any).rpc("save_simulation_progress", {
          p_attempt_id: attempt.id, p_section: currentSection, p_section_answers: answers, p_advance_to: nextSection,
        });
      }
      setAttempt((prev) => prev ? { ...prev, current_section: nextSection, answers: { ...prev.answers, [currentSection]: answers } } : prev);
      setSectionIndex((i) => i + 1);
    } catch (e) {
      console.error("save progress failed:", e);
      toast.error("Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.");
    }
  }

  if (accessLoading || phase === "loading") {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <LockedExerciseOverview
        heading="Prüfungssimulation — Schriftlich"
        subheading="Preview — subscribe to unlock the full exam simulation."
        items={[{ id: "pruefung-schriftlich", title: "Vollständige Prüfung (2h 25min) — Lesen, Sprachbausteine, Hören, Schreiben" }]}
      />
    );
  }

  if (phase === "pre") {
    return <PreExamScreen onStart={startExam} starting={starting} />;
  }

  if (phase === "result" && result) {
    return <ResultsScreen result={result} />;
  }

  // exam / submitting
  const h = Math.floor(remaining / 3600), m = Math.floor((remaining % 3600) / 60), s = remaining % 60;
  const timerFormatted = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const timerCritical = remaining < 600;
  const section = SECTIONS[sectionIndex];
  const isLast = sectionIndex === SECTIONS.length - 1;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <div className="sticky top-0 z-10 -mx-1 rounded-2xl border border-border bg-card/95 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <section.icon className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">{section.label}</p>
          </div>
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-mono font-semibold ${
            timerCritical ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-border text-foreground"
          }`}>
            <Timer className="h-4 w-4" /> {timerFormatted}
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          {SECTIONS.map((sec, i) => (
            <div key={sec.key} className={`h-1.5 flex-1 rounded-full transition-colors ${
              i === sectionIndex ? "bg-primary" : i < sectionIndex ? "bg-emerald-500" : "bg-muted"
            }`} />
          ))}
        </div>
      </div>

      {sectionLoading || phase === "submitting" ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {phase === "submitting" && <p className="text-sm text-muted-foreground">Wird bewertet — bitte warten…</p>}
        </div>
      ) : (
        <>
          {currentSection === "lesen_t1" && sectionData && (
            <LesenT1Input data={sectionData as LesenT1Data} value={answers as Record<string, string>} onChange={setAnswers} />
          )}
          {currentSection === "lesen_t2" && sectionData && (
            <LesenT2Input data={sectionData as LesenT2Data} value={answers as Record<string, string>} onChange={setAnswers} />
          )}
          {currentSection === "lesen_t3" && sectionData && (
            <LesenT3Input data={sectionData as LesenT3Data} value={answers as Record<string, string>} onChange={setAnswers} />
          )}
          {currentSection === "sb_t1" && sectionData && (
            <SBT1Input data={sectionData as SBT1Data} value={answers as Record<string, string>} onChange={setAnswers} />
          )}
          {currentSection === "sb_t2" && sectionData && (
            <SBT2Input data={sectionData as SBT2Data} value={answers as Record<string, string>} onChange={setAnswers} />
          )}
          {(currentSection === "hoeren_t1" || currentSection === "hoeren_t2" || currentSection === "hoeren_t3") && sectionData && (
            <HoerenInput data={sectionData as HoerenData} value={answers as Record<string, boolean>} onChange={setAnswers} />
          )}
          {currentSection === "schreiben" && sectionData && (
            <SchreibenInput task={(sectionData as { task: string }).task} value={schreibenText} onChange={setSchreibenText} />
          )}

          <div className="flex items-center justify-end">
            <button onClick={handleWeiter}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              {isLast ? <><Send className="h-4 w-4" /> Prüfung abgeben</> : <>Weiter <ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
