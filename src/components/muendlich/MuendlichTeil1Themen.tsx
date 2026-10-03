/**
 * Mündlich Teil 1 main view — same Hero Card + gated-fetch pattern as
 * MuendlichTeil3Themen.tsx (see that file's header for the full rationale).
 * Reused as-is for Teil 1 since get_muendlich_catalog/has_plan_access RLS
 * are already generic across teil — B1's single "Bildbeschreibung" card and
 * B2's seven Präsentation topics both flow through this same component.
 */
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { useMuendlichCatalog } from "@/lib/useContentAccess";
import { PaywallModal } from "@/components/PaywallModal";
import { HeroCard } from "./MuendlichTopicCards";
import { Teil1TopicModal, type Teil1TopicRow } from "./MuendlichTeil1TopicModal";

export function MuendlichTeil1Themen() {
  const level = useActiveLevel();
  const levelLabel = level === "TELC_B1" ? "B1" : "B2";
  const catalog = useMuendlichCatalog(1, level);
  const [openTopic, setOpenTopic] = useState<Teil1TopicRow | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  async function openTopicModal(id: string) {
    setFetchingId(id);
    const { data } = await supabase
      .from("muendlich_materials")
      .select("id, title, body_text, theme_category, difficulty_level, speaking_toolbox")
      .eq("id", id)
      .maybeSingle();
    setFetchingId(null);
    if (data) setOpenTopic(data as Teil1TopicRow);
    else setPaywallOpen(true);
  }

  if (catalog.loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (!catalog.items.length) return <p className="py-10 text-center text-sm text-muted-foreground">No topics available yet.</p>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.items.map((t, i) => (
          <HeroCard key={t.id} topic={t} index={i} loading={fetchingId === t.id} onOpen={() => openTopicModal(t.id)} levelLabel={levelLabel} />
        ))}
      </div>

      {openTopic && <Teil1TopicModal topic={openTopic} onClose={() => setOpenTopic(null)} />}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
