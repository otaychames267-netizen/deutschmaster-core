/**
 * Post-correction teaching block: 🔎 Textbeleg (exact evidence sentence from
 * the real exercise text) → 💡 Schlüsselwort → 🇦🇪 Übersetzung des Textbelegs
 * → explanation (why right / why wrong). All fields are optional and sourced
 * from admin-authored learning_aids — nothing here is generated or guessed
 * client-side, so the block renders nothing if the exercise has no aids for
 * this item yet.
 */
import { BookText, Lightbulb, Languages, GraduationCap } from "lucide-react";
import type { LearningAidsItem, SavedExpressionCategory, Skill } from "./types";
import { SaveExpressionButton } from "./SaveExpressionButton";

interface Props {
  aids: LearningAidsItem | null | undefined;
  variant: "wrong" | "correct";
  skill: Skill;
  exerciseId: string;
  itemKey: string;
  saveCategory?: SavedExpressionCategory;
}

export function EvidenceBlock({ aids, variant, skill, exerciseId, itemKey, saveCategory = "wichtiger_ausdruck" }: Props) {
  if (!aids) return null;
  const explanation = variant === "wrong" ? aids.explanation_wrong : aids.explanation_correct;
  const hasAnything = aids.evidence_text || explanation || aids.grammar_structure;
  if (!hasAnything) return null;

  return (
    <div className="mx-4 mb-3 space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3.5 py-3">
      {aids.evidence_text && (
        <div className="flex items-start gap-2">
          <BookText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-blue-600 dark:text-blue-400">Textbeleg</p>
            <p className="text-sm italic leading-relaxed text-foreground">„{aids.evidence_text}“</p>
          </div>
        </div>
      )}

      {aids.keyword && (
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">Schlüsselwort</p>
            <p className="text-sm font-semibold text-foreground">{aids.keyword}</p>
          </div>
        </div>
      )}

      {aids.evidence_translation && (
        <div className="flex items-start gap-2">
          <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Übersetzung</p>
            <p className="text-sm leading-relaxed text-foreground" dir="rtl">{aids.evidence_translation}</p>
          </div>
        </div>
      )}

      {explanation && (
        <p className="border-t border-blue-500/10 pt-2 text-xs leading-relaxed text-muted-foreground">{explanation}</p>
      )}

      {aids.grammar_structure && (
        <div className="flex items-start gap-2 border-t border-blue-500/10 pt-2">
          <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
          <div className="min-w-0 flex-1 space-y-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-violet-600 dark:text-violet-400">Grammatikstruktur</p>
              <p className="text-sm font-semibold text-foreground">{aids.grammar_structure}</p>
            </div>
            {aids.grammar_example && (
              <p className="text-xs italic leading-relaxed text-muted-foreground">„{aids.grammar_example}“</p>
            )}
            {aids.grammar_translation && (
              <p className="text-xs leading-relaxed text-muted-foreground" dir="rtl">{aids.grammar_translation}</p>
            )}
          </div>
        </div>
      )}

      <div className="pt-0.5">
        <SaveExpressionButton
          skill={skill}
          exerciseId={exerciseId}
          itemKey={itemKey}
          defaultGerman={aids.grammar_structure || aids.keyword || aids.evidence_text || ""}
          defaultCategory={saveCategory}
          translation={aids.evidence_translation || aids.grammar_translation}
          explanation={explanation}
          grammar={aids.grammar_structure}
          example={aids.grammar_example}
        />
      </div>
    </div>
  );
}
