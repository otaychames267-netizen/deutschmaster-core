import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { recordCompletion } from "@/lib/useUserProgress";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Send, RotateCcw,
  CheckCircle2, XCircle, Loader2, Headphones,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */

interface ExamItem {
  id: string;
  position: number;
  kind: string;
  content: Record<string, unknown>;
  audio_file_id: string | null;
  points: number;
}

interface ExercisePlayerProps {
  examId: string;
  examTitle: string;
  onClose: () => void;
}

type Answer = string | string[] | Record<string, string>;

/* ─── Item renderers ─────────────────────────────────────────── */

function PassageMcq({
  content,
  answer,
  onChange,
  disabled,
}: {
  content: Record<string, unknown>;
  answer: Answer;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const passage = content.passage as string ?? "";
  const question = content.question as string ?? "";
  const options = (content.options as { label: string; text: string }[]) ?? [];

  return (
    <div className="space-y-5">
      {passage && (
        <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {passage}
        </div>
      )}
      <p className="font-semibold text-foreground">{question}</p>
      <div className="space-y-2.5">
        {options.map((opt) => (
          <button
            key={opt.label}
            disabled={disabled}
            onClick={() => onChange(opt.label)}
            className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
              answer === opt.label
                ? "border-primary bg-primary/5 font-medium"
                : "border-border bg-card hover:border-primary/30"
            } disabled:cursor-default`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
              answer === opt.label ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}>
              {opt.label}
            </span>
            <span className="text-foreground">{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HeadingMatch({
  content,
  answer,
  onChange,
  disabled,
}: {
  content: Record<string, unknown>;
  answer: Answer;
  onChange: (v: Record<string, string>) => void;
  disabled: boolean;
}) {
  const headings = (content.headings as string[]) ?? [];
  const texts = (content.texts as { id: string; preview: string }[]) ?? [];
  const current = (answer as Record<string, string>) || {};

  function select(textId: string, heading: string) {
    onChange({ ...current, [textId]: heading });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available headings</p>
        <div className="flex flex-wrap gap-2">
          {headings.map((h) => (
            <span key={h} className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium">
              {h}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {texts.map((text) => (
          <div key={text.id} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{text.preview}</p>
            <select
              disabled={disabled}
              value={current[text.id] ?? ""}
              onChange={(e) => select(text.id, e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
            >
              <option value="">— Select heading —</option>
              {headings.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function GapFill({
  content,
  answer,
  onChange,
  disabled,
}: {
  content: Record<string, unknown>;
  answer: Answer;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const before = content.before as string ?? "";
  const after  = content.after  as string ?? "";
  const options = (content.options as string[]) ?? [];

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-foreground">
        {before} <span className="rounded border border-dashed border-primary px-3 py-0.5 font-medium text-primary">{(answer as string) || "___"}</span> {after}
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {options.map((opt, i) => {
          const label = String.fromCharCode(65 + i);
          return (
            <button
              key={opt}
              disabled={disabled}
              onClick={() => onChange(opt)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                answer === opt
                  ? "border-primary bg-primary/5 font-medium"
                  : "border-border bg-card hover:border-primary/30"
              } disabled:cursor-default`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                answer === opt ? "border-primary bg-primary text-primary-foreground" : "border-border"
              }`}>{label}</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WritingPrompt({
  content,
  answer,
  onChange,
  disabled,
}: {
  content: Record<string, unknown>;
  answer: Answer;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const task = content.task as string ?? "";
  const minWords = (content.min_words as number) ?? 80;
  const maxWords = (content.max_words as number) ?? 150;
  const text = (answer as string) ?? "";
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/30 p-5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        {task}
      </div>
      <div>
        <textarea
          disabled={disabled}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          rows={10}
          placeholder="Write your response here…"
          className="w-full resize-none rounded-xl border border-input bg-background p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:cursor-default disabled:opacity-60"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>{wordCount} words</span>
          <span className={wordCount < minWords ? "text-destructive" : wordCount > maxWords ? "text-amber-500" : "text-emerald-500"}>
            Target: {minWords}–{maxWords} words
          </span>
        </div>
      </div>
    </div>
  );
}

function ListeningMcq({
  content,
  answer,
  onChange,
  disabled,
}: {
  content: Record<string, unknown>;
  answer: Answer;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const question = content.question as string ?? "";
  const options = (content.options as { label: string; text: string }[]) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Headphones className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">Listen to the audio recording, then answer the question below.</p>
      </div>
      <p className="font-semibold text-foreground">{question}</p>
      <div className="space-y-2.5">
        {options.map((opt) => (
          <button
            key={opt.label}
            disabled={disabled}
            onClick={() => onChange(opt.label)}
            className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
              answer === opt.label
                ? "border-primary bg-primary/5 font-medium"
                : "border-border bg-card hover:border-primary/30"
            } disabled:cursor-default`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
              answer === opt.label ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}>
              {opt.label}
            </span>
            <span>{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SituationMatch({
  content,
  answer,
  onChange,
  disabled,
}: {
  content: Record<string, unknown>;
  answer: Answer;
  onChange: (v: Record<string, string>) => void;
  disabled: boolean;
}) {
  const situations = (content.situations as { id: string; text: string }[]) ?? [];
  const infoTexts  = (content.info_texts  as { id: string; title: string; preview: string }[]) ?? [];
  const current    = (answer as Record<string, string>) || {};

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match each situation to an information text</p>
      </div>
      <div className="space-y-4">
        {situations.map((sit) => (
          <div key={sit.id} className="rounded-xl border border-border bg-card p-4">
            <p className="mb-3 text-sm font-medium text-foreground">{sit.text}</p>
            <select
              disabled={disabled}
              value={current[sit.id] ?? ""}
              onChange={(e) => onChange({ ...current, [sit.id]: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">— Select an info text —</option>
              {infoTexts.map((info) => (
                <option key={info.id} value={info.id}>{info.title}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-muted/10 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Info texts</p>
        <div className="space-y-2">
          {infoTexts.map((info) => (
            <div key={info.id} className="rounded-lg bg-card p-3">
              <p className="text-xs font-medium text-foreground">{info.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{info.preview}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Result screen ──────────────────────────────────────────── */

function ResultScreen({
  score,
  pointsEarned,
  pointsTotal,
  onRetry,
  onClose,
}: {
  score: number;
  pointsEarned: number;
  pointsTotal: number;
  onRetry: () => void;
  onClose: () => void;
}) {
  const passed = score >= 60;
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${passed ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
        {passed
          ? <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          : <XCircle className="h-10 w-10 text-destructive" />}
      </div>
      <div>
        <p className="text-3xl font-bold text-foreground">{score.toFixed(0)}%</p>
        <p className="mt-1 text-sm text-muted-foreground">{pointsEarned.toFixed(0)} / {pointsTotal.toFixed(0)} points</p>
        <p className={`mt-2 text-sm font-medium ${passed ? "text-emerald-500" : "text-destructive"}`}>
          {passed ? "Excellent! Keep going." : "Keep practising — you can do it!"}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Back to list
        </button>
      </div>
    </div>
  );
}

/* ─── Main player ────────────────────────────────────────────── */

export function ExercisePlayer({ examId, examTitle, onClose }: ExercisePlayerProps) {
  const { user } = useAuth();
  const [items, setItems] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; pointsEarned: number; pointsTotal: number } | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setCurrent(0);
    setAnswers({});

    const { data: itemData } = await supabase
      .from("exam_items")
      .select("id, position, kind, content, audio_file_id, points")
      .eq("exam_id", examId)
      .order("position", { ascending: true });

    setItems((itemData as ExamItem[]) ?? []);

    if (user) {
      const { data: sess } = await supabase
        .from("attempt_sessions")
        .insert({ user_id: user.id, exam_id: examId, status: "in_progress" })
        .select("id")
        .single();
      if (sess) setSessionId(sess.id as string);
    }

    setLoading(false);
  }, [examId, user]);

  useEffect(() => { loadItems(); }, [loadItems]);

  function setAnswer(itemId: string, value: Answer) {
    setAnswers((prev) => ({ ...prev, [itemId]: value }));
  }

  async function saveAnswer(itemId: string, value: Answer) {
    if (!sessionId) return;
    await supabase
      .from("attempt_answers")
      .upsert({ session_id: sessionId, item_id: itemId, answer: value as never })
      .eq("session_id", sessionId)
      .eq("item_id", itemId);
  }

  function handleChange(itemId: string, value: Answer) {
    setAnswer(itemId, value);
    saveAnswer(itemId, value);
  }

  async function handleSubmit() {
    if (!sessionId) return;
    setSubmitting(true);

    await supabase
      .from("attempt_sessions")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", sessionId);

    const totalPoints = items.reduce((s, i) => s + Number(i.points), 0);
    const answered = Object.keys(answers).length;
    const score = totalPoints > 0 ? Math.round((answered / items.length) * 100) : 0;

    await supabase.from("attempt_results").insert({
      session_id:    sessionId,
      user_id:       user!.id,
      exam_id:       examId,
      score,
      points_earned: Math.round(answered * (totalPoints / items.length)),
      points_total:  totalPoints,
      passed:        score >= 60,
    });

    await recordCompletion(user!.id, { isPerfect: score === 100 });

    setResult({ score, pointsEarned: Math.round(answered * (totalPoints / items.length)), pointsTotal: totalPoints });
    setSubmitting(false);
    toast.success("Exercise submitted!");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="font-semibold text-foreground">No questions in this exercise yet.</p>
        <p className="text-sm text-muted-foreground">Content will be added via PDF import.</p>
        <button onClick={onClose} className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Go back
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <ResultScreen
        score={result.score}
        pointsEarned={result.pointsEarned}
        pointsTotal={result.pointsTotal}
        onRetry={loadItems}
        onClose={onClose}
      />
    );
  }

  const item = items[current];
  const answer = answers[item.id] ?? "";
  const isLast = current === items.length - 1;

  function renderItem() {
    switch (item.kind) {
      case "passage_mcq":
        return <PassageMcq content={item.content} answer={answer} onChange={(v) => handleChange(item.id, v)} disabled={false} />;
      case "heading_match":
        return <HeadingMatch content={item.content} answer={answer} onChange={(v) => handleChange(item.id, v)} disabled={false} />;
      case "situation_match":
        return <SituationMatch content={item.content} answer={answer} onChange={(v) => handleChange(item.id, v)} disabled={false} />;
      case "gap_fill":
        return <GapFill content={item.content} answer={answer} onChange={(v) => handleChange(item.id, v)} disabled={false} />;
      case "listening_mcq":
        return <ListeningMcq content={item.content} answer={answer} onChange={(v) => handleChange(item.id, v)} disabled={false} />;
      case "writing_prompt":
        return <WritingPrompt content={item.content} answer={answer} onChange={(v) => handleChange(item.id, v)} disabled={false} />;
      default:
        return <p className="text-sm text-muted-foreground">Unknown item type: {item.kind}</p>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Question {current + 1} of {items.length}</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{examTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${
                i === current ? "w-6 bg-primary" : answers[items[i].id] ? "w-2 bg-emerald-500" : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${((current + 1) / items.length) * 100}%` }}
        />
      </div>

      {/* Item */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {renderItem()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-medium text-muted-foreground disabled:opacity-40 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit
          </button>
        ) : (
          <button
            onClick={() => setCurrent((c) => Math.min(items.length - 1, c + 1))}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
