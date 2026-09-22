import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { TopicSelector, type TopicMaterial } from "@/components/muendlich/TopicSelector";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { useAuth } from "@/lib/auth";
import { useHasPlanAccess } from "@/lib/useContentAccess";
import { VOICE_TUTOR_ENABLED } from "@/lib/features";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/$level/muendlich/voice-tutor/")({
  component: VoiceTutorPicker,
});

interface VoiceTutorScenario {
  id: string;
  slug: string;
  title: string;
  description: string | null;
}

/** B2-only for now — a check deliberately SEPARATE from useHasPlanAccess
 * (module/plan access) and from LevelLayout (which only blocks cross-level
 * URL access, not feature-specific restrictions). See features.ts's
 * VOICE_TUTOR_ENABLED doc comment. */
function VoiceTutorPicker() {
  const activeLevel = useActiveLevel();
  const { isAdmin, loading, roleLoading } = useAuth();
  const { hasAccess, loading: accessLoading } = useHasPlanAccess("muendlich");
  const navigate = useNavigate();

  const [scenarios, setScenarios] = useState<VoiceTutorScenario[] | null>(null);

  useEffect(() => {
    if (!activeLevel) return;
    db.from("voice_tutor_scenarios")
      .select("id, slug, title, description")
      .eq("level", activeLevel)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }: { data: VoiceTutorScenario[] | null }) => setScenarios(data ?? []));
  }, [activeLevel]);

  if (loading || roleLoading || accessLoading) return null;

  const b2OrAdmin = activeLevel === "TELC_B2" || isAdmin;
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

  if (!scenarios) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const topicOptions: TopicMaterial[] = scenarios.map((s) => ({
    id: s.id, title: s.title, body_text: s.description, key_arguments: null, difficulty_level: null, theme_category: null,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-500"><Mic className="h-5 w-5" /></div>
        <div>
          <h1 className="text-lg font-bold text-foreground">KI-Sprachtrainer</h1>
          <p className="text-xs text-muted-foreground">Wähle ein Übungsthema für ein freies Gespräch mit deinem KI-Sprachpartner.</p>
        </div>
      </div>

      <TopicSelector
        teil={1}
        options={topicOptions}
        onPick={(title) => {
          const picked = scenarios.find((s) => s.title === title);
          if (picked) navigate({ to: "/$level/muendlich/voice-tutor/$scenarioId", params: { level: activeLevel === "TELC_B1" ? "b1" : "b2", scenarioId: picked.id } });
        }}
      />
    </div>
  );
}
