/**
 * Compact, collapsible "Warum?" teaching card — the single reusable
 * disclosure trigger + explanation used by every exercise player. Always
 * starts collapsed; the student decides when to open it (never auto-shown).
 * Content is 100% admin-authored via learning_aids — nothing here is
 * generated or guessed client-side, so it renders nothing if the exercise
 * has no aids for this item yet.
 *
 * Deliberately NOT a grammar lecture: one short line for why the answer is
 * right/wrong, a "🔑 Merke" fixed-expression tag, an optional example, an
 * optional Arabic translation, and a save-to-vocabulary action. That's it.
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/25 bg-blue-500/5 px-2.5 py-1.5 text-[12px] font-bold text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-500/10"
      >
        <Lightbulb className="h-3.5 w-3.5 shrink-0" />
        <span>{variant === "wrong" ? "Warum?" : "Warum ist das richtig?"}</span>
        {triggerLabel && <span className="font-normal opacity-60">· {triggerLabel}</span>}
        <ChevronDown className={`h-3 w-3 shrink-0 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-1.5 w-full max-w-md space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3.5 py-3">
          {(yourAnswerText || correctAnswerText) && (
            <div className="space-y-1 border-b border-blue-500/10 pb-2">
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
            </div>
          )}

          {explanation && (
            <p dir="auto" className="text-xs leading-relaxed text-foreground">{explanation}</p>
          )}

          {aids.keyword && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <KeyRound className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">Merke</span>
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">{aids.keyword}</span>
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

          {showEvidenceQuote && aids.evidence_text && (
            <p className={`text-xs italic leading-relaxed text-muted-foreground ${(explanation || aids.keyword || aids.grammar_example) ? "border-t border-blue-500/10 pt-2" : ""}`}>
              „{aids.evidence_text}“
            </p>
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
