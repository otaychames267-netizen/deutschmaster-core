import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { createHoerenExercise, NOTICE_TEXT } from "@/lib/admin/exercise-create.functions";
import { LearningAidsFields, assembleLearningAids, type LearningAidsFormValue } from "@/components/admin/LearningAidsFields";
import { Save, Loader2, Music, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

type Statement = { statement_number: number; statement_text: string; correct_answer: boolean; aids?: LearningAidsFormValue };

const blankStatements = (): Statement[] =>
  Array.from({ length: 5 }, (_, i) => ({ statement_number: i + 1, statement_text: "", correct_answer: false }));

/** Manual "add exercise" form for Hören — shared across all 3 Teile (the
 * schema is identical, only `teil` differs). Renders one blank exercise at a
 * time; on save it resets so the admin can keep adding more without leaving
 * the page. */
export function HoerenExerciseForm({ teil }: { teil: 1 | 2 | 3 }) {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<"TELC_B1" | "TELC_B2">("TELC_B2");
  const [instructions, setInstructions] = useState("");
  const [statements, setStatements] = useState<Statement[]>(blankStatements());
  const [flagAsNewToTunisia, setFlagAsNewToTunisia] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);

  function updateStatement(i: number, patch: Partial<Statement>) {
    setStatements((prev) => prev.map((s, si) => (si === i ? { ...s, ...patch } : s)));
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    try {
      const path = `${teil}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("hoeren-images").upload(path, file);
      if (error) throw error;
      setImagePath(path);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleAudioUpload(file: File) {
    setUploadingAudio(true);
    try {
      const path = `${teil}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("hoeren-audio").upload(path, file);
      if (error) throw error;
      setAudioPath(path);
      toast.success("Audio uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audio upload failed");
    } finally {
      setUploadingAudio(false);
    }
  }

  function reset() {
    setTitle(""); setInstructions(""); setStatements(blankStatements());
    setFlagAsNewToTunisia(false); setImagePath(null); setAudioPath(null);
  }

  async function handleSave() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (statements.some((s) => !s.statement_text.trim())) { toast.error("All 5 statements need text"); return; }
    setSaving(true);
    try {
      await createHoerenExercise({
        data: {
          title: title.trim(),
          teil,
          level,
          note: "",
          flagAsNewToTunisia,
          instructions: instructions.trim(),
          imagePath,
          audioPath,
          statements: statements.map(({ aids: _aids, ...s }) => s),
          learningAids: assembleLearningAids(
            Object.fromEntries(statements.map((s) => [String(s.statement_number), s.aids])),
          ),
        },
      });
      toast.success(`"${title.trim()}" added to Hören Teil ${teil}.`);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Title + level */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Exercise Title</p>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Herr Böhm"
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
        <label className="flex items-start gap-3 rounded-xl border border-dashed border-border p-3 cursor-pointer">
          <input type="checkbox" checked={flagAsNewToTunisia} onChange={(e) => setFlagAsNewToTunisia(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-xs text-muted-foreground" dir="rtl">{NOTICE_TEXT}</span>
        </label>
      </div>

      {/* Media */}
      <div className="rounded-2xl border border-border bg-card p-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Image (optional)</p>
          {imagePath ? (
            <div className="flex items-center justify-between rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-foreground"><ImageIcon className="h-4 w-4" /> {imagePath.split("/").pop()}</span>
              <button onClick={() => setImagePath(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground hover:border-primary/40">
              {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {uploadingImage ? "Uploading…" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
            </label>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Audio (optional)</p>
          {audioPath ? (
            <div className="flex items-center justify-between rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 text-foreground"><Music className="h-4 w-4" /> {audioPath.split("/").pop()}</span>
              <button onClick={() => setAudioPath(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground hover:border-primary/40">
              {uploadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music className="h-4 w-4" />}
              {uploadingAudio ? "Uploading…" : "Upload audio"}
              <input type="file" accept="audio/*" className="hidden" disabled={uploadingAudio}
                onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])} />
            </label>
          )}
        </div>
      </div>

      {/* Statements */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm font-black text-foreground">Statements (5)</p>
          <p className="text-xs text-muted-foreground">Mark each Richtig (true) or Falsch (false).</p>
        </div>
        <div className="divide-y divide-border">
          {statements.map((s, i) => (
            <div key={i} className="space-y-1.5 px-5 py-3">
              <div className="flex items-start gap-3">
                <span className="shrink-0 mt-2 flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">
                  {s.statement_number}
                </span>
                <textarea value={s.statement_text} rows={2}
                  onChange={(e) => updateStatement(i, { statement_text: e.target.value })}
                  className="flex-1 resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex shrink-0 gap-1 mt-1">
                  <button type="button" onClick={() => updateStatement(i, { correct_answer: true })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      s.correct_answer ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}>Richtig</button>
                  <button type="button" onClick={() => updateStatement(i, { correct_answer: false })}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                      !s.correct_answer ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : "bg-muted text-muted-foreground"
                    }`}>Falsch</button>
                </div>
              </div>
              <div className="pl-10">
                <LearningAidsFields
                  value={s.aids ?? {}}
                  onChange={(v) => updateStatement(i, { aids: v })}
                  hideGrammar
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Adds to the end of the Hören Teil {teil} list for the selected level.</p>
        <div className="flex gap-2">
          <button onClick={() => nav({ to: "/admin" })} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Done for now
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving…" : "Add exercise"}
          </button>
        </div>
      </div>
    </div>
  );
}
