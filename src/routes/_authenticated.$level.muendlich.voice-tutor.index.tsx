import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { TopicSelector, type TopicMaterial } from "@/components/muendlich/TopicSelector";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { useAuth } from "@/lib/auth";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { VOICE_TUTOR_ENABLED } from "@/lib/features";
import { supabase } from "@/integrations/supabase/client";
import { muendlichQuotaMessage } from "@/lib/muendlich/quota";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/$level/muendlich/voice-tutor/")({
  component: VoiceTutorPicker,
});

/** B2-only for now — a check deliberately SEPARATE from useHasPlanAccess
 * (module/plan access) and from LevelLayout (which only blocks cross-level
 * URL access, not feature-specific restrictions). See features.ts's
 * VOICE_TUTOR_ENABLED doc comment.
 *
 * Topic selection reuses muendlich_materials directly (teil, category=
 * 'themen', level) — the SAME content and the SAME TopicSelector component
 * the 2-candidate exam's own prep room already uses, per the owner's
 * explicit design (2026-09-29): Teil 1/2/3 topic selection should feel
 * identical to the real exam, just for one student. This build's live
 * conversation runs Teil 1 -> Teil 2 -> Teil 3 straight through in one
 * session (see the session route and server.ts's tutorTick* handoffs) —
 * all three topics are required to start. In Teil 3 the same AI switches
 * from examiner to a "study partner" persona for a joint-planning task. */
function VoiceTutorPicker() {
  const activeLevel = useActiveLevel();
  const { isAdmin, loading, roleLoading, user } = useAuth();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess("muendlich");
  const navigate = useNavigate();

  const [materials, setMaterials] = useState<Record<1 | 2 | 3, TopicMaterial[]> | null>(null);
  const [picked, setPicked] = useState<{ 1?: string; 2?: string; 3?: string }>({});
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeLevel) return;
    (async () => {
      const out: Record<1 | 2 | 3, TopicMaterial[]> = { 1: [], 2: [], 3: [] };
      for (const teil of [1, 2, 3] as const) {
        const { data } = await db.from("muendlich_materials")
          .select("id, title, body_text, key_arguments, difficulty_level, theme_category")
          .eq("teil", teil).eq("category", "themen").eq("level", activeLevel)
          .order(teil === 1 ? "sort_order" : "position");
        out[teil] = data ?? [];
      }
      setMaterials(out);
    })();
  }, [activeLevel]);

  if (loading || roleLoading || accessLoading) return null;

  const b2OrAdmin = activeLevel === "TELC_B2" || isAdmin;
  // CLOSED for everyone, admins included (owner decision 2026-10-05: the 1:1 tutor is parked until it has been run end to
  // end with ElevenLabs credits restored). Reopen = VOICE_TUTOR_ENABLED=true here + the relay secret MUENDLICH_TUTOR_ENABLED=true.
  if (!VOICE_TUTOR_ENABLED || !b2OrAdmin) {
    return <Navigate to="/$level/muendlich" params={{ level: activeLevel === "TELC_B1" ? "b1" : "b2" }} replace />;
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <p className="text-sm text-muted-foreground">Der KI-Sprachtrainer ist Teil deines Mündlich-Zugangs. Schalte ihn über dein Abonnement frei.</p>
      </div>
    );
  }

  if (!materials || !user) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const levelSeg = activeLevel === "TELC_B1" ? "b1" : "b2";
  const readyToStart = !!picked[1] && !!picked[2] && !!picked[3];

  async function handleStart() {
    if (!picked[1] || !user) return;
    setStarting(true);
    setError(null);
    const findId = (teil: 1 | 2 | 3, title: string | undefined) => materials![teil].find((m) => m.title === title)?.id ?? null;
    const { data, error: insertError } = await db.from("voice_tutor_sessions").insert({
      user_id: user.id, level: activeLevel,
      teil1_material_id: findId(1, picked[1]),
      teil2_material_id: findId(2, picked[2]),
      teil3_material_id: findId(3, picked[3]),
    }).select("id").single();
    if (insertError || !data) {
      setError(muendlichQuotaMessage(insertError?.message) ?? "Die Sitzung konnte nicht gestartet werden. Bitte versuche es erneut.");
      setStarting(false);
      return;
    }
    navigate({ to: "/$level/muendlich/voice-tutor/$sessionId", params: { level: levelSeg, sessionId: data.id } });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-28">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-500"><Mic className="h-5 w-5" /></div>
        <div>
          <h1 className="text-lg font-bold text-foreground">KI-Sprachtrainer</h1>
          <p className="text-xs text-muted-foreground">Wähle deine Themen wie in der echten Prüfung — übe dann Teil 1, 2 und 3 mit deiner KI-Prüferin, direkt nacheinander.</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-foreground">Teil 1 — Präsentation</h2>
        <TopicSelector teil={1} options={materials[1]} selected={picked[1]} onPick={(title) => setPicked((p) => ({ ...p, 1: title }))} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-foreground">Teil 2 — Gespräch</h2>
        <TopicSelector teil={2} options={materials[2]} selected={picked[2]} onPick={(title) => setPicked((p) => ({ ...p, 2: title }))} />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-foreground">Teil 3 — Gemeinsam planen</h2>
        <TopicSelector teil={3} options={materials[3]} selected={picked[3]} onPick={(title) => setPicked((p) => ({ ...p, 3: title }))} />
      </section>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4">
        <button
          type="button"
          onClick={handleStart}
          disabled={!readyToStart || starting}
          className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50"
        >
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
          Prüfung starten
        </button>
      </div>
    </div>
  );
}
