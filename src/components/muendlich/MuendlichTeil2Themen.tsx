/**
 * Mündlich Teil 2 main view — dual-display layout (owner decision
 * 2026-08-10, extended 2026-08-10): a large protected/animated PDF
 * showcase (Prüfungsfragen, full Wortschatz, Arabic explanations —
 * PDF-exclusive) plus a single stack of topic cards, each carrying its own
 * title, full source text, and its associated Redemittel (the phrase
 * arrays already authored across the topic's Inhalt/Meinung/Erfahrung/
 * Vor-Nachteile sections). No category subheadings — cards stack directly.
 * Topics never introduced in a Tunisian exam center move to their own
 * labeled section at the very bottom instead of being hidden.
 *
 * Admins get the full table read (speaking_toolbox included) same as
 * before; everyone else — subscriber or not — gets the catalog RPC, which
 * now also returns is_unassigned_center and a minimized redemittel_data
 * object (never the dialogue-equivalent Prüfungsfragen, full Wortschatz,
 * or Arabic explanations).
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, enforceLevel } from "@/lib/useActiveLevel";
import { useAuth } from "@/lib/auth";
import { useMuendlichCatalog } from "@/lib/useContentAccess";
import { PaywallModal } from "@/components/PaywallModal";
import { ProtectedPdfShowcase, TopicTextCard, UnassignedTopicsNotice, type DualDisplayTopic, type MuendlichBook, type RedemittelItem } from "./MuendlichDualDisplay";

interface Bilingual { de: string; ar: string }
interface RedemittelData {
  inhalt_redemittel: Bilingual[] | null; meinung_redemittel: Bilingual[] | null;
  experience_redemittel: Bilingual[] | null; heimatland_redemittel: Bilingual[] | null;
  vorteile_redemittel: Bilingual[] | null; nachteile_redemittel: Bilingual[] | null;
}

const REDEMITTEL_LABELS: [keyof RedemittelData, string][] = [
  ["inhalt_redemittel", "Inhalt"], ["meinung_redemittel", "Meinung"],
  ["experience_redemittel", "Erfahrung"], ["heimatland_redemittel", "Heimatland"],
  ["vorteile_redemittel", "Vorteile"], ["nachteile_redemittel", "Nachteile"],
];

function redemittelItemsFromData(data: RedemittelData | null): RedemittelItem[] {
  if (!data) return [];
  const items: RedemittelItem[] = [];
  for (const [key, label] of REDEMITTEL_LABELS) {
    const arr = data[key];
    if (arr && arr.length) items.push({ label, lines: arr.map((r) => r.de) });
  }
  return items;
}

function redemittelDataFromToolbox(tb: any): RedemittelData | null {
  if (!tb) return null;
  return {
    inhalt_redemittel: tb.page2_inhalt?.inhalt_redemittel ?? null,
    meinung_redemittel: tb.page3_meinung?.redemittel ?? null,
    experience_redemittel: tb.page4_erfahrung?.experience_redemittel ?? null,
    heimatland_redemittel: tb.page4_erfahrung?.heimatland_redemittel ?? null,
    vorteile_redemittel: tb.page5_procontra?.vorteile?.redemittel ?? null,
    nachteile_redemittel: tb.page5_procontra?.nachteile?.redemittel ?? null,
  };
}

export function MuendlichTeil2Themen() {
  const level = useActiveLevel();
  const { isAdmin } = useAuth();
  const catalog = useMuendlichCatalog(2, level);
  const [topics, setTopics] = useState<DualDisplayTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<MuendlichBook | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useEffect(() => {
    if (!level) return;
    if (isAdmin) {
      (async () => {
        const { data } = await supabase
          .from("muendlich_materials")
          .select("id, title, body_text, theme_category, difficulty_level, is_unassigned_center, level, speaking_toolbox")
          .eq("teil", 2).eq("category", "themen").eq("level", level)
          .order("title");
        const rows = ((data ?? []) as any[]).map((r) => ({
          id: r.id, title: r.title, body_text: r.body_text, theme_category: r.theme_category,
          difficulty_level: r.difficulty_level, is_unassigned_center: r.is_unassigned_center, level: r.level,
          redemittelItems: redemittelItemsFromData(redemittelDataFromToolbox(r.speaking_toolbox)),
        }));
        setTopics(enforceLevel(rows, level));
        setLoading(false);
      })();
    } else {
      setTopics(catalog.items.map((c) => ({
        id: c.id, title: c.title, body_text: c.body_text,
        theme_category: c.theme_category, difficulty_level: c.difficulty_level,
        is_unassigned_center: c.is_unassigned_center,
        redemittelItems: redemittelItemsFromData((c as any).redemittel_data ?? null),
      })));
      setLoading(catalog.loading);
    }
    (async () => {
      const { data } = await supabase
        .from("muendlich_materials")
        .select("title, storage_path, admin_storage_path")
        .eq("teil", 2).eq("category", "redemittel").eq("level", level)
        .not("storage_path", "is", null)
        .maybeSingle();
      const path = isAdmin && data?.admin_storage_path ? data.admin_storage_path : data?.storage_path;
      setBook(path ? { storage_path: path, title: data!.title } : null);
    })();
  }, [level, isAdmin, catalog.items, catalog.loading]);

  const mainTopics = useMemo(() => topics.filter((t) => !t.is_unassigned_center), [topics]);
  const unassignedTopics = useMemo(() => topics.filter((t) => t.is_unassigned_center), [topics]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (!topics.length) return <p className="py-10 text-center text-sm text-muted-foreground">No topics available yet.</p>;

  return (
    <div className="space-y-8">
      <ProtectedPdfShowcase book={book} onUnlock={() => setPaywallOpen(true)} />

      <div className="space-y-4">
        {mainTopics.map((t, i) => <TopicTextCard key={t.id} topic={t} index={i} />)}
      </div>

      {unassignedTopics.length > 0 && (
        <div>
          <UnassignedTopicsNotice />
          <div className="space-y-4">
            {unassignedTopics.map((t, i) => <TopicTextCard key={t.id} topic={t} index={i} />)}
          </div>
        </div>
      )}

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
