/**
 * Sprachbausteine Teil 2 — Lückentext mit Wortbox
 *
 * Security: correct answers are NEVER fetched. Scoring is done
 * server-side via supabase.rpc("score_sb_t2") only after submission.
 *
 * UX:
 *  - Left: passage with numbered gap buttons inline
 *  - Right: fixed word box sidebar with available words
 *  - Click a gap to activate it (highlighted border)
 *  - Click a word from the sidebar → fills the active gap; word becomes unavailable
 *  - Clicking a filled gap reactivates it and returns its word to the pool
 *  - Each word can be used only once
 */
import { useState, useRef } from "react";
import { CheckCircle2, XCircle, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface SBT2Word {
  word_number: number;
  word: string;
}

export interface SBT2ExerciseData {
  id: string;
  title: string;
  passage: string; // text with {{N}} gap markers
  words: SBT2Word[];
}

interface ScoreResult {
  gap_number: number;
  correct: boolean;
  your_answer: string;
  correct_answer: string;
}

interface Props {
  exercise: SBT2ExerciseData;
  onComplete?: (score: number, total: number) => void;
}

// Parse passage into segments: string | gap_number
function parsePassage(passage: string): Array<string | number> {
  const parts = passage.split(/(\{\{\d+\}\})/);
  return parts.map((p) => {
    const m = p.match(/^\{\{(\d+)\}\}$/);
    return m ? parseInt(m[1]) : p;
  });
}

export function SBTeil2Exercise({ exercise, onComplete }: Props) {
  const segments = parsePassage(exercise.passage);
  const gapNumbers = segments.filter((s): s is number => typeof s === "number");

  // answers: gap_number → word
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [activeGap, setActiveGap] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [results, setResults] = useState<ScoreResult[]>([]);
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);

  // Which words are "used": word → gap_number
  const usedWords = new Map<string, number>();
  for (const [gap, word] of answers) usedWords.set(word, gap);

  function handleGapClick(gapNum: number) {
    if (submitted) return;
    if (activeGap === gapNum) {
      setActiveGap(null);
    } else {
      setActiveGap(gapNum);
    }
  }

  function handleWordClick(word: string) {
    if (submitted || activeGap === null) return;

    setAnswers((prev) => {
      const next = new Map(prev);
      // If this word was already used in another gap, free that gap
      for (const [g, w] of next) {
        if (w === word && g !== activeGap) next.delete(g);
      }
      // If the active gap already had a different word, that word returns to pool automatically
      next.set(activeGap, word);
      return next;
    });
    setActiveGap(null);
  }

  function handleClearGap(gapNum: number) {
    if (submitted) return;
    setAnswers((prev) => {
      const next = new Map(prev);
      next.delete(gapNum);
      return next;
    });
    setActiveGap(gapNum);
  }

  async function handleSubmit() {
    if (scoring || submitted) return;
    setScoring(true);
    const p_answers: Record<string, string> = {};
    for (const [gap, word] of answers) p_answers[String(gap)] = word;

    const { data, error } = await (supabase as any).rpc("score_sb_t2", {
      p_exercise_id: exercise.id,
      p_answers,
    });
    setScoring(false);
    if (error || !data) {
      console.error("Scoring error", error);
      return;
    }
    setResults(data.results ?? []);
    setScore({ score: data.score, total: data.total });
    setSubmitted(true);
    onComplete?.(data.score, data.total);
  }

  function handleReset() {
    setAnswers(new Map());
    setActiveGap(null);
    setSubmitted(false);
    setResults([]);
    setScore(null);
  }

  const resultMap = new Map<number, ScoreResult>(results.map((r) => [r.gap_number, r]));

  function renderGap(gapNum: number) {
    const filled = answers.get(gapNum);
    const isActive = activeGap === gapNum && !submitted;
    const res = submitted ? resultMap.get(gapNum) : null;

    if (submitted && res) {
      return (
        <span
          key={gapNum}
          className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded text-sm font-medium border ${
            res.correct
              ? "bg-green-100 border-green-400 text-green-800"
              : "bg-red-100 border-red-400 text-red-800"
          }`}
        >
          {res.correct ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          <span>{res.your_answer || "—"}</span>
          <span className="text-xs opacity-60">({gapNum})</span>
        </span>
      );
    }

    if (filled) {
      return (
        <button
          key={gapNum}
          onClick={() => handleClearGap(gapNum)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded text-sm font-medium border cursor-pointer transition-colors ${
            isActive
              ? "bg-blue-100 border-blue-500 ring-2 ring-blue-300"
              : "bg-blue-50 border-blue-300 hover:bg-blue-100"
          }`}
          title="Klicken zum Ändern"
        >
          <span>{filled}</span>
          <span className="text-xs text-gray-400">({gapNum})</span>
        </button>
      );
    }

    return (
      <button
        key={gapNum}
        onClick={() => handleGapClick(gapNum)}
        className={`inline-flex items-center px-3 py-0.5 mx-0.5 rounded text-sm border cursor-pointer transition-colors ${
          isActive
            ? "bg-blue-100 border-blue-500 ring-2 ring-blue-300 text-blue-700"
            : "bg-gray-50 border-gray-300 hover:bg-gray-100 text-gray-500"
        }`}
      >
        ({gapNum})
      </button>
    );
  }

  const totalGaps = gapNumbers.length;
  const answeredCount = answers.size;
  const allAnswered = answeredCount === totalGaps;

  return (
    <div className="flex gap-6 max-w-5xl mx-auto">
      {/* ── Main passage ── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{exercise.title}</h2>

          {activeGap !== null && !submitted && (
            <div className="mb-3 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              Lücke <strong>{activeGap}</strong> aktiv — wählen Sie ein Wort aus der Box rechts.
            </div>
          )}

          <div className="prose prose-sm max-w-none leading-relaxed text-gray-800">
            {segments.map((seg, idx) =>
              typeof seg === "number" ? (
                renderGap(seg)
              ) : (
                <span key={idx}>{seg}</span>
              )
            )}
          </div>

          {/* Submit / reset */}
          <div className="mt-6 flex items-center gap-3">
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={scoring || !allAnswered}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {scoring && <Loader2 className="w-4 h-4 animate-spin" />}
                Auswertung ({answeredCount}/{totalGaps})
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Neu starten
              </button>
            )}

            {score && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-lg ${
                score.score / score.total >= 0.8 ? "bg-green-100 text-green-800" :
                score.score / score.total >= 0.5 ? "bg-yellow-100 text-yellow-800" :
                "bg-red-100 text-red-800"
              }`}>
                {score.score} / {score.total}
              </div>
            )}
          </div>
        </div>

        {/* Correction table */}
        {submitted && results.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-3">Korrektur</h3>
            <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-500 mb-2 border-b pb-2">
              <span>Lücke</span><span>Ihre Antwort</span><span>Richtige Antwort</span><span>Ergebnis</span>
            </div>
            {results.map((r) => (
              <div key={r.gap_number} className={`grid grid-cols-4 gap-2 text-sm py-1.5 border-b last:border-0 ${r.correct ? "text-green-800" : "text-red-800"}`}>
                <span className="font-medium">({r.gap_number})</span>
                <span>{r.your_answer || "—"}</span>
                <span className="font-medium">{r.correct_answer}</span>
                <span>{r.correct ? <CheckCircle2 className="w-4 h-4 inline" /> : <XCircle className="w-4 h-4 inline" />}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Word box sidebar ── */}
      <div className="w-52 shrink-0">
        <div className="sticky top-6 bg-white rounded-xl border-2 border-gray-300 shadow-sm p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Wortbox</div>
          <div className="flex flex-col gap-2">
            {exercise.words.map((w) => {
              const isUsed = usedWords.has(w.word);
              return (
                <button
                  key={w.word_number}
                  onClick={() => !isUsed && handleWordClick(w.word)}
                  disabled={isUsed || submitted || activeGap === null}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium text-left transition-all border ${
                    submitted
                      ? "cursor-default opacity-70 border-gray-200 bg-gray-50 text-gray-600"
                      : isUsed
                      ? "opacity-40 cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 line-through"
                      : activeGap !== null
                      ? "border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 cursor-pointer"
                      : "border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {w.word}
                </button>
              );
            })}
          </div>
          {!submitted && (
            <div className="mt-3 text-xs text-gray-400 text-center">
              {activeGap === null
                ? "Lücke anklicken, dann Wort wählen"
                : `Wort für Lücke ${activeGap} wählen`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
