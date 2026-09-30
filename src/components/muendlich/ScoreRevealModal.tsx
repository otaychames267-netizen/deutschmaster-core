import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Loader2, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EvaluationReport } from "./EvaluationReport";
import type { MuendlichEvaluationResult } from "@/lib/grading/muendlich-evaluator";

const db = supabase as any;

/** Shown once the exam finishes — resolves this room's exam session, then
 * polls for the caller's own evaluation row (own-eyes-only RLS: this can
 * never see the partner's evaluation), and reveals the score with a
 * confetti burst on a pass, alongside the transcript for self-review and
 * the existing PDF-export button. */
export function ScoreRevealModal({ roomId, candidateName, roomCode }: { roomId: string; candidateName: string; roomCode: string }) {
  const [evaluation, setEvaluation] = useState<MuendlichEvaluationResult | null>(null);
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([]);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const firedConfetti = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    setFailed(false);
    const poll = async () => {
      attempts++;
      const { data: session } = await db.from("muendlich_exam_sessions").select("id, transcript").eq("room_id", roomId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (cancelled || !session) { if (attempts < 30) setTimeout(poll, 2000); else setFailed(true); return; }
      if (Array.isArray(session.transcript)) setTranscript(session.transcript);

      const { data } = await db.from("muendlich_evaluations").select("*").eq("session_id", session.id).maybeSingle();
      if (cancelled) return;
      if (data) {
        setEvaluation({
          teil1_score: data.teil1_score, teil2_score: data.teil2_score, teil3_score: data.teil3_score,
          overall_score: data.overall_score, passed: data.passed, cefr_level: data.cefr_level,
          feedback: data.feedback, model: data.model,
        });
        return;
      }
      // evaluation generation runs 2 sequential Claude calls server-side
      // (with its own internal retry on a malformed response), can take a
      // while. Real bug found via live-testing a full exam (2026-09-30):
      // this used to just stop silently once attempts ran out, leaving the
      // student staring at "wird erstellt…" forever with zero explanation —
      // now surfaces a real error state with a retry option instead.
      if (attempts < 30) setTimeout(poll, 2000);
      else setFailed(true);
    };
    poll();
    return () => { cancelled = true; };
  }, [roomId, retryKey]);

  useEffect(() => {
    if (evaluation?.passed && !firedConfetti.current) {
      firedConfetti.current = true;
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.4 } });
    }
  }, [evaluation]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
        {failed ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-bold text-foreground">Die Auswertung konnte noch nicht geladen werden.</p>
            <p className="max-w-xs text-xs text-muted-foreground">Dein Prüfungsergebnis wurde gespeichert. Das kann manchmal etwas länger dauern — versuche es erneut oder schau in ein paar Minuten in deinem Profil vorbei.</p>
            <button
              type="button"
              onClick={() => setRetryKey((k) => k + 1)}
              className="rounded-xl bg-rose-500 px-5 py-2 text-sm font-bold text-white hover:bg-rose-600"
            >
              Erneut versuchen
            </button>
          </div>
        ) : !evaluation ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            <p className="font-bold text-foreground">Ihre Auswertung wird erstellt…</p>
            <p className="text-xs text-muted-foreground">Das kann einen Moment dauern.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              {evaluation.passed && <PartyPopper className="mx-auto mb-2 h-8 w-8 text-amber-500" />}
              <p className="text-4xl font-black text-foreground">{evaluation.overall_score}<span className="text-lg text-muted-foreground">/75</span></p>
              <p className={`mt-1 text-sm font-bold ${evaluation.passed ? "text-emerald-600" : "text-destructive"}`}>{evaluation.passed ? "Bestanden" : "Nicht bestanden"} · {evaluation.cefr_level}</p>
            </div>

            <EvaluationReport evaluation={evaluation} candidateName={candidateName} roomCode={roomCode} examDate={new Date()} />

            {transcript.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Transkript zur Selbstkorrektur</p>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-muted/50 p-3 text-xs">
                  {transcript.map((t, i) => (
                    <div key={i}><span className="font-bold">{t.speaker === "examiner" ? "Prüferin" : `Person ${t.speaker}`}:</span> <span className="text-muted-foreground">{t.text}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
