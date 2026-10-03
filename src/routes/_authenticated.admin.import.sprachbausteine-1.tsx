import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createSbT1Exercise, NOTICE_TEXT } from "@/lib/admin/exercise-create.functions";
import { LearningAidsFields, assembleLearningAids, type LearningAidsFormValue } from "@/components/admin/LearningAidsFields";

export const Route = createFileRoute("/_authenticated/admin/import/sprachbausteine-1")({
  component: ImportSbT1Page,
});

type Gap = { gap_number: number; option_a: string; option_b: string; option_c: string; correct: "a" | "b" | "c"; aids?: LearningAidsFormValue };

function blankGap(n: number): Gap {
  return { gap_number: n, option_a: "", option_b: "", option_c: "", correct: "a" };
}

function ImportSbT1Page() {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<"TELC_B1" | "TELC_B2">("TELC_B2");
  const [flagAsNewToTunisia, setFlagAsNewToTunisia] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [passage, setPassage] = useState("");
  const [passageTranslation, setPassageTranslation] = useState("");
  const [gaps, setGaps] = useState<Gap[]>(Array.from({ length: 10 }, (_, i) => blankGap(i + 1)));
  const [saving, setSaving] = useState(false);

  function updateGap(i: number, patch: Partial<Gap>) {
    setGaps((prev) => prev.map((g, gi) => (gi === i ? { ...g, ...patch } : g)));
  }
  function addGap() {
    setGaps((prev) => [...prev, blankGap(prev.length + 1)]);
  }
  function removeGap(i: number) {
    setGaps((prev) => prev.filter((_, gi) => gi !== i).map((g, gi) => ({ ...g, gap_number: gi + 1 })));
  }

  function reset() {
    setTitle(""); setInstructions(""); setPassage(""); setPassageTranslation("");
    setGaps(Array.from({ length: 10 }, (_, i) => blankGap(i + 1)));
    setFlagAsNewToTunisia(false);
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!passage.trim()) { toast.error("Passage text is required"); return; }
    if (gaps.some((g) => !g.option_a.trim() || !g.option_b.trim() || !g.option_c.trim())) {
      toast.error("Every gap needs all 3 options filled"); return;
    }
    setSaving(true);
    try {
      const result = await createSbT1Exercise({
        data: {
          title: title.trim(), level, note: "", flagAsNewToTunisia,
          passage, instructions: instructions.trim(),
          gaps: gaps.map(({ aids: _aids, ...g }) => g),
          learningAids: assembleLearningAids(
            Object.fromEntries(gaps.map((g) => [String(g.gap_number), g.aids])),
            passageTranslation,
          ),
        },
      });
      toast.success(`"${result.title || title.trim()}" added to Sprachbausteine Teil 1.`);
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
            <span className="text-foreground font-semibold">Add Sprachbausteine Teil 1</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">Sprachbausteine Teil 1 — Add Exercise</h1>
          <p className="text-sm text-muted-foreground mt-1">Passage with numbered gaps · 3 options each (a/b/c)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Exercise Title</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Altes Handwerk"
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
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Ganztext-Übersetzung (Arabisch, optional)</p>
          <textarea value={passageTranslation} onChange={(e) => setPassageTranslation(e.target.value)} rows={4} dir="rtl"
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
            <p className="text-sm font-black text-foreground">Gaps ({gaps.length})</p>
            <p className="text-xs text-muted-foreground">One row per numbered gap in the passage.</p>
          </div>
          <button onClick={addGap} type="button" className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted/70">
            <Plus className="h-3.5 w-3.5" /> Add gap
          </button>
        </div>
        <div className="divide-y divide-border">
          {gaps.map((g, i) => (
            <div key={i} className="space-y-1.5 px-5 py-3">
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-2 flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                  {g.gap_number}
                </span>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {(["a", "b", "c"] as const).map((opt) => (
                    <div key={opt} className="flex items-center gap-1.5">
                      <button type="button" onClick={() => updateGap(i, { correct: opt })}
                        className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black uppercase transition-colors ${
                          g.correct === opt ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                        }`}>{opt}</button>
                      <input value={opt === "a" ? g.option_a : opt === "b" ? g.option_b : g.option_c}
                        onChange={(e) => updateGap(i, opt === "a" ? { option_a: e.target.value } : opt === "b" ? { option_b: e.target.value } : { option_c: e.target.value })}
                        className="w-full rounded-xl border border-input bg-background px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  ))}
                </div>
                <button onClick={() => removeGap(i)} className="shrink-0 mt-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="pl-10">
                <LearningAidsFields
                  value={g.aids ?? {}}
                  onChange={(v) => updateGap(i, { aids: v })}
                  hideTranslation
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Adds to the end of the Sprachbausteine Teil 1 list for the selected level.</p>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : "Add exercise"}
        </button>
      </div>
    </div>
  );
}
