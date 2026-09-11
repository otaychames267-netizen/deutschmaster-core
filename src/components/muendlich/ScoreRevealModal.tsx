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
  const firedConfetti = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const { data: session } = await db.from("muendlich_exam_sessions").select("id, transcript").eq("room_id", roomId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (cancelled || !session) { if (attempts < 30) setTimeout(poll, 2000); return; }
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
      if (attempts < 30) setTimeout(poll, 2000); // evaluation generation runs 2 sequential Gemini calls server-side, can take a while
    };
    poll();
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => {
    if (evaluation?.passed && !firedConfetti.current) {
      firedConfetti.current = true;
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.4 } });
    }
  }, [evaluation]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
        {!evaluation ? (
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
