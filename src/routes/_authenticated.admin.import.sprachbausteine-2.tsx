import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createSbT2Exercise, NOTICE_TEXT } from "@/lib/admin/exercise-create.functions";

export const Route = createFileRoute("/_authenticated/admin/import/sprachbausteine-2")({
  component: ImportSbT2Page,
});

type Word = { word_number: number; word: string };
type Gap = { gap_number: number; correct_word: string };

function ImportSbT2Page() {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<"TELC_B1" | "TELC_B2">("TELC_B2");
  const [flagAsNewToTunisia, setFlagAsNewToTunisia] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [passage, setPassage] = useState("");
  const [words, setWords] = useState<Word[]>(Array.from({ length: 15 }, (_, i) => ({ word_number: i + 1, word: "" })));
  const [gaps, setGaps] = useState<Gap[]>(Array.from({ length: 10 }, (_, i) => ({ gap_number: i + 1, correct_word: "" })));
  const [saving, setSaving] = useState(false);

  function updateWord(i: number, word: string) {
    setWords((prev) => prev.map((w, wi) => (wi === i ? { ...w, word } : w)));
  }
  function addWord() {
    setWords((prev) => [...prev, { word_number: prev.length + 1, word: "" }]);
  }
  function removeWord(i: number) {
    setWords((prev) => prev.filter((_, wi) => wi !== i).map((w, wi) => ({ ...w, word_number: wi + 1 })));
  }

  function updateGap(i: number, correct_word: string) {
    setGaps((prev) => prev.map((g, gi) => (gi === i ? { ...g, correct_word } : g)));
  }
  function addGap() {
    setGaps((prev) => [...prev, { gap_number: prev.length + 1, correct_word: "" }]);
  }
  function removeGap(i: number) {
    setGaps((prev) => prev.filter((_, gi) => gi !== i).map((g, gi) => ({ ...g, gap_number: gi + 1 })));
  }

  function reset() {
    setTitle(""); setInstructions(""); setPassage("");
    setWords(Array.from({ length: 15 }, (_, i) => ({ word_number: i + 1, word: "" })));
    setGaps(Array.from({ length: 10 }, (_, i) => ({ gap_number: i + 1, correct_word: "" })));
    setFlagAsNewToTunisia(false);
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!passage.trim()) { toast.error("Passage text is required"); return; }
    if (words.some((w) => !w.word.trim())) { toast.error("Every word-bank entry needs text"); return; }
    if (gaps.some((g) => !g.correct_word.trim())) { toast.error("Every gap needs a correct word selected"); return; }
    setSaving(true);
    try {
      const result = await createSbT2Exercise({
        data: {
          title: title.trim(), level, note: "", flagAsNewToTunisia,
          passage, instructions: instructions.trim(), words, gaps,
        },
      });
      toast.success(`"${result.title || title.trim()}" added to Sprachbausteine Teil 2.`);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex items-start gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-foreground">Admin</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-semibold">Add Sprachbausteine Teil 2</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Sprachbausteine Teil 2 — Add Exercise</h1>
          <p className="text-sm text-muted-foreground mt-1">Passage with word bank · match words to numbered gaps</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Exercise Title</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Clara"
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Level</p>
          <div className="flex gap-2">
            {(["TELC_B1", "TELC_B2"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLevel(l)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  level === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}>
                {l === "TELC_B1" ? "B1" : "B2"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Instructions (optional)</p>
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
            className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Passage (use ___(1)___, ___(2)___ ... for gaps)</p>
          <textarea value={passage} onChange={(e) => setPassage(e.target.value)} rows={8}
            className="w-full resize-y rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-dashed border-border p-3 cursor-pointer">
          <input type="checkbox" checked={flagAsNewToTunisia} onChange={(e) => setFlagAsNewToTunisia(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-xs text-muted-foreground" dir="rtl">{NOTICE_TEXT}</span>
        </label>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-black text-foreground">Word bank ({words.length})</p>
            <p className="text-xs text-muted-foreground">All words the student can choose from (includes distractors).</p>
          </div>
          <button onClick={addWord} type="button" className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted/70">
            <Plus className="h-3.5 w-3.5" /> Add word
          </button>
        </div>
        <div className="divide-y divide-border">
          {words.map((w, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5">
              <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                {w.word_number}
              </span>
              <input value={w.word} onChange={(e) => updateWord(i, e.target.value)}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={() => removeWord(i)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-black text-foreground">Gaps ({gaps.length})</p>
            <p className="text-xs text-muted-foreground">Pick the correct word from the bank above for each gap.</p>
          </div>
          <button onClick={addGap} type="button" className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted/70">
            <Plus className="h-3.5 w-3.5" /> Add gap
          </button>
        </div>
        <div className="divide-y divide-border">
          {gaps.map((g, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-2.5">
              <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                {g.gap_number}
              </span>
              <select value={g.correct_word} onChange={(e) => updateGap(i, e.target.value)}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— select correct word —</option>
                {words.filter((w) => w.word.trim()).map((w) => (
                  <option key={w.word_number} value={w.word}>{w.word}</option>
                ))}
              </select>
              <button onClick={() => removeGap(i)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Adds to the end of the Sprachbausteine Teil 2 list for the selected level.</p>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Add exercise"}
        </button>
      </div>
    </div>
  );
}
