/**
 * Mündlich Teil 3 main view — dual-display layout (owner decision
 * 2026-08-10, extended 2026-08-10): a large protected/animated PDF
 * showcase (dialogue, full Wortschatz, Arabic explanations — PDF-exclusive)
 * plus a single stack of topic cards, each carrying its own title, full
 * scenario text, and its topic-specific Redemittel (the demo Frage/
 * Antwort/Reaktion per Struktur section — genuinely "its" expressions, not
 * the generic shared phrase bank). No category subheadings — cards stack
 * directly. Topics never introduced in a Tunisian exam center move to
 * their own labeled section at the very bottom instead of being hidden.
 *
 * Admins get the full table read (speaking_toolbox included) same as
 * before; everyone else — subscriber or not — gets the catalog RPC, which
 * now also returns is_unassigned_center and a minimized `struktur` slice
 * (never beispieldialog/wortschatz/erklaerung/Arabic).
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, enforceLevel } from "@/lib/useActiveLevel";
import { useAuth } from "@/lib/auth";
import { useMuendlichCatalog } from "@/lib/useContentAccess";
import { PaywallModal } from "@/components/PaywallModal";
import { ProtectedPdfShowcase, TopicTextCard, UnassignedTopicsNotice, type DualDisplayTopic, type MuendlichBook, type RedemittelItem } from "./MuendlichDualDisplay";
import { STRUKTUR_LABELS } from "./strukturLabels";

interface StrukturEntry { key: string; demo: { frage: string; antwort: string; reaktion?: string } }

function redemittelFromStruktur(struktur: StrukturEntry[] | null | undefined): RedemittelItem[] {
  if (!struktur) return [];
  return struktur.map((sec) => ({
    label: STRUKTUR_LABELS[sec.key] ?? sec.key,
    lines: [
      sec.demo?.frage && `A: ${sec.demo.frage}`,
      sec.demo?.antwort && `B: ${sec.demo.antwort}`,
      sec.demo?.reaktion && `A: ${sec.demo.reaktion}`,
    ].filter((l): l is string => !!l),
  }));
}

export function MuendlichTeil3Themen() {
  const level = useActiveLevel();
  const { isAdmin } = useAuth();
  const catalog = useMuendlichCatalog(3, level);
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
          .eq("teil", 3).eq("category", "themen").eq("level", level)
          .order("title");
        const rows = ((data ?? []) as any[]).map((r) => ({
          id: r.id, title: r.title, body_text: r.body_text, theme_category: r.theme_category,
          difficulty_level: r.difficulty_level, is_unassigned_center: r.is_unassigned_center, level: r.level,
          redemittelItems: redemittelFromStruktur(r.speaking_toolbox?.struktur ?? null),
        }));
        setTopics(enforceLevel(rows, level));
        setLoading(false);
      })();
    } else {
      setTopics(catalog.items.map((c) => ({
        id: c.id, title: c.title, body_text: c.body_text,
        theme_category: c.theme_category, difficulty_level: c.difficulty_level,
        is_unassigned_center: c.is_unassigned_center,
        redemittelItems: redemittelFromStruktur((c as any).redemittel_data ?? null),
      })));
      setLoading(catalog.loading);
    }
    (async () => {
      const { data } = await supabase
        .from("muendlich_materials")
        .select("title, storage_path, admin_storage_path")
        .eq("teil", 3).eq("category", "redemittel").eq("level", level)
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
