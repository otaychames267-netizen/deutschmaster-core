/**
 * "💾 Speichern" — saves a word/expression/grammar note to the student's
 * personal "Meine Wörter & Ausdrücke" list (saved_expressions, RLS-scoped to
 * user_id = auth.uid()). Compact inline expand-in-place, not a modal, so it
 * never covers the exercise on mobile.
 */
import { useState } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CATEGORY_LABELS, type SavedExpressionCategory, type Skill } from "./types";

interface Props {
  skill: Skill;
  exerciseId: string;
  itemKey: string;
  defaultGerman: string;
  defaultCategory: SavedExpressionCategory;
  translation?: string | null;
  explanation?: string | null;
  example?: string | null;
  grammar?: string | null;
}

export function SaveExpressionButton({ skill, exerciseId, itemKey, defaultGerman, defaultCategory, translation, explanation, example, grammar }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [german, setGerman] = useState(defaultGerman);
  const [category, setCategory] = useState<SavedExpressionCategory>(defaultCategory);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  async function handleSave() {
    if (!german.trim() || saving) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("saved_expressions").insert({
        user_id: user!.id,
        skill,
        exercise_id: exerciseId,
        item_key: itemKey,
        category,
        german: german.trim(),
        translation: translation ?? null,
        explanation: explanation ?? null,
        example: example ?? null,
        grammar: grammar ?? null,
      });
      if (error) throw error;
      setSaved(true);
      setOpen(false);
    } catch (e) {
      console.error("Ausdruck konnte nicht gespeichert werden:", e);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
        <BookmarkCheck className="h-3 w-3" /> Gespeichert
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 transition-colors hover:bg-amber-500/10"
      >
        <Bookmark className="h-3 w-3" /> Ausdruck speichern
      </button>
      {open && (
        <div className="mt-1.5 space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <input
            value={german}
            onChange={(e) => setGerman(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground"
            placeholder="Wort oder Ausdruck"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SavedExpressionCategory)}
            className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !german.trim()}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />} Speichern
            </button>
            <button onClick={() => setOpen(false)} type="button" className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
