/**
 * Rich Mündlich Teil 2 "speaking toolbox" study view. Replaces the old
 * inert PDF-tile treatment for teil=2 'themen' rows (those rows have no
 * storage_path — VorbereitungMaterials rendered them as disabled buttons
 * that did nothing). Each topic now gets 5 pages: the original text, then
 * content ideas/Redemittel/worked example, personal experience, Vorteile/
 * Nachteile, and topic vocabulary — see migration 20260808010000 for the
 * speaking_toolbox JSON shape.
 *
 * Gating: a plain client-side `.from("muendlich_materials").select()` call,
 * same as the component this replaces — has_plan_access(user_id,'muendlich')
 * RLS on the table itself is the only access-control boundary; a
 * non-subscribed user's query simply returns zero rows. No service-role
 * bypass here.
 *
 * Topics are grouped by theme_category (already populated on every row from
 * earlier imports) into a fixed, hand-ordered study sequence, with the 9
 * owner-specified "not yet introduced in a center" topics forced into their
 * own final section via is_unassigned_center regardless of their
 * theme_category tag.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, ChevronRight, ChevronDown, BookOpen, Lightbulb, MessageCircleHeart,
  Scale, GraduationCap, Sparkles, ThumbsUp, ThumbsDown, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, enforceLevel } from "@/lib/useActiveLevel";

interface IdeaRow { idea: string; verbs: string }
interface SpeakingToolbox {
  page2: {
    explanation: string;
    ideas: IdeaRow[];
    content_redemittel: string[];
    opinion_redemittel: string[];
    worked_example: string;
  };
  page3: { redemittel: string[]; ideas: string[] };
  page4: {
    vorteile: { redemittel: string[]; ideas: IdeaRow[] };
    nachteile: { redemittel: string[]; ideas: IdeaRow[] };
  };
  page5: { verben: string[]; nomen: string[]; adjektive: string[]; expressions: string[] };
}

interface Topic {
  id: string;
  title: string;
  body_text: string | null;
  theme_category: string | null;
  difficulty_level: string | null;
  is_unassigned_center: boolean;
  speaking_toolbox: SpeakingToolbox | null;
  level?: string | null;
}

/** Hand-ordered study sequence — one thematic area at a time, largest/most
 * central groups first, matching the actual content mix in the DB rather
 * than a generic template. The unassigned-center bucket always renders
 * last regardless of this order (handled separately below). */
const GROUP_ORDER = [
  "Gesundheit", "Technologie", "Beruf", "Bildung", "Gesellschaft",
  "Konsum", "Medien", "Familie", "Wohnen", "Finanzen", "Reisen",
];
const UNASSIGNED_GROUP = "Noch in keinem Zentrum eingeführte Themen";

function groupTopics(topics: Topic[]) {
  const assigned = topics.filter((t) => !t.is_unassigned_center);
  const unassigned = topics.filter((t) => t.is_unassigned_center);
  const groups: { name: string; topics: Topic[] }[] = [];
  for (const name of GROUP_ORDER) {
    const inGroup = assigned.filter((t) => (t.theme_category ?? "Sonstiges") === name);
    if (inGroup.length) groups.push({ name, topics: inGroup });
  }
  // Any theme_category not in our hand-ordered list still gets shown, just after the known ones.
  const knownNames = new Set(GROUP_ORDER);
  const leftoverNames = [...new Set(assigned.map((t) => t.theme_category ?? "Sonstiges").filter((n) => !knownNames.has(n)))];
  for (const name of leftoverNames) {
    groups.push({ name, topics: assigned.filter((t) => (t.theme_category ?? "Sonstiges") === name) });
  }
  if (unassigned.length) groups.push({ name: UNASSIGNED_GROUP, topics: unassigned });
  return groups;
}

const PAGES = [
  { key: "text", label: "1. Text", icon: BookOpen },
  { key: "ideas", label: "2. Verstehen & Ideen", icon: Lightbulb },
  { key: "experience", label: "3. Erfahrung", icon: MessageCircleHeart },
  { key: "proscons", label: "4. Vor- & Nachteile", icon: Scale },
  { key: "vocab", label: "5. Wortschatz", icon: GraduationCap },
] as const;
type PageKey = typeof PAGES[number]["key"];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function IdeaList({ items }: { items: IdeaRow[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
          <span className="text-foreground">{it.idea}</span>
          {it.verbs && <span className="text-muted-foreground">→ {it.verbs}</span>}
        </li>
      ))}
    </ul>
  );
}

function TopicDetail({ topic }: { topic: Topic }) {
  const [page, setPage] = useState<PageKey>("text");
  const tb = topic.speaking_toolbox;

  useEffect(() => setPage("text"), [topic.id]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-center gap-2">
          {topic.theme_category && <Pill>{topic.theme_category}</Pill>}
          {topic.difficulty_level && <Pill>{topic.difficulty_level}</Pill>}
        </div>
        <h2 className="mt-2 text-lg font-black text-foreground">{topic.title}</h2>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/30 px-3 py-2">
        {PAGES.map((p) => {
          const Icon = p.icon;
          const disabled = p.key !== "text" && !tb;
          return (
            <button
              key={p.key}
              onClick={() => !disabled && setPage(p.key)}
              disabled={disabled}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                page === p.key ? "bg-rose-500 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Icon className="h-3.5 w-3.5" /> {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {page === "text" && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{topic.body_text}</p>
        )}

        {page === "ideas" && tb && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Worum geht es?</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{tb.page2.explanation}</p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Ideen zum Thema</h3>
              <IdeaList items={tb.page2.ideas} />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Redemittel zum Inhalt</h3>
                <ul className="space-y-1.5 text-sm text-foreground">
                  {tb.page2.content_redemittel.map((r, i) => <li key={i} className="italic">"{r}"</li>)}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Redemittel für die Meinung</h3>
                <ul className="space-y-1.5 text-sm text-foreground">
                  {tb.page2.opinion_redemittel.map((r, i) => <li key={i} className="italic">"{r}"</li>)}
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
              <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-black text-rose-600 dark:text-rose-400">
                <Sparkles className="h-4 w-4" /> Beispiel
              </h3>
              <p className="text-sm leading-relaxed text-foreground">{tb.page2.worked_example}</p>
            </div>
          </div>
        )}

        {page === "experience" && tb && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Redemittel für persönliche Erfahrung</h3>
              <ul className="space-y-1.5 text-sm text-foreground">
                {tb.page3.redemittel.map((r, i) => <li key={i} className="italic">"{r}"</li>)}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Mögliche Erfahrungen zum Thema</h3>
              <ul className="space-y-1.5">
                {tb.page3.ideas.map((idea, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" /> {idea}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {page === "proscons" && tb && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400">
                <ThumbsUp className="h-4 w-4" /> Vorteile
              </h3>
              <ul className="mb-3 space-y-1 text-sm italic text-foreground">
                {tb.page4.vorteile.redemittel.map((r, i) => <li key={i}>"{r}"</li>)}
              </ul>
              <IdeaList items={tb.page4.vorteile.ideas} />
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-red-600 dark:text-red-400">
                <ThumbsDown className="h-4 w-4" /> Nachteile
              </h3>
              <ul className="mb-3 space-y-1 text-sm italic text-foreground">
                {tb.page4.nachteile.redemittel.map((r, i) => <li key={i}>"{r}"</li>)}
              </ul>
              <IdeaList items={tb.page4.nachteile.ideas} />
            </div>
          </div>
        )}

        {page === "vocab" && tb && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Verben</h3>
              <div className="flex flex-wrap gap-1.5">{tb.page5.verben.map((w, i) => <Pill key={i}>{w}</Pill>)}</div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Nomen</h3>
              <div className="flex flex-wrap gap-1.5">{tb.page5.nomen.map((w, i) => <Pill key={i}>{w}</Pill>)}</div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Adjektive</h3>
              <div className="flex flex-wrap gap-1.5">{tb.page5.adjektive.map((w, i) => <Pill key={i}>{w}</Pill>)}</div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Nützliche Ausdrücke</h3>
              <div className="flex flex-wrap gap-1.5">{tb.page5.expressions.map((w, i) => <Pill key={i}>{w}</Pill>)}</div>
            </div>
          </div>
        )}

        {page !== "text" && !tb && (
          <p className="text-sm text-muted-foreground">Weitere Seiten für dieses Thema folgen in Kürze.</p>
        )}
      </div>
    </div>
  );
}

export function MuendlichTeil2Themen() {
  const level = useActiveLevel();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!level) return;
    (async () => {
      const { data } = await supabase
        .from("muendlich_materials")
        .select("id, title, body_text, theme_category, difficulty_level, is_unassigned_center, speaking_toolbox, level")
        .eq("teil", 2).eq("category", "themen").eq("level", level)
        .order("title");
      setTopics(enforceLevel((data ?? []) as Topic[], level));
      setLoading(false);
    })();
  }, [level]);

  const groups = useMemo(() => groupTopics(topics), [topics]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (!topics.length) return <p className="py-10 text-center text-sm text-muted-foreground">No topics available yet.</p>;

  const list = (
    <div className="space-y-1 overflow-y-auto">
      {groups.map((g) => {
        const isCollapsed = collapsed[g.name];
        return (
          <div key={g.name}>
            <button
              onClick={() => setCollapsed((c) => ({ ...c, [g.name]: !c[g.name] }))}
              className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-black uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {g.name} <span className="ml-auto font-normal normal-case">{g.topics.length}</span>
            </button>
            {!isCollapsed && g.topics.map((t) => (
              <button
                key={t.id}
                onClick={() => { setSelected(t); setMobileOpen(true); }}
                className={`block w-full truncate rounded-lg px-4 py-2 text-left text-sm transition-colors ${
                  selected?.id === t.id ? "bg-rose-500/10 font-semibold text-rose-600 dark:text-rose-400" : "text-foreground hover:bg-muted"
                }`}
              >
                {t.title}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-[70vh] min-h-[500px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="hidden w-72 shrink-0 border-r border-border py-3 sm:flex sm:flex-col">{list}</div>

      <div className="flex-1 overflow-hidden">
        {selected ? (
          <TopicDetail topic={selected} />
        ) : (
          <div className="hidden h-full flex-col items-center justify-center gap-2 p-8 text-center sm:flex">
            <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Wählen Sie links ein Thema aus.</p>
          </div>
        )}
        {/* Mobile: topic list is the default view; selecting a topic overlays the detail */}
        <div className="flex h-full flex-col p-3 sm:hidden">{!mobileOpen && list}</div>
      </div>

      {mobileOpen && selected && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background sm:hidden">
          <button onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 border-b border-border p-3 text-sm font-semibold text-muted-foreground">
            <X className="h-4 w-4" /> Zurück zur Liste
          </button>
          <div className="flex-1 overflow-hidden"><TopicDetail topic={selected} /></div>
        </div>
      )}
    </div>
  );
}
