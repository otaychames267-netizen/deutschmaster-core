import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ExerciseForm = {
  id?: string;
  level: "b1" | "b2";
  module: "lesen" | "sprachbausteine" | "hoeren" | "schreiben" | "muendlich";
  teil: number;
  position: number;
  title: string;
  prompt: string;
  passage: string;
  audio_id: string | null;
  kind: "multiple_choice" | "true_false" | "matching" | "cloze" | "open_text";
  options: string[];
  correct: string[];
  explanation: string;
  status: "draft" | "published" | "hidden";
  tags: string[];
};

export const blankExercise = (): ExerciseForm => ({
  level: "b2",
  module: "lesen",
  teil: 1,
  position: 1,
  title: "",
  prompt: "",
  passage: "",
  audio_id: null,
  kind: "multiple_choice",
  options: ["", ""],
  correct: [],
  explanation: "",
  status: "draft",
  tags: [],
});

export function ExerciseEditor({
  initial,
  onSaved,
  audioOptions,
}: {
  initial: ExerciseForm;
  onSaved: (id: string) => void;
  audioOptions: { id: string; title: string }[];
}) {
  const [f, setF] = useState<ExerciseForm>(initial);
  const [saving, setSaving] = useState(false);
  const update = <K extends keyof ExerciseForm>(k: K, v: ExerciseForm[K]) => setF((s) => ({ ...s, [k]: v }));

  const setOption = (i: number, v: string) => {
    const next = [...f.options];
    next[i] = v;
    update("options", next);
  };
  const addOption = () => update("options", [...f.options, ""]);
  const removeOption = (i: number) => {
    const removed = f.options[i];
    update("options", f.options.filter((_, idx) => idx !== i));
    update("correct", f.correct.filter((c) => c !== removed));
  };
  const toggleCorrect = (opt: string) => {
    if (f.correct.includes(opt)) update("correct", f.correct.filter((c) => c !== opt));
    else update("correct", [...f.correct, opt]);
  };

  const save = async () => {
    if (!f.title.trim() || !f.prompt.trim()) {
      toast.error("Title and question are required");
      return;
    }
    setSaving(true);
    const payload = {
      level: f.level,
      module: f.module,
      teil: f.teil,
      position: f.position,
      title: f.title.trim(),
      prompt: f.prompt.trim(),
      passage: f.passage.trim() || null,
      audio_id: f.audio_id || null,
      kind: f.kind,
      options: f.options.filter((o) => o.trim().length > 0),
      correct: f.correct,
      explanation: f.explanation.trim() || null,
      status: f.status,
      tags: f.tags,
    };
    let res;
    if (f.id) {
      res = await supabase.from("exercises").update(payload).eq("id", f.id).select("id").single();
    } else {
      res = await supabase.from("exercises").insert(payload).select("id").single();
    }
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Exercise saved");
    onSaved(res.data!.id as string);
  };

  const needsAudio = f.module === "hoeren";
  const needsOptions = f.kind === "multiple_choice" || f.kind === "true_false" || f.kind === "matching" || f.kind === "cloze";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Exercise details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={f.level} onValueChange={(v) => update("level", v as ExerciseForm["level"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="b1">B1</SelectItem><SelectItem value="b2">B2</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Module</Label>
              <Select value={f.module} onValueChange={(v) => update("module", v as ExerciseForm["module"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesen">Lesen</SelectItem>
                  <SelectItem value="sprachbausteine">Sprachbausteine</SelectItem>
                  <SelectItem value="hoeren">Hören</SelectItem>
                  <SelectItem value="schreiben">Schreiben</SelectItem>
                  <SelectItem value="muendlich">Mündlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Teil</Label>
              <Input type="number" min={1} max={5} value={f.teil} onChange={(e) => update("teil", Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Input type="number" min={1} value={f.position} onChange={(e) => update("position", Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={f.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Lesen Teil 1 — Anzeigen" />
          </div>

          <div className="space-y-1.5">
            <Label>Question / prompt</Label>
            <Textarea rows={3} value={f.prompt} onChange={(e) => update("prompt", e.target.value)} placeholder="The instruction or question shown to the student" />
          </div>

          {(f.module === "lesen" || f.module === "sprachbausteine" || f.module === "schreiben") && (
            <div className="space-y-1.5">
              <Label>Passage / context (optional)</Label>
              <Textarea rows={6} value={f.passage} onChange={(e) => update("passage", e.target.value)} placeholder="Reading text, cloze passage, or writing context" />
            </div>
          )}

          {needsAudio && (
            <div className="space-y-1.5">
              <Label>Linked audio</Label>
              <Select value={f.audio_id ?? "none"} onValueChange={(v) => update("audio_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Pick an audio file" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— none —</SelectItem>
                  {audioOptions.map((a) => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Upload new files from the Audio tab.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Question type</Label>
              <Select value={f.kind} onValueChange={(v) => update("kind", v as ExerciseForm["kind"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                  <SelectItem value="matching">Matching</SelectItem>
                  <SelectItem value="cloze">Cloze (fill the blank)</SelectItem>
                  <SelectItem value="open_text">Open text (Schreiben/Mündlich)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => update("status", v as ExerciseForm["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Answer choices</Label>
                <Button type="button" size="sm" variant="outline" onClick={addOption}><Plus className="size-3 mr-1" />Add</Button>
              </div>
              <p className="text-xs text-muted-foreground">Click the checkbox to mark the correct answer(s).</p>
              {f.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="checkbox" checked={!!opt && f.correct.includes(opt)} onChange={() => opt && toggleCorrect(opt)} className="size-4" />
                  <Input value={opt} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeOption(i)}><Trash2 className="size-4" /></Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Explanation (shown after answering)</Label>
            <Textarea rows={3} value={f.explanation} onChange={(e) => update("explanation", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Tags (comma separated)</Label>
            <Input value={f.tags.join(", ")} onChange={(e) => update("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} />
          </div>

          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save exercise"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">{f.level.toUpperCase()}</Badge>
            <Badge variant="outline">{f.module}</Badge>
            <Badge variant="outline">Teil {f.teil}</Badge>
            <Badge variant={f.status === "published" ? "default" : "secondary"}>{f.status}</Badge>
          </div>
          <h3 className="font-semibold">{f.title || "Untitled"}</h3>
          {f.passage && <p className="rounded border bg-muted/30 p-3 whitespace-pre-wrap">{f.passage}</p>}
          <p className="whitespace-pre-wrap">{f.prompt || "Prompt…"}</p>
          {needsOptions && (
            <ul className="space-y-1">
              {f.options.filter(Boolean).map((o, i) => (
                <li key={i} className={`rounded border px-2 py-1 ${f.correct.includes(o) ? "border-accent bg-accent/10" : ""}`}>
                  {String.fromCharCode(65 + i)}. {o}
                </li>
              ))}
            </ul>
          )}
          {f.explanation && <p className="text-xs text-muted-foreground border-t pt-2">{f.explanation}</p>}
        </CardContent>
      </Card>
    </div>
  );
}