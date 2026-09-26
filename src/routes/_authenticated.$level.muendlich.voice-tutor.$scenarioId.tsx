import { createFileRoute, Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff } from "lucide-react";
import { useVoiceTutorAudio } from "@/lib/muendlich/useVoiceTutorAudio";
import { ExaminerAvatar, EXAMINER_STATE_LABEL, type ExaminerState } from "@/components/muendlich/ExaminerAvatar";
import { VoiceTutorCountdown } from "@/components/muendlich/VoiceTutorCountdown";
import { VoiceTutorCorrectionsPanel, type VoiceTutorCorrectionsData } from "@/components/muendlich/VoiceTutorCorrectionsPanel";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { useAuth } from "@/lib/auth";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { VOICE_TUTOR_ENABLED } from "@/lib/features";
import { supabase } from "@/integrations/supabase/client";

// Same relay, different path suffix — see useVoiceTutorAudio.ts.
const RELAY_URL = (import.meta as any).env?.VITE_MUENDLICH_RELAY_URL ?? "ws://localhost:8787";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/$level/muendlich/voice-tutor/$scenarioId")({
  component: VoiceTutorSession,
});

const TERMINATED_MESSAGE: Record<string, string> = {
  daily_cap_exceeded: "Du hast dein tägliches Zeitkontingent (45 Minuten) für heute aufgebraucht. Komm morgen wieder!",
  budget_exceeded: "Der Sprachtrainer ist gerade stark ausgelastet. Bitte versuche es in ein paar Minuten erneut.",
  ai_error: "Es gab ein technisches Problem mit dem Sprachtrainer. Bitte versuche es erneut.",
  idle_timeout: "Die Sitzung wurde wegen Inaktivität beendet.",
};

type CorrectionState = { status: "idle" } | { status: "loading" } | { status: "done"; data: VoiceTutorCorrectionsData } | { status: "error"; message: string };

function VoiceTutorSession() {
  const { scenarioId } = useParams({ from: "/_authenticated/$level/muendlich/voice-tutor/$scenarioId" });
  const activeLevel = useActiveLevel();
  const { isAdmin, loading, roleLoading } = useAuth();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess("muendlich");
  const navigate = useNavigate();

  const [scenarioTitle, setScenarioTitle] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [endedManually, setEndedManually] = useState(false);
  const [correction, setCorrection] = useState<CorrectionState>({ status: "idle" });

  useEffect(() => {
    db.from("voice_tutor_scenarios").select("title").eq("id", scenarioId).maybeSingle()
      .then(({ data }: { data: { title: string } | null }) => setScenarioTitle(data?.title ?? null));
  }, [scenarioId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null));
  }, []);

  const audio = useVoiceTutorAudio(started && !endedManually ? RELAY_URL : null, scenarioId, accessToken);

  const ended = endedManually || !!audio.terminated;

  // Fires the deferred correction pass exactly once, the moment the
  // conversation ends (server-terminated or user-initiated) — never during
  // the live conversation itself, matching the "no live correction" contract
  // in tutorGeminiLive.ts's system instruction.
  useEffect(() => {
    if (!ended || correction.status !== "idle" || !audio.sessionId || !accessToken) return;
    setCorrection({ status: "loading" });
    fetch("/api/muendlich/tutor-correction", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ session_id: audio.sessionId }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Auswertung fehlgeschlagen");
        setCorrection({ status: "done", data: json });
      })
      .catch((e) => setCorrection({ status: "error", message: e instanceof Error ? e.message : "Auswertung fehlgeschlagen" }));
  }, [ended, correction.status, audio.sessionId, accessToken]);

  const handleEnd = useCallback(() => {
    audio.reconnect(); // closes the WS/mic cleanly (reconnect() calls stop() internally, then resets)
    setEndedManually(true);
  }, [audio]);

  if (loading || roleLoading || accessLoading) return null;

  const b2OrAdmin = activeLevel === "TELC_B2" || isAdmin;
  const levelSeg = activeLevel === "TELC_B1" ? "b1" : "b2";
  if (!VOICE_TUTOR_ENABLED || !b2OrAdmin || !hasAccess) {
    return <Navigate to="/$level/muendlich" params={{ level: levelSeg }} replace />;
  }

  const examinerState: ExaminerState = !audio.connected || !audio.ready ? "connecting" : audio.aiSpeaking ? "speaking" : audio.aiThinking ? "thinking" : "listening";

  if (!started) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center">
        <h1 className="text-lg font-bold text-foreground">{scenarioTitle ?? <Loader2 className="mx-auto h-5 w-5 animate-spin" />}</h1>
        <p className="text-sm text-muted-foreground">Ein freies Gespräch auf Deutsch mit deinem KI-Sprachpartner. Sprachfehler werden nach dem Gespräch angezeigt, nicht während des Sprechens.</p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          disabled={!scenarioTitle}
          className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50"
        >
          <Mic className="h-4 w-4" /> Gespräch starten
        </button>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        {audio.terminated && (
          <p className="rounded-xl bg-muted p-3 text-center text-sm text-muted-foreground">{TERMINATED_MESSAGE[audio.terminated] ?? "Die Sitzung wurde beendet."}</p>
        )}

        {correction.status === "loading" && (
          <div className="flex flex-col items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Auswertung läuft…
          </div>
        )}
        {correction.status === "error" && (
          <p className="rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">{correction.message}</p>
        )}
        {correction.status === "done" && <VoiceTutorCorrectionsPanel data={correction.data} />}

        <button
          type="button"
          onClick={() => navigate({ to: "/$level/muendlich", params: { level: levelSeg } })}
          className="w-full rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted/70"
        >
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-4">
      <div className="flex w-full items-center justify-between">
        <h1 className="text-sm font-bold text-foreground">{scenarioTitle}</h1>
        <VoiceTutorCountdown secondsRemaining={audio.secondsRemaining} />
      </div>

      <ExaminerAvatar state={examinerState} />
      <p className="text-xs text-muted-foreground">{audio.error ? <span className="text-destructive">{audio.error}</span> : EXAMINER_STATE_LABEL[examinerState]}</p>

      <div className="w-full flex-1 space-y-2 overflow-y-auto rounded-xl border border-border bg-card/50 p-3 text-xs">
        {audio.transcript.length === 0 && <p className="text-center text-muted-foreground">Das Gespräch beginnt gleich…</p>}
        {audio.transcript.map((line, i) => (
          <p key={i} className={line.speaker === "tutor" ? "text-foreground" : "text-right text-rose-600 dark:text-rose-400"}>
            <span className="font-semibold">{line.speaker === "tutor" ? "Sprachpartner: " : "Du: "}</span>{line.text}
          </p>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => audio.setMicMuted(!audio.micMuted)}
          aria-label={audio.micMuted ? "Mikrofon einschalten" : "Mikrofon stummschalten"}
          className={`flex h-11 w-11 items-center justify-center rounded-full ${audio.micMuted ? "bg-rose-500/10 text-rose-500" : "bg-muted text-foreground"}`}
        >
          {audio.micMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={handleEnd}
          aria-label="Gespräch beenden"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
