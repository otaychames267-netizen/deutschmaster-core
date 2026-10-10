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
import { voiceTutorAvailable } from "@/lib/features";
import { supabase } from "@/integrations/supabase/client";

// Same relay, different path suffix — see useVoiceTutorAudio.ts.
const RELAY_URL = (import.meta as any).env?.VITE_MUENDLICH_RELAY_URL ?? "ws://localhost:8787";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/$level/muendlich/voice-tutor/$sessionId")({
  component: VoiceTutorSession,
});

const TERMINATED_MESSAGE: Record<string, string> = {
  daily_cap_exceeded: "Du hast dein tägliches Zeitkontingent (45 Minuten) für heute aufgebraucht. Komm morgen wieder!",
  budget_exceeded: "Der Sprachtrainer ist gerade stark ausgelastet. Bitte versuche es in ein paar Minuten erneut.",
  ai_error: "Es gab ein technisches Problem mit dem Sprachtrainer. Bitte versuche es erneut.",
  idle_timeout: "Die Sitzung wurde wegen Inaktivität beendet.",
  insufficient_minutes: "Dein ElevenLabs-Kontingent für diesen Monat ist aufgebraucht. Bitte kontaktiere den Support.",
};

type CorrectionState = { status: "idle" } | { status: "loading" } | { status: "done"; data: VoiceTutorCorrectionsData } | { status: "error"; message: string };

/** Runs Teil 1 -> Teil 2 -> Teil 3 straight through in one session (see
 * server.ts's tutorTick* handoffs); "ended" covers both a normal
 * end-of-Teil-3 completion and any early termination, and the correction
 * pass always fires on whatever transcript exists by then. */
function VoiceTutorSession() {
  const { sessionId } = useParams({ from: "/_authenticated/$level/muendlich/voice-tutor/$sessionId" });
  const activeLevel = useActiveLevel();
  const { isAdmin, loading, roleLoading } = useAuth();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess("muendlich");
  const navigate = useNavigate();

  const [teil1Title, setTeil1Title] = useState<string | null>(null);
  const [teil2Title, setTeil2Title] = useState<string | null>(null);
  const [teil3Title, setTeil3Title] = useState<string | null>(null);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [endedManually, setEndedManually] = useState(false);
  const [correction, setCorrection] = useState<CorrectionState>({ status: "idle" });

  useEffect(() => {
    db.from("voice_tutor_sessions")
      .select("teil1_material_id, teil2_material_id, teil3_material_id, t1:teil1_material_id(title), t2:teil2_material_id(title), t3:teil3_material_id(title)")
      .eq("id", sessionId).maybeSingle()
      .then(({ data }: { data: { t1: { title: string } | { title: string }[] | null; t2: { title: string } | { title: string }[] | null; t3: { title: string } | { title: string }[] | null } | null }) => {
        if (!data) { setSessionValid(false); return; }
        setSessionValid(true);
        const one = (v: { title: string } | { title: string }[] | null) => (Array.isArray(v) ? v[0] : v)?.title ?? null;
        setTeil1Title(one(data.t1));
        setTeil2Title(one(data.t2));
        setTeil3Title(one(data.t3));
      });
  }, [sessionId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null));
  }, []);

  const audio = useVoiceTutorAudio(started && !endedManually ? RELAY_URL : null, sessionId, accessToken);

  const ended = endedManually || audio.sessionComplete || !!audio.terminated;

  // Fires the deferred correction pass exactly once, the moment the whole
  // session ends (server-completed after Teil 2, server-terminated, or
  // user-initiated) — never during the live conversation itself, and never
  // on Teil 1's own completion (the session continues straight into Teil 2).
  useEffect(() => {
    if (!ended || correction.status !== "idle" || !accessToken) return;
    setCorrection({ status: "loading" });
    fetch("/api/muendlich/tutor-correction", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Auswertung fehlgeschlagen");
        setCorrection({ status: "done", data: json });
      })
      .catch((e) => setCorrection({ status: "error", message: e instanceof Error ? e.message : "Auswertung fehlgeschlagen" }));
  }, [ended, correction.status, sessionId, accessToken]);

  const handleEnd = useCallback(() => {
    audio.reconnect(); // closes the WS/mic cleanly (reconnect() calls stop() internally, then resets)
    setEndedManually(true);
  }, [audio]);

  if (loading || roleLoading || accessLoading) return null;

  const b2OrAdmin = activeLevel === "TELC_B2" || isAdmin;
  const levelSeg = activeLevel === "TELC_B1" ? "b1" : "b2";
  // Closed for students, open to admins while VOICE_TUTOR_ADMIN_PREVIEW — see the matching comment in voice-tutor.index.tsx.
  if (!voiceTutorAvailable(isAdmin) || !b2OrAdmin || !hasAccess) {
    return <Navigate to="/$level/muendlich" params={{ level: levelSeg }} replace />;
  }
  if (sessionValid === false) {
    return <Navigate to="/$level/muendlich/voice-tutor" params={{ level: levelSeg }} replace />;
  }

  const examinerState: ExaminerState = !audio.connected || !audio.ready ? "connecting" : audio.aiSpeaking ? "speaking" : audio.aiThinking ? "thinking" : "listening";

  if (!started) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center">
        <h1 className="text-lg font-bold text-foreground">{teil1Title ?? <Loader2 className="mx-auto h-5 w-5 animate-spin" />}</h1>
        <p className="text-sm text-muted-foreground">Präsentiere dein Thema, dann stellt dir die KI-Prüferin drei Fragen dazu — genau wie in Teil 1 der echten Prüfung. Direkt danach geht es weiter mit Teil 2, und zum Schluss wird deine Prüferin zu deinem Übungspartner für Teil 3. Sprachfehler werden erst am Ende angezeigt, nicht während des Sprechens.</p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          disabled={!teil1Title || !teil2Title || !teil3Title}
          className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50"
        >
          <Mic className="h-4 w-4" /> Prüfung beginnen
        </button>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        {audio.sessionComplete && !audio.terminated && (
          <p className="rounded-xl bg-emerald-500/10 p-3 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">Teil 1, Teil 2 und Teil 3 abgeschlossen! Gut gemacht.</p>
        )}
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
      <div className="flex w-full items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wide text-rose-500">
            Teil {audio.currentStage}{audio.currentStage === 3 && " · Partnerübung"}
          </span>
          <h1 className="truncate text-sm font-bold text-foreground">
            {audio.currentStage === 3 ? teil3Title : audio.currentStage === 2 ? teil2Title : teil1Title}
          </h1>
        </div>
        <VoiceTutorCountdown secondsRemaining={audio.secondsRemaining} />
      </div>

      <ExaminerAvatar state={examinerState} />
      <p className="text-xs text-muted-foreground">{audio.error ? <span className="text-destructive">{audio.error}</span> : EXAMINER_STATE_LABEL[examinerState]}</p>

      <div className="w-full flex-1 space-y-2 overflow-y-auto rounded-xl border border-border bg-card/50 p-3 text-xs">
        {audio.transcript.length === 0 && <p className="text-center text-muted-foreground">Die Prüfung beginnt gleich…</p>}
        {audio.transcript.map((line, i) => (
          <p
            key={i}
            className={
              line.speaker === "student"
                ? "text-right text-rose-600 dark:text-rose-400"
                : line.speaker === "partner"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
            }
          >
            <span className="font-semibold">
              {line.speaker === "student" ? "Du: " : line.speaker === "partner" ? "Partner: " : "Prüferin: "}
            </span>
            {line.text}
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
          aria-label="Prüfung beenden"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"
        >
          <PhoneOff className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
