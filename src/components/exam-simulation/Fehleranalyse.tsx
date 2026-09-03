/**
 * Fehleranalyse — Arabic mistake analysis for the Prüfungssimulation
 * results screen.
 *
 * Every objective section (Lesen T1–T3, Sprachbausteine T1–T2, Hören
 * T1–T3) already carries rich, professionally-authored Arabic
 * `learning_aids` per question (evidence, why-wrong, why-correct — see
 * lesen_exercises/sb_exercises/hoeren_exercises.learning_aids, built in an
 * earlier project pass). `simulation_attempts.section_results` (added
 * alongside this feature) now snapshots each question's real
 * correct/your_answer/learning_aids at scoring time. This module's only
 * job is resolving that raw data — plus the section's own content (option
 * labels, headline text, statement text) — into the exact Arabic template
 * the product spec requires, for every WRONG answer only. Nothing here is
 * invented: where a question has no learning_aids (a real, disclosed
 * content gap — not every exercise has been through the explanation-
 * authoring pass yet), the block says so honestly instead of fabricating
 * a generic-sounding explanation.
 *
 * Schreiben doesn't have per-question learning_aids (it's free text, not
 * multiple choice) — its corrections come from the grading call itself
 * (see essay-grader.ts's `corrections` field) and are rendered by
 * <SchreibenCorrections> below, same visual language.
 */
import { AlertTriangle } from "lucide-react";
import type { EssayCorrection } from "@/lib/grading/essay-grader";

/* ─── Raw shapes coming back from the DB ────────────────────────────────── */

interface RawOptionReasoning { key: string; label?: string; reason: string; correct: boolean }
interface RawLearningAid {
  keyword?: string;
  evidence_text?: string;
  evidence_translation?: string;
  explanation_wrong?: string;
  explanation_correct?: string;
  answer_translation?: string;
  item_type?: string;
  options_reasoning?: RawOptionReasoning[];
}
interface RawResultItem {
  position?: number; number?: number; gap_number?: number; statement_number?: number;
  correct: boolean;
  your_answer: unknown;
  correct_answer: unknown;
  learning_aids: RawLearningAid | null;
}

/* ─── Resolved, display-ready shape ─────────────────────────────────────── */

export interface FehlerItem {
  key: string;
  teil: 1 | 2 | 3;
  questionNumber: number;
  contextText?: string; // the question/statement text itself, when the section has one
  yourAnswer: string;
  correctAnswer: string;
  whyWrong: string | null;
  whyCorrect: string | null;
  tip: string;
}

const FALLBACK_NOTE = "لا يتوفر شرح تفصيلي لهذا السؤال حالياً — راجع النص/التسجيل مرة أخرى وقارن إجابتك بالإجابة الصحيحة أعلاه.";

/** Category-grounded (not per-question-invented) practical tips, reused
 * across items that share the same real gap type — honest, generic-by-
 * design at the category level, never presented as question-specific. */
const SB_TIP_BY_TYPE: Record<string, string> = {
  preposition: "احفظ حروف الجر مع الحالة النحوية التي تفرضها (Dativ/Akkusativ) كوحدة واحدة، وليس بشكل منفصل.",
  verb_prep: "الأفعال المرتبطة بحرف جر ثابت (مثل interessiert sein an) يجب حفظها كتركيب كامل، لا ككلمات منفصلة.",
  pronoun: "راجع تصريف الضمائر الانعكاسية والشخصية حسب الفاعل (ich/du/er/wir...) قبل اختيار الإجابة.",
  tense: "انتبه إلى الفعل المساعد الموجود في الجملة (haben/sein/würde) لأنه يحدد الصيغة الصحيحة للفعل التالي.",
  verb: "بعد الأفعال الوجهية (dürfen/können/müssen...) يأتي الفعل التالي دائماً في صيغة المصدر (Infinitiv).",
  adjective_adverb: "انتبه إلى معنى الظرف بدقة — بعض الظروف تتشابه شكلاً لكنها تختلف في المعنى الدقيق للجملة.",
  conjunction: "اختر أداة الربط حسب العلاقة المنطقية بين الجملتين (سبب، نتيجة، تضاد، شرط...).",
};
const LESEN_TIP_DEFAULT = "ركّز على الكلمات المرادفة (Paraphrasen) في النص بدل البحث عن نفس الكلمات الحرفية، وتحقق من كل التفاصيل قبل اختيار الإجابة.";
const HOEREN_TIP_DEFAULT = "التفاصيل الدقيقة (الأرقام، الأسماء، الأماكن، الشروط مثل \"فقط\" أو \"الجميع\") هي غالباً مصدر الأخطاء في الاستماع — استمع للتسجيل مرة أخرى مع التركيز عليها.";

const ARABIC_RE = /[؀-ۿ]/;
/** The "explanation must be in Arabic" requirement is non-negotiable — a
 * field that exists but isn't actually Arabic (Hören's learning_aids are
 * currently authored in German, a real, disclosed content gap not yet
 * translated) must NOT be shown as if it were the Arabic explanation. */
function arabicOrNull(text: string | null | undefined): string | null {
  return text && ARABIC_RE.test(text) ? text : null;
}

function resolveExplanations(aid: RawLearningAid | null, yourAnswerKey: string | null, defaultTip: string): { whyWrong: string | null; whyCorrect: string | null; tip: string } {
  if (!aid) return { whyWrong: null, whyCorrect: null, tip: defaultTip };
  const matchedOption = yourAnswerKey != null ? aid.options_reasoning?.find((o) => o.key === yourAnswerKey && !o.correct) : undefined;
  const tip = aid.item_type && SB_TIP_BY_TYPE[aid.item_type] ? SB_TIP_BY_TYPE[aid.item_type] : defaultTip;
  // A matched option (the student's own specific wrong choice) is shown as-is;
  // falling back to the exercise's general explanation_wrong means it talks
  // about a DIFFERENT likely-confused option, not the one actually chosen —
  // say so honestly instead of presenting it as if it addressed this answer.
  const whyWrong = arabicOrNull(matchedOption?.reason)
    ?? (arabicOrNull(aid.explanation_wrong)
      ? `ملاحظة: لا يتوفر شرح خاص بإجابتك المحددة، لكن إليك خطأً شائعاً آخر في هذا السؤال قد يفيدك: ${aid.explanation_wrong}`
      : null);
  return {
    whyWrong,
    whyCorrect: arabicOrNull(aid.explanation_correct),
    tip,
  };
}

/* ─── Per-section resolvers ──────────────────────────────────────────────── */

export function resolveLesenT1(results: RawResultItem[] | undefined, content: { headlines: { letter: string; text: string }[] } | undefined): FehlerItem[] {
  if (!results || !content) return [];
  const byLetter = new Map(content.headlines.map((h) => [h.letter, h.text]));
  return results.filter((r) => !r.correct).map((r) => {
    const yourKey = (r.your_answer as string) || null;
    const correctKey = r.correct_answer as string;
    const { whyWrong, whyCorrect, tip } = resolveExplanations(r.learning_aids, yourKey, LESEN_TIP_DEFAULT);
    return {
      key: `lesen_t1-${r.position}`, teil: 1, questionNumber: r.position!,
      yourAnswer: yourKey ? `${yourKey} — ${byLetter.get(yourKey) ?? "?"}` : "لم تتم الإجابة",
      correctAnswer: `${correctKey} — ${byLetter.get(correctKey) ?? "?"}`,
      whyWrong, whyCorrect, tip,
    };
  });
}

export function resolveLesenT2(results: RawResultItem[] | undefined, content: { questions: { number: number; question: string; option_a: string; option_b: string; option_c: string }[] } | undefined): FehlerItem[] {
  if (!results || !content) return [];
  const byNumber = new Map(content.questions.map((q) => [q.number, q]));
  return results.filter((r) => !r.correct).map((r) => {
    const q = byNumber.get(r.number!);
    const yourKey = (r.your_answer as string) || null;
    const correctKey = r.correct_answer as string;
    const optText = (k: string | null) => (k && q ? (q as any)[`option_${k}`] : null);
    const { whyWrong, whyCorrect, tip } = resolveExplanations(r.learning_aids, yourKey, LESEN_TIP_DEFAULT);
    return {
      key: `lesen_t2-${r.number}`, teil: 2, questionNumber: r.number!,
      contextText: q?.question,
      yourAnswer: yourKey ? `${yourKey}) ${optText(yourKey) ?? "?"}` : "لم تتم الإجابة",
      correctAnswer: `${correctKey}) ${optText(correctKey) ?? "?"}`,
      whyWrong, whyCorrect, tip,
    };
  });
}

export function resolveLesenT3(results: RawResultItem[] | undefined, content: { situations: { number: number; description: string }[]; texts: { letter: string; title: string | null; content: string }[] } | undefined): FehlerItem[] {
  if (!results || !content) return [];
  const byLetter = new Map(content.texts.map((t) => [t.letter, t.title || `Anzeige ${t.letter}`]));
  const bySituation = new Map(content.situations.map((s) => [s.number, s.description]));
  const label = (k: string | null) => (!k ? "لم تتم الإجابة" : k === "0" ? "X — keine passende Anzeige" : `${k} — ${byLetter.get(k) ?? "?"}`);
  return results.filter((r) => !r.correct).map((r) => {
    const yourKey = (r.your_answer as string) || null;
    const correctKey = r.correct_answer as string;
    const { whyWrong, whyCorrect, tip } = resolveExplanations(r.learning_aids, yourKey, LESEN_TIP_DEFAULT);
    return {
      key: `lesen_t3-${r.number}`, teil: 3, questionNumber: r.number!,
      contextText: bySituation.get(r.number!),
      yourAnswer: label(yourKey), correctAnswer: label(correctKey),
      whyWrong, whyCorrect, tip,
    };
  });
}

export function resolveSbT1(results: RawResultItem[] | undefined, content: { gaps: { gap_number: number; option_a: string; option_b: string; option_c: string }[] } | undefined): FehlerItem[] {
  if (!results || !content) return [];
  const byGap = new Map(content.gaps.map((g) => [g.gap_number, g]));
  return results.filter((r) => !r.correct).map((r) => {
    const g = byGap.get(r.gap_number!);
    const yourKey = (r.your_answer as string) || null;
    const correctKey = r.correct_answer as string;
    const optText = (k: string | null) => (k && g ? (g as any)[`option_${k}`] : null);
    const { whyWrong, whyCorrect, tip } = resolveExplanations(r.learning_aids, yourKey, SB_TIP_BY_TYPE.preposition);
    return {
      key: `sb_t1-${r.gap_number}`, teil: 1, questionNumber: r.gap_number!,
      yourAnswer: yourKey ? `${yourKey}) ${optText(yourKey) ?? "?"}` : "لم تتم الإجابة",
      correctAnswer: `${correctKey}) ${optText(correctKey) ?? "?"}`,
      whyWrong, whyCorrect, tip,
    };
  });
}

export function resolveSbT2(results: RawResultItem[] | undefined): FehlerItem[] {
  if (!results) return [];
  return results.filter((r) => !r.correct).map((r) => {
    const yourKey = (r.your_answer as string)?.trim() || null;
    const correctKey = r.correct_answer as string;
    const { whyWrong, whyCorrect, tip } = resolveExplanations(r.learning_aids, yourKey, SB_TIP_BY_TYPE.verb);
    return {
      key: `sb_t2-${r.gap_number}`, teil: 2, questionNumber: r.gap_number!,
      yourAnswer: yourKey || "لم تتم الإجابة", correctAnswer: correctKey,
      whyWrong, whyCorrect, tip,
    };
  });
}

export function resolveHoeren(teil: 1 | 2 | 3, results: RawResultItem[] | undefined, content: { statements: { statement_number: number; statement_text: string }[] } | undefined): FehlerItem[] {
  if (!results || !content) return [];
  const byNumber = new Map(content.statements.map((s) => [s.statement_number, s.statement_text]));
  const label = (v: unknown) => (v === true ? "صحيح (Richtig)" : v === false ? "خطأ (Falsch)" : "لم تتم الإجابة");
  return results.filter((r) => !r.correct).map((r) => {
    const yourKey = r.your_answer === true ? "true" : r.your_answer === false ? "false" : null;
    const { whyWrong, whyCorrect, tip } = resolveExplanations(r.learning_aids, yourKey, HOEREN_TIP_DEFAULT);
    return {
      key: `hoeren_t${teil}-${r.statement_number}`, teil, questionNumber: r.statement_number!,
      contextText: byNumber.get(r.statement_number!),
      yourAnswer: label(r.your_answer), correctAnswer: label(r.correct_answer),
      whyWrong, whyCorrect, tip,
    };
  });
}

/* ─── Rendering ──────────────────────────────────────────────────────────── */

/** German text embedded inside an RTL Arabic block — <bdi> isolates its
 * direction so it renders left-to-right regardless of surrounding context,
 * without needing to know in advance whether it contains Arabic too. */
function De({ children }: { children: React.ReactNode }) {
  return <bdi className="font-medium text-foreground">{children}</bdi>;
}

function FehlerCard({ sectionLabel, item }: { sectionLabel: string; item: FehlerItem }) {
  return (
    <div dir="rtl" className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-5 space-y-4" lang="ar">
      <div className="flex items-start justify-between gap-3 border-b border-rose-500/10 pb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-rose-600 dark:text-rose-400">📍 أين أخطأت؟</p>
          <p className="mt-1 text-sm text-muted-foreground">
            <bdi>{sectionLabel} — Teil {item.teil}</bdi> · السؤال {item.questionNumber}
          </p>
        </div>
        <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
      </div>

      {item.contextText && (
        <p dir="ltr" className="rounded-xl bg-muted/50 px-3.5 py-2.5 text-sm text-foreground leading-relaxed">{item.contextText}</p>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5">
          <p className="text-xs font-bold text-rose-600 dark:text-rose-400">❌ إجابتك</p>
          <p className="mt-0.5 text-sm"><De>{item.yourAnswer}</De></p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5">
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✅ الإجابة الصحيحة</p>
          <p className="mt-0.5 text-sm"><De>{item.correctAnswer}</De></p>
        </div>
      </div>

      <div className="space-y-3 text-sm leading-relaxed">
        <div>
          <p className="font-bold text-foreground">🔎 لماذا أخطأت؟</p>
          <p className="mt-0.5 text-muted-foreground">{item.whyWrong ?? FALLBACK_NOTE}</p>
        </div>
        <div>
          <p className="font-bold text-foreground">💡 لماذا الإجابة الصحيحة؟</p>
          <p className="mt-0.5 text-muted-foreground">{item.whyCorrect ?? FALLBACK_NOTE}</p>
        </div>
        <div>
          <p className="font-bold text-foreground">📚 ماذا تتعلم من هذا الخطأ؟</p>
          <p className="mt-0.5 text-muted-foreground">{item.tip}</p>
        </div>
      </div>
    </div>
  );
}

const SECTION_LABEL_AR: Record<string, string> = {
  lesen_t1: "Lesen", lesen_t2: "Lesen", lesen_t3: "Lesen",
  sb_t1: "Sprachbausteine", sb_t2: "Sprachbausteine",
  hoeren_t1: "Hören", hoeren_t2: "Hören", hoeren_t3: "Hören",
};

export function FehleranalyseSection({ sectionKey, items }: { sectionKey: keyof typeof SECTION_LABEL_AR; items: FehlerItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FehlerCard key={item.key} sectionLabel={SECTION_LABEL_AR[sectionKey]} item={item} />
      ))}
    </div>
  );
}

/* ─── Schreiben corrections (own shape — free text, not multiple choice) ─── */

export function SchreibenCorrections({ corrections }: { corrections: EssayCorrection[] }) {
  if (corrections.length === 0) return null;
  return (
    <div className="space-y-3">
      {corrections.map((c, i) => (
        <div key={i} dir="rtl" lang="ar" className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-wide text-rose-600 dark:text-rose-400">📍 نوع الخطأ: <bdi className="normal-case">{c.category}</bdi></p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5">
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">❌ ما كتبته</p>
              <p dir="ltr" className="mt-0.5 text-sm text-foreground">{c.original}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2.5">
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">✅ التصحيح</p>
              <p dir="ltr" className="mt-0.5 text-sm text-foreground">{c.corrected}</p>
            </div>
          </div>
          <div className="space-y-3 text-sm leading-relaxed">
            <div>
              <p className="font-bold text-foreground">🔎 لماذا هذا خطأ؟</p>
              <p className="mt-0.5 text-muted-foreground">{c.explanation_ar}</p>
            </div>
            <div>
              <p className="font-bold text-foreground">💡 كيف أتجنب هذا الخطأ مستقبلاً؟</p>
              <p className="mt-0.5 text-muted-foreground">{c.tip_ar}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
