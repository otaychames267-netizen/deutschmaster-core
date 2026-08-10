/**
 * Compact, collapsible "Lernhilfen" (optional) panel an admin can attach to
 * a single exercise item (a text/question/situation/statement/gap/word) when
 * creating an exercise. Every field is optional — the form works fine with
 * none of them filled in, in which case nothing is sent to the create RPC
 * for that item. All fields together map 1:1 onto one entry of the
 * learning_aids.items JSONB object (see supabase/migrations/
 * 20260810180000_learning_assistance_foundation.sql).
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface LearningAidsFormValue {
  translation?: string;
  evidence_text?: string;
  evidence_translation?: string;
  keyword?: string;
  explanation_correct?: string;
  explanation_wrong?: string;
  grammar_structure?: string;
  grammar_example?: string;
  grammar_translation?: string;
}

interface Props {
  value: LearningAidsFormValue;
  onChange: (next: LearningAidsFormValue) => void;
  /** Hide the translation field when the form already collects a whole-text translation elsewhere. */
  hideTranslation?: boolean;
  /** Hide the grammar fields for skills where they never apply (Lesen/Hören evidence-only items). */
  hideGrammar?: boolean;
}

export function hasLearningAidsContent(v: LearningAidsFormValue | undefined): boolean {
  if (!v) return false;
  return Object.values(v).some((s) => !!s && s.trim() !== "");
}

export function LearningAidsFields({ value, onChange, hideTranslation, hideGrammar }: Props) {
  const [open, setOpen] = useState(false);
  const filled = hasLearningAidsContent(value);

  function set(key: keyof LearningAidsFormValue, v: string) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="mt-1.5 rounded-lg border border-border/60 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
      >
        <span>Lernhilfen (optional){filled ? " ✓" : ""}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border/60 px-2.5 py-2.5">
          {!hideTranslation && (
            <Field label="Übersetzung (Arabisch)" value={value.translation} onChange={(v) => set("translation", v)} dir="rtl" />
          )}
          <Field label="Textbeleg (Beweissatz aus dem Originaltext)" value={value.evidence_text} onChange={(v) => set("evidence_text", v)} />
          <Field label="Übersetzung des Textbelegs (Arabisch)" value={value.evidence_translation} onChange={(v) => set("evidence_translation", v)} dir="rtl" />
          <Field label="Schlüsselwort" value={value.keyword} onChange={(v) => set("keyword", v)} short />
          <Field label="Erklärung — warum richtig" value={value.explanation_correct} onChange={(v) => set("explanation_correct", v)} />
          <Field label="Erklärung — warum falsch (bei typischem Fehler)" value={value.explanation_wrong} onChange={(v) => set("explanation_wrong", v)} />
          {!hideGrammar && (
            <>
              <Field label={'Grammatikstruktur (z.B. "abhängig von + Dativ")'} value={value.grammar_structure} onChange={(v) => set("grammar_structure", v)} short />
              <Field label="Grammatikbeispiel" value={value.grammar_example} onChange={(v) => set("grammar_example", v)} />
              <Field label="Grammatik-Übersetzung (Arabisch)" value={value.grammar_translation} onChange={(v) => set("grammar_translation", v)} dir="rtl" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, dir, short }: { label: string; value?: string; onChange: (v: string) => void; dir?: "rtl"; short?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold text-muted-foreground">{label}</span>
      {short ? (
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          dir={dir}
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      ) : (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          dir={dir}
          className="w-full resize-y rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      )}
    </label>
  );
}

/** Assembles the final learningAids JSON payload from a map of item-key → form value, plus an optional whole-text translation. Returns undefined when there's nothing to send. */
export function assembleLearningAids(
  aidsByKey: Record<string, LearningAidsFormValue | undefined>,
  wholeTextTranslation?: string,
): { translation?: { text?: string; questions?: Record<string, string> }; items?: Record<string, Record<string, string>> } | undefined {
  const items: Record<string, Record<string, string>> = {};
  const questionsTranslation: Record<string, string> = {};

  for (const [key, v] of Object.entries(aidsByKey)) {
    if (!v) continue;
    const { translation, ...rest } = v;
    const cleanRest: Record<string, string> = {};
    for (const [k, val] of Object.entries(rest)) {
      if (val && val.trim() !== "") cleanRest[k] = val.trim();
    }
    if (Object.keys(cleanRest).length > 0) items[key] = cleanRest;
    if (translation && translation.trim() !== "") questionsTranslation[key] = translation.trim();
  }

  const hasWholeText = !!wholeTextTranslation && wholeTextTranslation.trim() !== "";
  const hasQuestionsTranslation = Object.keys(questionsTranslation).length > 0;
  const hasItems = Object.keys(items).length > 0;

  if (!hasWholeText && !hasQuestionsTranslation && !hasItems) return undefined;

  return {
    ...((hasWholeText || hasQuestionsTranslation) ? {
      translation: {
        ...(hasWholeText ? { text: wholeTextTranslation!.trim() } : {}),
        ...(hasQuestionsTranslation ? { questions: questionsTranslation } : {}),
      },
    } : {}),
    ...(hasItems ? { items } : {}),
  };
}
