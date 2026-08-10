/**
 * Rich Mündlich Teil 2 "speaking toolbox" study view — 7-page structure
 * (schema_version 2): Text / Inhalt & Thema-Extraktion / Meinung / Erfahrung
 * & Heimatland / Vor- & Nachteile / Prüfungsfragen / Wortschatz. See
 * migration 20260808010000 + 20260808120000 for the speaking_toolbox JSON
 * shape. Bilingual (DE/AR) fields are gated behind a single translation
 * toggle; the Arabic Inhalt-explanation on page 2 is original explanatory
 * content (not a "translation") and is always visible. Sample paragraphs
 * mark connector phrases with **double asterisks**, rendered as highlighted
 * <mark> spans by renderMarked() below.
 *
 * Gating: a plain client-side `.from("muendlich_materials").select()` call,
 * same as before — has_plan_access(user_id,'muendlich') RLS on the table
 * itself is the only access-control boundary; a non-subscribed user's query
 * simply returns zero rows. No service-role bypass here.
 *
 * Topics are grouped by theme_category into a fixed, hand-ordered study
 * sequence, with the 9 owner-specified "not yet introduced in a center"
 * topics forced into their own final section via is_unassigned_center.
 *
 * Rows carrying the old (schema_version 1 / absent) toolbox shape are shown
 * with only Page 1 enabled and a "coming soon" notice on the rest, exactly
 * like a topic with no toolbox at all — this lets the 7-page rollout happen
 * topic-by-topic without breaking older rows.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, ChevronRight, ChevronDown, BookOpen, Lightbulb, MessageCircle, MessageCircleHeart,
  Scale, HelpCircle, GraduationCap, Sparkles, ThumbsUp, ThumbsDown, X, Languages, FileText, Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, enforceLevel } from "@/lib/useActiveLevel";
import { useAuth } from "@/lib/auth";
import { useHasPlanAccess, useMuendlichCatalog } from "@/lib/useContentAccess";
import { PaywallModal } from "@/components/PaywallModal";
import { PdfViewer } from "./PdfViewer";

interface Bilingual { de: string; ar: string }
interface ExampleBlock { text: string; ar: string; label?: string }
interface QAItem { q_de: string; q_ar?: string; answer_ideas: string[] }
interface VocabItem { de: string; ar: string }

interface SpeakingToolboxV2 {
  schema_version: 2;
  page2_inhalt: {
    ar_summary: string;
    extraction_guide_ar: string;
    inhalt_de: string;
    inhalt_redemittel: Bilingual[];
    /** Full, ready-to-speak German sentences (not abstract headings), each with an Arabic translation. */
    ideas: Bilingual[];
  };
  page3_meinung: { redemittel: Bilingual[]; ideas: Bilingual[]; example: ExampleBlock };
  page4_erfahrung: {
    experience_redemittel: Bilingual[];
    heimatland_redemittel: Bilingual[];
    experience_ideas: Bilingual[];
    heimatland_ideas: Bilingual[];
    example: ExampleBlock;
  };
  page5_procontra: {
    vorteile: { redemittel: Bilingual[]; ideas: Bilingual[] };
    nachteile: { redemittel: Bilingual[]; ideas: Bilingual[] };
    example: ExampleBlock;
  };
  page6_fragen: { questions: QAItem[] };
  page7_wortschatz: { verben: VocabItem[]; nomen: VocabItem[]; adjektive: VocabItem[]; expressions: VocabItem[] };
}

interface Topic {
  id: string;
  title: string;
  body_text: string | null;
  theme_category: string | null;
  difficulty_level: string | null;
  is_unassigned_center: boolean;
  speaking_toolbox: SpeakingToolboxV2 | { schema_version?: number } | null;
  level?: string | null;
}

/** Hand-ordered study sequence — one thematic area at a time, largest/most
 * central groups first, matching the actual content mix in the DB rather
 * than a generic template. Topics with is_unassigned_center are filtered
 * out before this runs (see the fetch effect below) — they stay in the PDF
 * appendix but never reach the student-facing dashboard. */
const GROUP_ORDER = [
  "Gesundheit", "Technologie", "Beruf", "Bildung", "Gesellschaft",
  "Konsum", "Medien", "Familie", "Wohnen", "Finanzen", "Reisen",
];

function groupTopics(topics: Topic[]) {
  const groups: { name: string; topics: Topic[] }[] = [];
  for (const name of GROUP_ORDER) {
    const inGroup = topics.filter((t) => (t.theme_category ?? "Sonstiges") === name);
    if (inGroup.length) groups.push({ name, topics: inGroup });
  }
  const knownNames = new Set(GROUP_ORDER);
  const leftoverNames = [...new Set(topics.map((t) => t.theme_category ?? "Sonstiges").filter((n) => !knownNames.has(n)))];
  for (const name of leftoverNames) {
    groups.push({ name, topics: topics.filter((t) => (t.theme_category ?? "Sonstiges") === name) });
  }
  return groups;
}

const PAGES = [
  { key: "text", label: "1. Text", icon: BookOpen },
  { key: "inhalt", label: "2. Inhalt", icon: Lightbulb },
  { key: "meinung", label: "3. Meinung", icon: MessageCircle },
  { key: "erfahrung", label: "4. Erfahrung", icon: MessageCircleHeart },
  { key: "procontra", label: "5. Vor-/Nachteile", icon: Scale },
  { key: "fragen", label: "6. Prüfungsfragen", icon: HelpCircle },
  { key: "wortschatz", label: "7. Wortschatz", icon: GraduationCap },
] as const;
type PageKey = typeof PAGES[number]["key"];

function isV2(tb: Topic["speaking_toolbox"]): tb is SpeakingToolboxV2 {
  return !!tb && (tb as any).schema_version === 2;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

/** Renders `**phrase**` segments as highlighted connector/Redemittel spans. */
function renderMarked(text: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-rose-500/15 px-1 py-0.5 font-bold text-rose-600 dark:text-rose-400">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function ArBlock({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p dir="rtl" className={`text-right text-sm leading-loose text-muted-foreground ${className}`} style={{ fontFamily: "Tahoma, 'Segoe UI', sans-serif" }}>
      {text}
    </p>
  );
}

/** Full, ready-to-speak German sentences (bullet + sentence + toggle-gated
 * Arabic translation) — replaces the old abstract "idea → trigger verbs"
 * format everywhere a student should be able to just say the sentence. */
function SentenceList({ items, showAr }: { items: Bilingual[]; showAr: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
          <div className="flex-1">
            <span className="text-foreground">{it.de}</span>
            {showAr && <ArBlock text={it.ar} className="mt-1" />}
          </div>
        </li>
      ))}
    </ul>
  );
}

function RedemittelList({ items, showAr }: { items: Bilingual[]; showAr: boolean }) {
  return (
    <ul className="space-y-2 text-sm text-foreground">
      {items.map((r, i) => (
        <li key={i}>
          <p className="italic">"{r.de}"</p>
          {showAr && <ArBlock text={r.ar} className="mt-0.5" />}
        </li>
      ))}
    </ul>
  );
}

function ExampleCallout({ example, showAr }: { example: ExampleBlock; showAr: boolean }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-black text-rose-600 dark:text-rose-400">
        <Sparkles className="h-4 w-4" /> {example.label ?? "Beispiel"}
      </h3>
      <p className="text-sm leading-relaxed text-foreground">{renderMarked(example.text)}</p>
      {showAr && <ArBlock text={example.ar} className="mt-2 border-t border-rose-500/20 pt-2" />}
    </div>
  );
}

function TopicDetail({ topic, onOpenPdf, pdfAvailable }: { topic: Topic; onOpenPdf: () => void; pdfAvailable: boolean }) {
  const [page, setPage] = useState<PageKey>("text");
  const [showAr, setShowAr] = useState(false);
  const tb = isV2(topic.speaking_toolbox) ? topic.speaking_toolbox : null;

  useEffect(() => { setPage("text"); }, [topic.id]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-center gap-2">
          {topic.theme_category && <Pill>{topic.theme_category}</Pill>}
          {topic.difficulty_level && <Pill>{topic.difficulty_level}</Pill>}
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-foreground">{topic.title}</h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => setShowAr((v) => !v)}
              title="Arabische Übersetzung ein-/ausblenden"
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors ${
                showAr ? "border-indigo-500 bg-indigo-500 text-white" : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Languages className="h-3.5 w-3.5" /> عربي
            </button>
            <button
              onClick={onOpenPdf}
              disabled={!pdfAvailable}
              title={pdfAvailable ? "Gesamtes PDF-Buch öffnen (alle Themen)" : "PDF-Buch noch nicht verfügbar"}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        </div>
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

        {page === "inhalt" && tb && (
          <div className="space-y-6">
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
              <h3 className="mb-2 text-right text-sm font-black text-indigo-600 dark:text-indigo-400">الشرح والملخص</h3>
              <ArBlock text={tb.page2_inhalt.ar_summary} />
            </div>
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
              <h3 className="mb-2 text-right text-sm font-black text-indigo-600 dark:text-indigo-400">كيف نستخرج موضوع النص</h3>
              <ArBlock text={tb.page2_inhalt.extraction_guide_ar} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Inhalt (Zusammenfassung)</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{tb.page2_inhalt.inhalt_de}</p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Redemittel für den Inhalt</h3>
              <RedemittelList items={tb.page2_inhalt.inhalt_redemittel} showAr={showAr} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Ideen zum Text</h3>
              <SentenceList items={tb.page2_inhalt.ideas} showAr={showAr} />
            </div>
          </div>
        )}

        {page === "meinung" && tb && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Redemittel für die Meinung</h3>
              <RedemittelList items={tb.page3_meinung.redemittel} showAr={showAr} />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Ideen zur Meinung</h3>
              <SentenceList items={tb.page3_meinung.ideas} showAr={showAr} />
            </div>
            <ExampleCallout example={tb.page3_meinung.example} showAr={showAr} />
          </div>
        )}

        {page === "erfahrung" && tb && (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Persönliche Erfahrung</h3>
                <RedemittelList items={tb.page4_erfahrung.experience_redemittel} showAr={showAr} />
                <div className="mt-3"><SentenceList items={tb.page4_erfahrung.experience_ideas} showAr={showAr} /></div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Mein Heimatland (Tunesien)</h3>
                <RedemittelList items={tb.page4_erfahrung.heimatland_redemittel} showAr={showAr} />
                <div className="mt-3"><SentenceList items={tb.page4_erfahrung.heimatland_ideas} showAr={showAr} /></div>
              </div>
            </div>
            <ExampleCallout example={tb.page4_erfahrung.example} showAr={showAr} />
          </div>
        )}

        {page === "procontra" && tb && (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400">
                  <ThumbsUp className="h-4 w-4" /> Vorteile
                </h3>
                <div className="mb-3"><RedemittelList items={tb.page5_procontra.vorteile.redemittel} showAr={showAr} /></div>
                <SentenceList items={tb.page5_procontra.vorteile.ideas} showAr={showAr} />
              </div>
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-red-600 dark:text-red-400">
                  <ThumbsDown className="h-4 w-4" /> Nachteile
                </h3>
                <div className="mb-3"><RedemittelList items={tb.page5_procontra.nachteile.redemittel} showAr={showAr} /></div>
                <SentenceList items={tb.page5_procontra.nachteile.ideas} showAr={showAr} />
              </div>
            </div>
            <ExampleCallout example={tb.page5_procontra.example} showAr={showAr} />
          </div>
        )}

        {page === "fragen" && tb && (
          <div className="space-y-4">
            {tb.page6_fragen.questions.map((q, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-bold text-foreground">{i + 1}. {q.q_de}</p>
                {showAr && q.q_ar && <ArBlock text={q.q_ar} className="mt-1" />}
                <ul className="mt-2 space-y-1">
                  {q.answer_ideas.map((a, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {page === "wortschatz" && tb && (
          <div className="grid gap-6 sm:grid-cols-2">
            {([
              ["Verben", tb.page7_wortschatz.verben],
              ["Nomen", tb.page7_wortschatz.nomen],
              ["Adjektive", tb.page7_wortschatz.adjektive],
              ["Nützliche Ausdrücke", tb.page7_wortschatz.expressions],
            ] as [string, VocabItem[]][]).map(([label, items]) => (
              <div key={label}>
                <h3 className="mb-2 text-sm font-black text-foreground">{label}</h3>
                <ul className="space-y-1.5">
                  {items.map((it, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-medium text-foreground">{it.de}</span>
                      {showAr && <span dir="rtl" className="text-muted-foreground" style={{ fontFamily: "Tahoma, 'Segoe UI', sans-serif" }}>({it.ar})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
  const { isAdmin } = useAuth();
  const { hasAccess } = useHasPlanAccess("muendlich");
  const catalog = useMuendlichCatalog(2, level);
  // Admins always see full content regardless of their own subscription state
  // (dev-preview bypass, unchanged from before) — only a real non-admin
  // without an active plan gets the titles-only locked preview.
  const locked = !isAdmin && hasAccess !== true;
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  /** One shared "Meisterbuch" PDF (all topics compiled into one book, same
   * pattern as Teil 1) rather than a PDF per topic — fetched once here and
   * reused by every topic's "PDF" button. */
  const [book, setBook] = useState<{ storage_path: string; title: string } | null>(null);

  useEffect(() => {
    if (!level || hasAccess === null) return;
    if (locked) {
      // Non-subscriber preview: titles + categories only (no body_text, no
      // speaking_toolbox, no PDF) via the SECURITY DEFINER catalog RPC —
      // clicking a topic opens the paywall instead of the real content.
      setTopics(catalog.items.map((c) => ({
        id: c.id, title: c.title, body_text: null,
        theme_category: c.theme_category, difficulty_level: c.difficulty_level,
        is_unassigned_center: false, speaking_toolbox: null, level,
      })));
      setLoading(catalog.loading);
      setBook(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("muendlich_materials")
        .select("id, title, body_text, theme_category, difficulty_level, is_unassigned_center, speaking_toolbox, level")
        .eq("teil", 2).eq("category", "themen").eq("level", level)
        .order("title");
      // Topics not yet introduced in any physical exam center are excluded from the
      // student-facing dashboard entirely (they remain in the admin-only PDF appendix
      // instead). Admins see everything, matching their PDF (see the book-fetch effect below).
      const rows = (data ?? []) as Topic[];
      const visible = isAdmin ? rows : rows.filter((t) => !t.is_unassigned_center);
      setTopics(enforceLevel(visible, level));
      setLoading(false);
    })();
    (async () => {
      const { data } = await supabase
        .from("muendlich_materials")
        .select("title, storage_path, admin_storage_path")
        .eq("teil", 2).eq("category", "redemittel").eq("level", level)
        .not("storage_path", "is", null)
        .maybeSingle();
      const path = isAdmin && data?.admin_storage_path ? data.admin_storage_path : data?.storage_path;
      if (path) setBook({ storage_path: path, title: data!.title });
    })();
  }, [level, isAdmin, hasAccess, locked, catalog.items, catalog.loading]);

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
                onClick={() => {
                  if (locked) { setPaywallOpen(true); return; }
                  setSelected(t); setMobileOpen(true);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left text-sm transition-colors ${
                  selected?.id === t.id ? "bg-rose-500/10 font-semibold text-rose-600 dark:text-rose-400" : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="truncate">{t.title}</span>
                {locked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                {isAdmin && t.is_unassigned_center && (
                  <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Nicht eingeführt
                  </span>
                )}
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
          <TopicDetail topic={selected} onOpenPdf={() => setPdfOpen(true)} pdfAvailable={!!book} />
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
          <div className="flex-1 overflow-hidden"><TopicDetail topic={selected} onOpenPdf={() => setPdfOpen(true)} pdfAvailable={!!book} /></div>
        </div>
      )}

      {pdfOpen && book && (
        <PdfViewer storagePath={book.storage_path} title={book.title} onClose={() => setPdfOpen(false)} />
      )}

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
