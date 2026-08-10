/**
 * Mündlich Teil 3 main view — dual-display layout (owner decision
 * 2026-08-10): a large protected/animated PDF showcase (the real exam-prep
 * content: Erklärung, Struktur, Beispieldialog, Wortschatz, Arabic
 * explanations) plus a grid of plain-text-only topic cards (just the raw
 * scenario prompt, safe to show everyone). The interactive tabbed detail
 * view this page used earlier this session is retired — everything beyond
 * the plain scenario text now lives exclusively in the protected PDF, so
 * casual scraping of the native page yields no exam-answer content.
 *
 * Admins get the full table read (including is_unassigned_center topics,
 * badged) same as before; everyone else — subscriber or not — gets the
 * titles+category+body_text-only catalog RPC, since body_text alone carries
 * no exam value (see get_muendlich_catalog's migration comment).
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, enforceLevel } from "@/lib/useActiveLevel";
import { useAuth } from "@/lib/auth";
import { useMuendlichCatalog } from "@/lib/useContentAccess";
import { PaywallModal } from "@/components/PaywallModal";
import { ProtectedPdfShowcase, TopicTextCard, type DualDisplayTopic, type MuendlichBook } from "./MuendlichDualDisplay";

const GROUP_ORDER = [
  "Freizeit", "Bildung", "Gesellschaft", "Reisen", "Familie",
  "Beruf", "Gesundheit", "Technologie", "Soziales Engagement", "Medien",
];

function groupTopics(topics: DualDisplayTopic[]) {
  const groups: { name: string; topics: DualDisplayTopic[] }[] = [];
  for (const name of GROUP_ORDER) {
    const inGroup = topics.filter((t) => (t.theme_category ?? "Sonstiges") === name);
    if (inGroup.length) groups.push({ name, topics: inGroup });
  }
  const known = new Set(GROUP_ORDER);
  const leftover = [...new Set(topics.map((t) => t.theme_category ?? "Sonstiges").filter((n) => !known.has(n)))];
  for (const name of leftover) groups.push({ name, topics: topics.filter((t) => (t.theme_category ?? "Sonstiges") === name) });
  return groups;
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
          .select("id, title, body_text, theme_category, difficulty_level, is_unassigned_center, level")
          .eq("teil", 3).eq("category", "themen").eq("level", level)
          .order("title");
        setTopics(enforceLevel((data ?? []) as DualDisplayTopic[], level));
        setLoading(false);
      })();
    } else {
      setTopics(catalog.items.map((c) => ({
        id: c.id, title: c.title, body_text: c.body_text,
        theme_category: c.theme_category, difficulty_level: c.difficulty_level,
        is_unassigned_center: false,
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

  const groups = useMemo(() => groupTopics(topics), [topics]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (!topics.length) return <p className="py-10 text-center text-sm text-muted-foreground">No topics available yet.</p>;

  return (
    <div className="space-y-8">
      <ProtectedPdfShowcase book={book} onUnlock={() => setPaywallOpen(true)} />

      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g.name}>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
              {g.name} <span className="font-normal normal-case text-muted-foreground/70">({g.topics.length})</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.topics.map((t, i) => <TopicTextCard key={t.id} topic={t} index={i} isAdmin={isAdmin} />)}
            </div>
          </div>
        ))}
      </div>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
