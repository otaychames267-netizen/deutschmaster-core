/**
 * Mündlich Teil 3 main view — Hero Card grid (owner decision 2026-08-10:
 * PDF viewer removed entirely). Every topic is a Hero Card; clicking one
 * fetches that topic's full row directly (id, title, body_text,
 * speaking_toolbox) — the SAME has_plan_access RLS the table has always
 * enforced decides whether the query returns real content or nothing. A
 * real row opens the full native content modal (Erklärung, Vorstellung &
 * Dialog, Wortschatz — everything that used to be PDF-only); an empty
 * result opens the paywall instead. The grid itself (which topics exist,
 * including ones never introduced in a Tunisian exam center) is always
 * visible via the titles-only catalog RPC — browsing costs nothing, only
 * opening a topic requires an active plan.
 */
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel } from "@/lib/useActiveLevel";
import { useMuendlichCatalog } from "@/lib/useContentAccess";
import { PaywallModal } from "@/components/PaywallModal";
import { HeroCard, UnassignedTopicsNotice } from "./MuendlichTopicCards";
import { Teil3TopicModal, type Teil3TopicRow } from "./MuendlichTeil3TopicModal";

export function MuendlichTeil3Themen() {
  const level = useActiveLevel();
  const catalog = useMuendlichCatalog(3, level);
  const [openTopic, setOpenTopic] = useState<Teil3TopicRow | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  const mainTopics = useMemo(() => catalog.items.filter((t) => !t.is_unassigned_center), [catalog.items]);
  const unassignedTopics = useMemo(() => catalog.items.filter((t) => t.is_unassigned_center), [catalog.items]);

  async function openTopicModal(id: string) {
    setFetchingId(id);
    const { data } = await supabase
      .from("muendlich_materials")
      .select("id, title, body_text, theme_category, difficulty_level, speaking_toolbox")
      .eq("id", id)
      .maybeSingle();
    setFetchingId(null);
    if (data) setOpenTopic(data as Teil3TopicRow);
    else setPaywallOpen(true);
  }

  if (catalog.loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (!catalog.items.length) return <p className="py-10 text-center text-sm text-muted-foreground">No topics available yet.</p>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mainTopics.map((t, i) => (
          <HeroCard key={t.id} topic={t} index={i} loading={fetchingId === t.id} onOpen={() => openTopicModal(t.id)} />
        ))}
      </div>

      {unassignedTopics.length > 0 && (
        <div>
          <UnassignedTopicsNotice />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {unassignedTopics.map((t, i) => (
              <HeroCard key={t.id} topic={t} index={i} loading={fetchingId === t.id} onOpen={() => openTopicModal(t.id)} />
            ))}
          </div>
        </div>
      )}

      {openTopic && <Teil3TopicModal topic={openTopic} onClose={() => setOpenTopic(null)} />}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
