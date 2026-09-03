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
  Timer, Play, Send, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2,
  Loader2, BookOpen, Headphones, Wrench, PenLine,
} from "lucide-react";
import {
  LesenT1Input, LesenT2Input, LesenT3Input, HoerenInput, SchreibenInput,
  type LesenT1Data, type LesenT2Data, type LesenT3Data, type HoerenData,
} from "@/components/exam-simulation/SimulationInputs";
import { SBTeil1Exercise, type SBT1ExerciseData } from "@/components/exercise/sprachbausteine/SBTeil1Exercise";
import { SBTeil2Exercise, type SBT2ExerciseData } from "@/components/exercise/sprachbausteine/SBTeil2Exercise";
import { ProtectedContentGate } from "@/components/content-protection/ProtectedContentGate";
import {
  FehleranalyseSection, SchreibenCorrections,
  resolveLesenT1, resolveLesenT2, resolveLesenT3, resolveSbT1, resolveSbT2, resolveHoeren,
  type FehlerItem,
} from "@/components/exam-simulation/Fehleranalyse";
import type { EssayCorrection } from "@/lib/grading/essay-grader";

export const Route = createFileRoute("/_authenticated/$level/schriftlich/pruefung")({
  component: () => (
    <ProtectedContentGate>
      <SchriftlichPruefungPage />
    </ProtectedContentGate>
  ),
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
      const [{ data: ex }, { data: passage }, { data: gaps }] = await Promise.all([
        supabase.from("sb_exercises").select("title").eq("id", attempt.sb_t1_id).maybeSingle(),
        supabase.from("sb_t1_passages").select("passage").eq("exercise_id", attempt.sb_t1_id).maybeSingle(),
        (supabase as any).from("sb_t1_gaps_student").select("gap_number, option_a, option_b, option_c").eq("exercise_id", attempt.sb_t1_id).order("gap_number"),
      ]);
      return {
        id: attempt.sb_t1_id, title: ex?.title ?? "Sprachbausteine — Teil 1",
        passage: passage?.passage ?? "", gaps: gaps ?? [],
      } as SBT1ExerciseData;
    }
    case "sb_t2": {
      const [{ data: ex }, { data: passage }, { data: words }] = await Promise.all([
        supabase.from("sb_exercises").select("title").eq("id", attempt.sb_t2_id).maybeSingle(),
        supabase.from("sb_t2_passages").select("passage").eq("exercise_id", attempt.sb_t2_id).maybeSingle(),
        supabase.from("sb_t2_words").select("word_number, word").eq("exercise_id", attempt.sb_t2_id).order("word_number"),
      ]);
      return {
        id: attempt.sb_t2_id, title: ex?.title ?? "Sprachbausteine — Teil 2",
        passage: passage?.passage ?? "", words: words ?? [],
      } as SBT2ExerciseData;
    }
    case "hoeren_t1":
    case "hoeren_t2":
    case "hoeren_t3": {
      const exId = section === "hoeren_t1" ? attempt.hoeren_t1_id : section === "hoeren_t2" ? attempt.hoeren_t2_id : attempt.hoeren_t3_id;
      const [{ data: ex }, { data: statements }] = await Promise.all([
        supabase.from("hoeren_exercises").select("instructions, image_path").eq("id", exId).maybeSingle(),
        (supabase as any).from("hoeren_statements_student").select("statement_number, statement_text").eq("exercise_id", exId).order("statement_number"),
      ]);
      // hoeren-images has been a private, plan-gated bucket since
      // 20260719121000_gate_premium_storage_buckets.sql — getPublicUrl
      // against it produces a URL Storage rejects. Must be a short-lived
      // signed URL, same as HoerenTeilPage.tsx's vorbereitung path.
      const imageUrl = ex?.image_path
        ? (await supabase.storage.from("hoeren-images").createSignedUrl(ex.image_path, 3600)).data?.signedUrl ?? null
        : null;
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
            <li>• Sie können mit Zurück / Weiter frei zwischen bereits besuchten Teilen wechseln.</li>
            <li>• Der Timer läuft nach dem Start durchgehend und kann nicht pausiert werden.</li>
            <li>• Ihre Antworten werden bei jeder Navigation automatisch gespeichert.</li>
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

interface FehleranalyseData {
  bySection: Record<Exclude<SectionKey, "schreiben">, FehlerItem[]>;
  schreibenCorrections: EssayCorrection[];
  schreibenBlank: boolean;
}

/** Loads everything the Arabic Fehleranalyse needs and isn't already in
 * `attempt`/`result` state: the authoritative `section_results` snapshot
 * (written once by score_simulation_sections, at scoring time — the
 * `attempt` row in the parent's state is stale, fetched before scoring),
 * each section's own content (option/headline/statement text, to resolve
 * answer keys into human-readable text), and the essay grading's
 * `corrections` array. Read-only, side-effect-free — safe to run every
 * time the results screen mounts. */
function useFehleranalyse(attempt: AttemptRow, essayGradingId: string | null): { data: FehleranalyseData | null; loading: boolean } {
  const [data, setData] = useState<FehleranalyseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: row }, contents, gradingRes] = await Promise.all([
        (supabase as any).from("simulation_attempts").select("section_results").eq("id", attempt.id).maybeSingle(),
        Promise.all(SECTIONS.filter((s) => s.key !== "schreiben").map((s) => loadSectionContent(s.key, attempt))),
        essayGradingId
          ? (supabase as any).from("essay_gradings").select("feedback").eq("id", essayGradingId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      const sr = (row?.section_results ?? {}) as Record<string, any>;
      const objectiveSections = SECTIONS.filter((s) => s.key !== "schreiben").map((s) => s.key);
      const contentBySection = Object.fromEntries(objectiveSections.map((k, i) => [k, contents[i]])) as Record<string, unknown>;

      const bySection: FehleranalyseData["bySection"] = {
        lesen_t1: resolveLesenT1(sr.lesen_t1, contentBySection.lesen_t1 as any),
        lesen_t2: resolveLesenT2(sr.lesen_t2, contentBySection.lesen_t2 as any),
        lesen_t3: resolveLesenT3(sr.lesen_t3, contentBySection.lesen_t3 as any),
        sb_t1: resolveSbT1(sr.sb_t1, contentBySection.sb_t1 as any),
        sb_t2: resolveSbT2(sr.sb_t2),
        hoeren_t1: resolveHoeren(1, sr.hoeren_t1, contentBySection.hoeren_t1 as any),
        hoeren_t2: resolveHoeren(2, sr.hoeren_t2, contentBySection.hoeren_t2 as any),
        hoeren_t3: resolveHoeren(3, sr.hoeren_t3, contentBySection.hoeren_t3 as any),
      };
      const feedback = (gradingRes as any)?.data?.feedback as { corrections?: EssayCorrection[] } | undefined;
      setData({
        bySection,
        schreibenCorrections: feedback?.corrections ?? [],
        schreibenBlank: !essayGradingId,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [attempt.id, essayGradingId]);

  return { data, loading };
}

const SECTION_GROUP_LABEL: Record<string, string> = { Lesen: "Lesen", Sprachbausteine: "Sprachbausteine", Hören: "Hören" };

function ResultsScreen({ result, attempt, essayGradingId }: { result: ResultShape; attempt: AttemptRow; essayGradingId: string | null }) {
  const rows = [
    { label: "Lesen", score: result.score_lesen, max: 75 },
    { label: "Sprachbausteine", score: result.score_sb, max: 30 },
    { label: "Hören", score: result.score_hoeren, max: 75 },
    { label: "Schreiben", score: result.score_schreiben, max: 45 },
  ];
  const { data: fehler, loading: fehlerLoading } = useFehleranalyse(attempt, essayGradingId);

  const groups = fehler
    ? (["Lesen", "Sprachbausteine", "Hören"] as const).map((group) => ({
        group,
        sections: SECTIONS.filter((s) => s.group === group).map((s) => ({ key: s.key as Exclude<SectionKey, "schreiben">, items: fehler.bySection[s.key as Exclude<SectionKey, "schreiben">] ?? [] })),
      }))
    : [];
  const totalMistakes = fehler
    ? Object.values(fehler.bySection).reduce((n, items) => n + items.length, 0) + fehler.schreibenCorrections.length
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="mx-auto max-w-lg space-y-6 text-center">
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

      {/* ── Fehleranalyse (Arabic mistake analysis) ── */}
      <div className="space-y-5">
        <div dir="rtl" lang="ar" className="flex items-center justify-between border-t border-border pt-6">
          <h2 className="text-lg font-black text-foreground">📊 تحليل الأخطاء (Fehleranalyse)</h2>
          {fehlerLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {!fehlerLoading && fehler && totalMistakes === 0 && (
          <div dir="rtl" lang="ar" className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">🎉 لا توجد أخطاء لتحليلها — أداء ممتاز في هذه المحاولة!</p>
          </div>
        )}

        {fehler && groups.map(({ group, sections }) => {
          const groupHasMistakes = sections.some((s) => s.items.length > 0);
          if (!groupHasMistakes) return null;
          return (
            <div key={group} className="space-y-3">
              <h3 dir="rtl" lang="ar" className="text-sm font-bold text-foreground">{SECTION_GROUP_LABEL[group]}</h3>
              {sections.map(({ key, items }) => <FehleranalyseSection key={key} sectionKey={key} items={items} />)}
            </div>
          );
        })}

        {fehler && (fehler.schreibenCorrections.length > 0 || fehler.schreibenBlank) && (
          <div className="space-y-3">
            <h3 dir="rtl" lang="ar" className="text-sm font-bold text-foreground">Schreiben</h3>
            {fehler.schreibenBlank ? (
              <div dir="rtl" lang="ar" className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-5 text-sm text-muted-foreground">
                لم يتم تسليم نص كافٍ في جزء الكتابة (Schreiben) في هذه المحاولة، لذلك لا يوجد تصحيح لعرضه.
              </div>
            ) : (
              <SchreibenCorrections corrections={fehler.schreibenCorrections} />
            )}
          </div>
        )}
      </div>
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
  const [maxReachedIndex, setMaxReachedIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [content, setContent] = useState<{ section: SectionKey; data: unknown } | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [schreibenText, setSchreibenText] = useState("");
  const [result, setResult] = useState<ResultShape | null>(null);
  const [essayGradingId, setEssayGradingId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(EXAM_DURATION_SEC);

  const offsetRef = useRef(0);
  const submittingRef = useRef(false);
  const contentCacheRef = useRef<Partial<Record<SectionKey, unknown>>>({});
  // "Latest" ref so submitExam (referenced by the timer effect, which must NOT
  // re-run on every keystroke) always reads current values without being
  // recreated on every answers/schreibenText change.
  const liveRef = useRef({ sectionIndex, answers, schreibenText, maxReachedIndex });
  useEffect(() => {
    liveRef.current = { sectionIndex, answers, schreibenText, maxReachedIndex };
  });

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
        const safeIdx = idx >= 0 ? idx : 0;
        setSectionIndex(safeIdx);
        setMaxReachedIndex(safeIdx);
        setPhase("exam");
      } else {
        setPhase("pre");
      }
    })();
  }, [user, level, hasAccess]);

  // ── Load current section's content (cached; tagged to eliminate any stale-render race) ──
  useEffect(() => {
    if (phase !== "exam" || !attempt || !currentSection) return;
    const cached = contentCacheRef.current[currentSection];
    if (cached !== undefined) {
      setContent({ section: currentSection, data: cached });
      return;
    }
    let cancelled = false;
    loadSectionContent(currentSection, attempt).then((data) => {
      if (cancelled) return;
      contentCacheRef.current[currentSection] = data;
      setContent({ section: currentSection, data });
    });
    return () => { cancelled = true; };
  }, [phase, attempt, currentSection]);

  // ── Seed local editable state whenever the displayed section changes ──
  useEffect(() => {
    if (phase !== "exam" || !attempt || !currentSection) return;
    if (currentSection === "schreiben") {
      setSchreibenText(attempt.schreiben_text ?? "");
    } else {
      setAnswers((attempt.answers?.[currentSection] as Record<string, unknown>) ?? {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentSection]);

  // contentReady is derived from the tag match, not a separate flag — a
  // stale `content` object (still holding the PREVIOUS section's shape)
  // can never be rendered against the new `currentSection` by mistake. This
  // is the fix for the "Something went wrong" crash after Weiter: the old
  // code cleared a `sectionLoading` boolean asynchronously (inside an
  // effect, one render late), so for one frame `currentSection` had already
  // advanced while `sectionData` still held the previous Teil's shape —
  // e.g. Lesen T1's {headlines,texts} got rendered into LesenT2Input, which
  // called data.questions.sort() on undefined and threw.
  const contentReady = content?.section === currentSection;
  const sectionData = contentReady ? content!.data : null;

  async function saveCurrentSection(advanceTo?: SectionKey) {
    if (!attempt) return;
    if (currentSection === "schreiben") {
      const { error } = await (supabase as any).rpc("save_simulation_progress", {
        p_attempt_id: attempt.id, p_schreiben_text: schreibenText, p_advance_to: advanceTo ?? null,
      });
      if (error) throw error;
      setAttempt((prev) => prev ? { ...prev, current_section: advanceTo ?? prev.current_section, schreiben_text: schreibenText } : prev);
    } else {
      const { error } = await (supabase as any).rpc("save_simulation_progress", {
        p_attempt_id: attempt.id, p_section: currentSection, p_section_answers: answers, p_advance_to: advanceTo ?? null,
      });
      if (error) throw error;
      setAttempt((prev) => prev ? {
        ...prev, current_section: advanceTo ?? prev.current_section,
        answers: { ...prev.answers, [currentSection]: answers },
      } : prev);
    }
  }

  const submitExam = useCallback(async () => {
    if (!attempt || !user || submittingRef.current) return;
    submittingRef.current = true;
    setPhase("submitting");
    try {
      const { sectionIndex: liveIdx, answers: liveAnswers, schreibenText: liveText } = liveRef.current;
      const liveSection = SECTIONS[liveIdx]?.key;
      if (liveSection === "schreiben") {
        await (supabase as any).rpc("save_simulation_progress", { p_attempt_id: attempt.id, p_schreiben_text: liveText });
      } else if (liveSection) {
        await (supabase as any).rpc("save_simulation_progress", { p_attempt_id: attempt.id, p_section: liveSection, p_section_answers: liveAnswers });
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
      setEssayGradingId((data as any).essay_grading_id ?? null);
      setPhase("result");
    } catch (e) {
      console.error("submitExam failed:", e);
      toast.error("Die Abgabe ist fehlgeschlagen. Bitte versuchen Sie es erneut.");
      submittingRef.current = false;
      setPhase("exam");
    }
  }, [attempt, user]);

  // ── Server-anchored timer — stable effect (submitExam has a stable identity) ──
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
  }, [phase, attempt?.id, attempt?.expires_at, submitExam]);

  async function startExam() {
    if (!user) return;
    setStarting(true);
    try {
      const { data, error } = await (supabase as any).rpc("start_simulation", { p_user_id: user.id });
      if (error) throw error;
      offsetRef.current = await fetchServerOffsetMs();
      const { data: row } = await (supabase as any).from("simulation_attempts").select("*").eq("id", data.attempt_id).single();
      const idx = SECTIONS.findIndex((s) => s.key === (row as AttemptRow).current_section);
      const safeIdx = idx >= 0 ? idx : 0;
      setAttempt(row as AttemptRow);
      setSectionIndex(safeIdx);
      setMaxReachedIndex(safeIdx);
      contentCacheRef.current = {};
      setPhase("exam");
    } catch (e: any) {
      if (e?.message?.includes("NOT_ENOUGH_CONTENT")) {
        toast.error("Noch nicht genug Aufgaben verfügbar. Bitte versuchen Sie es später erneut.");
      } else {
        toast.error("Die Prüfung konnte nicht gestartet werden.");
      }
    } finally {
      setStarting(false);
    }
  }

  /** Moves to any already-reached section (Zurück, or clicking a progress dot) —
   * always saves the section being left first so no answer is ever lost, and
   * never rewrites `current_section` server-side (that only ever advances). */
  async function goToSection(targetIndex: number) {
    if (!attempt || navigating) return;
    if (targetIndex < 0 || targetIndex > maxReachedIndex || targetIndex === sectionIndex) return;
    setNavigating(true);
    try {
      await saveCurrentSection();
      setSectionIndex(targetIndex);
    } catch (e) {
      console.error("save progress failed:", e);
      toast.error("Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setNavigating(false);
    }
  }

  async function handleWeiter() {
    if (!attempt || navigating) return;
    if (currentSection === "schreiben") {
      await submitExam();
      return;
    }
    setNavigating(true);
    try {
      const nextIndex = sectionIndex + 1;
      const nextSection = SECTIONS[nextIndex].key;
      const crossingFrontier = sectionIndex === maxReachedIndex;
      await saveCurrentSection(crossingFrontier ? nextSection : undefined);
      if (crossingFrontier) setMaxReachedIndex(nextIndex);
      setSectionIndex(nextIndex);
    } catch (e) {
      console.error("save progress failed:", e);
      toast.error("Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setNavigating(false);
    }
  }

  if (accessLoading) {
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

  if (phase === "loading") {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (phase === "pre") {
    return <PreExamScreen onStart={startExam} starting={starting} />;
  }

  if (phase === "result" && result && attempt) {
    return <ResultsScreen result={result} attempt={attempt} essayGradingId={essayGradingId} />;
  }

  // exam / submitting
  const h = Math.floor(remaining / 3600), m = Math.floor((remaining % 3600) / 60), s = remaining % 60;
  const timerFormatted = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const timerCritical = remaining < 600;
  const section = SECTIONS[sectionIndex];
  const isSchreiben = currentSection === "schreiben";

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
          {SECTIONS.map((sec, i) => {
            const reachable = i <= maxReachedIndex;
            return (
              <button
                key={sec.key}
                onClick={() => reachable && goToSection(i)}
                disabled={!reachable || navigating}
                title={sec.label}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i === sectionIndex ? "bg-primary" : i < maxReachedIndex || (i === maxReachedIndex && i !== sectionIndex) ? "bg-emerald-500" : "bg-muted"
                } ${reachable ? "cursor-pointer" : "cursor-not-allowed"}`}
              />
            );
          })}
        </div>
      </div>

      {!contentReady || phase === "submitting" ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {phase === "submitting" && <p className="text-sm text-muted-foreground">Wird bewertet — bitte warten…</p>}
        </div>
      ) : (
        <>
          {currentSection === "lesen_t1" && (
            <LesenT1Input data={sectionData as LesenT1Data} value={answers as Record<string, string>} onChange={setAnswers} />
          )}
          {currentSection === "lesen_t2" && (
            <LesenT2Input data={sectionData as LesenT2Data} value={answers as Record<string, string>} onChange={setAnswers} />
          )}
          {currentSection === "lesen_t3" && (
            <LesenT3Input data={sectionData as LesenT3Data} value={answers as Record<string, string>} onChange={setAnswers} />
          )}
          {currentSection === "sb_t1" && (
            <SBTeil1Exercise
              key={(sectionData as SBT1ExerciseData).id}
              exercise={sectionData as SBT1ExerciseData}
              examMode
              initialAnswers={answers as Record<number, string>}
              onAnswersChange={setAnswers}
            />
          )}
          {currentSection === "sb_t2" && (
            <SBTeil2Exercise
              key={(sectionData as SBT2ExerciseData).id}
              exercise={sectionData as SBT2ExerciseData}
              examMode
              initialAnswers={answers as Record<number, string>}
              onAnswersChange={setAnswers}
            />
          )}
          {(currentSection === "hoeren_t1" || currentSection === "hoeren_t2" || currentSection === "hoeren_t3") && (
            <HoerenInput data={sectionData as HoerenData} value={answers as Record<string, boolean>} onChange={setAnswers} />
          )}
          {currentSection === "schreiben" && (
            <SchreibenInput task={(sectionData as { task: string }).task} value={schreibenText} onChange={setSchreibenText} />
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => goToSection(sectionIndex - 1)} disabled={sectionIndex === 0 || navigating}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground disabled:opacity-40 hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> Zurück
            </button>
            <button onClick={handleWeiter} disabled={navigating}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              {navigating ? <Loader2 className="h-4 w-4 animate-spin" /> : isSchreiben ? <><Send className="h-4 w-4" /> Prüfung abgeben</> : <>Weiter <ChevronRight className="h-4 w-4" /></>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
