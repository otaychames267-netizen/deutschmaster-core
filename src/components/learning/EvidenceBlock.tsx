/**
 * Compact, collapsible "Warum?" teaching card — the single reusable
 * disclosure trigger + explanation used by every exercise player. Always
 * starts collapsed; the student decides when to open it (never auto-shown).
 * Content is 100% admin-authored via learning_aids — nothing here is
 * generated or guessed client-side, so it renders nothing if the exercise
 * has no aids for this item yet.
 *
 * Deliberately NOT a grammar lecture: the quoted sentence (bold answer)
 * first, then one short line for why it fits, a "🔑 Merke" tag, an optional
 * example, an optional Arabic translation, and a save-to-vocabulary action.
 * The "memorize fixed expressions" reinforcement line under Merke is
 * CONDITIONAL on aids.merke_type === "fixed_expression" — a general grammar
 * rule (conjunction, case, tense, word order) is not a fixed phrase to
 * memorize, so showing that line there would be actively misleading.
 */
import { useState } from "react";
import { CheckCircle2, XCircle, Lightbulb, KeyRound, Pin, Languages, ChevronDown } from "lucide-react";
import type { LearningAidsItem, SavedExpressionCategory, Skill } from "./types";
import { SaveExpressionButton } from "./SaveExpressionButton";

interface Props {
  aids: LearningAidsItem | null | undefined;
  variant: "wrong" | "correct";
  skill: Skill;
  exerciseId: string;
  itemKey: string;
  saveCategory?: SavedExpressionCategory;
  /** Optional compact "Deine Antwort / Richtig" line shown inside the card —
   * use where the surrounding UI doesn't already show this comparison (e.g.
   * an anchored gap popover that replaces a separate results row). Omit
   * where the caller already displays this outside the card. */
  yourAnswerText?: string | null;
  correctAnswerText?: string | null;
  /** Show the raw evidence quote inside the card. Default true. Pass false
   * where the caller already highlights this same sentence inline in the
   * passage/transcript (see HighlightedText), so it isn't shown twice. */
  showEvidenceQuote?: boolean;
  /** Small suffix on the trigger, e.g. "Frage 6" — lets the student connect
   * this card back to a "🔎 Beleg für Frage 6" tag in the highlighted text. */
  triggerLabel?: string;
  /** Start expanded. Use where the surrounding UI already required an
   * explicit click to reveal this card (e.g. opening an anchored gap
   * popover) — asking for a second click here would be redundant. */
  defaultOpen?: boolean;
}

/** Renders `**bold**` spans inside admin-authored quote text (e.g. the exact
 * answer word/phrase within an evidence sentence) as real emphasis, without
 * pulling in a full markdown renderer for one inline pattern. Plain text
 * (no `**`) renders unchanged. */
function renderBoldSegments(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i} className="font-bold text-violet-700 dark:text-violet-300">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/** Fixed reinforcement line shown under every Merke box — same wording for
 * every exercise, so it's rendered here once rather than authored per gap
 * (content that never varies isn't worth a data field or repeated typing
 * across ~1200 exercise items). */
const MERKE_REINFORCEMENT_AR = "هذا تركيب ثابت، يجب التركيز على التراكيب الثابتة وحفظها لأنها تتكرر دائماً في الامتحانات.";

export function EvidenceBlock({
  aids,
  variant,
  skill,
  exerciseId,
  itemKey,
  saveCategory = "wichtiger_ausdruck",
  yourAnswerText,
  correctAnswerText,
  showEvidenceQuote = true,
  triggerLabel,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (!aids) return null;

  const explanation = variant === "wrong" ? aids.explanation_wrong : aids.explanation_correct;
  const hasAnything = aids.evidence_text || explanation || aids.grammar_structure || aids.keyword;
  if (!hasAnything) return null;

  return (
    <div className="max-w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/25 bg-violet-500/5 px-2.5 py-1.5 text-[12px] font-bold text-violet-700 dark:text-violet-300 transition-colors hover:bg-violet-500/10"
      >
        <Lightbulb className="h-3.5 w-3.5 shrink-0" />
        <span>{variant === "wrong" ? "Warum?" : "Warum ist das richtig?"}</span>
        {triggerLabel && <span className="font-normal opacity-60">· {triggerLabel}</span>}
        <ChevronDown className={`h-3 w-3 shrink-0 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-1.5 w-full max-w-md space-y-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3.5 py-3">
          {!showEvidenceQuote && aids.evidence_text && triggerLabel && (
            <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400">
              🔎 Beleg für {triggerLabel} — im Text markiert
            </p>
          )}
          {(yourAnswerText || correctAnswerText) && (
            <div className="space-y-1 border-b border-violet-500/10 pb-2">
              {yourAnswerText && (
                <p className="flex items-center gap-1.5 text-xs">
                  {variant === "wrong"
                    ? <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                    : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                  <span className="text-muted-foreground">Deine Antwort:</span>
                  <span className={`font-semibold ${variant === "wrong" ? "text-rose-600 line-through dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {yourAnswerText}
                  </span>
                </p>
              )}
              {variant === "wrong" && correctAnswerText && (
                <p className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span className="text-muted-foreground">Richtig:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{correctAnswerText}</span>
                </p>
              )}
              {aids.answer_translation && (
                <p dir="rtl" className="ps-5 text-xs leading-relaxed text-emerald-700/90 dark:text-emerald-300/90">
                  {aids.answer_translation}
                </p>
              )}
            </div>
          )}

          {showEvidenceQuote && aids.evidence_text && (
            <p className="text-xs italic leading-relaxed text-muted-foreground">
              „{renderBoldSegments(aids.evidence_text)}“
            </p>
          )}

          {explanation && (
            <p dir="auto" className="text-xs leading-relaxed text-foreground">
              <span className="font-bold not-italic text-violet-700 dark:text-violet-300">التفسير: </span>
              {explanation}
            </p>
          )}

          {aids.keyword && (
            <div className="space-y-1 border-t border-violet-500/10 pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <KeyRound className="h-3 w-3 shrink-0 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">Merke</span>
                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">{aids.keyword}</span>
              </div>
              {aids.merke_type === "fixed_expression" && (
                <p dir="rtl" className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-300/90">{MERKE_REINFORCEMENT_AR}</p>
              )}
            </div>
          )}

          {aids.grammar_structure && aids.grammar_structure !== aids.keyword && (
            <p className="text-xs font-semibold text-foreground">{aids.grammar_structure}</p>
          )}

          {aids.grammar_example && (
            <div className="flex items-start gap-1.5">
              <Pin className="mt-0.5 h-3 w-3 shrink-0 text-violet-500" />
              <p className="text-xs italic leading-relaxed text-muted-foreground">„{aids.grammar_example}“</p>
            </div>
          )}

          {(aids.evidence_translation || aids.grammar_translation) && (
            <div className="flex items-start gap-1.5">
              <Languages className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" />
              <p className="flex-1 text-xs leading-relaxed text-foreground" dir="rtl">
                {aids.evidence_translation || aids.grammar_translation}
              </p>
            </div>
          )}

          <div className="pt-0.5">
            <SaveExpressionButton
              skill={skill}
              exerciseId={exerciseId}
              itemKey={itemKey}
              defaultGerman={aids.keyword || aids.grammar_structure || aids.evidence_text || ""}
              defaultCategory={saveCategory}
              translation={aids.evidence_translation || aids.grammar_translation}
              explanation={explanation}
              grammar={aids.grammar_structure}
              example={aids.grammar_example}
            />
          </div>
        </div>
      )}
    </div>
  );
}
