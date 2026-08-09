/**
 * Rich Mündlich Teil 3 "gemeinsam etwas planen" study view — 7-page structure
 * (schema_version 1): Aufgabe / Erklärung & Struktur / Redemittel /
 * Diskussionsideen / Tipps / Beispieldialog / Wortschatz. German-only (no
 * Arabic translation layer, unlike Teil 2) per the source spec. Struktur and
 * Redemittel/Tipps come from the shared group template
 * (scripts/teil3-group-templates.mjs, duplicated here deliberately — same
 * sync convention already used for Teil 2's GROUP_ORDER) rather than being
 * stored per-topic, since they're genuinely reusable within a topic family;
 * Erklärung, Diskussionsideen, Beispieldialog and Wortschatz are topic-specific.
 *
 * Gating: plain client-side `.from("muendlich_materials").select()`, same
 * pattern as Teil 2 — RLS on the table is the only access-control boundary.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, ChevronRight, ChevronDown, FileText, ClipboardList, Lightbulb,
  MessageSquareText, Sparkles, MessagesSquare, GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, enforceLevel } from "@/lib/useActiveLevel";
import { PdfViewer } from "./PdfViewer";

interface DialogLine { speaker: "A" | "B"; text: string }
interface Erklaerung { worum_geht_es: string; was_wird_erwartet: string; wichtige_punkte: string[]; worauf_achten: string[] }
interface Wortschatz { verben: string[]; woerter: string[]; adjektive: string[] }

interface SpeakingToolboxT3 {
  schema_version: 1;
  erklaerung: Erklaerung;
  diskussionsideen: string[];
  beispieldialog: DialogLine[];
  wortschatz: Wortschatz;
}

interface Topic {
  id: string;
  title: string;
  body_text: string | null;
  theme_category: string | null;
  difficulty_level: string | null;
  speaking_toolbox: SpeakingToolboxT3 | { schema_version?: number } | null;
  level?: string | null;
}

// ── same GROUP_ORDER as scripts/teil3-group-templates.mjs, kept in sync deliberately ──
const GROUP_ORDER = [
  "Freizeit", "Bildung", "Gesellschaft", "Reisen", "Familie",
  "Beruf", "Gesundheit", "Technologie", "Soziales Engagement", "Medien",
];

// ── same universal STRUKTUR as scripts/teil3-group-templates.mjs ──
const STRUKTUR: { schritt: string; beschreibung: string }[] = [
  { schritt: "1. Begrüßung & Einstieg", beschreibung: "Kurz das Thema benennen und den Gesprächspartner miteinbeziehen." },
  { schritt: "2. Ideen sammeln", beschreibung: "Beide Seiten bringen erste Vorschläge und Ideen ein, ohne sie sofort zu bewerten." },
  { schritt: "3. Vor- und Nachteile abwägen", beschreibung: "Die gesammelten Ideen gemeinsam durchsprechen: Was spricht dafür, was dagegen?" },
  { schritt: "4. Auf Details einigen", beschreibung: "Konkrete Punkte klären (Zeit, Ort, Kosten, Organisation, Aufgabenverteilung)." },
  { schritt: "5. Gemeinsame Entscheidung treffen", beschreibung: "Sich auf eine gemeinsame Lösung einigen, auch bei unterschiedlichen Meinungen." },
  { schritt: "6. Zusammenfassung & Abschluss", beschreibung: "Das Ergebnis kurz zusammenfassen und das Gespräch höflich beenden." },
];

// ── same base Redemittel as scripts/teil3-group-templates.mjs (group-specific
// additions live only in the compiled PDF; the UI shows the shared base set) ──
const REDEMITTEL: { label: string; items: string[] }[] = [
  { label: "Einstieg", items: ["Also, wir sollen ja gemeinsam … planen. Wo fangen wir an?", "Schön, dass wir das zusammen besprechen können. Hast du schon eine erste Idee?", "Fangen wir doch damit an, dass wir überlegen, was uns wichtig ist."] },
  { label: "Idee einbringen", items: ["Ich hätte da eine Idee: Wir könnten …", "Mir würde spontan einfallen, dass wir …", "Was hältst du davon, wenn wir …"] },
  { label: "Vorschlag machen", items: ["Ich schlage vor, dass wir …", "Wie wäre es, wenn wir …", "Ich würde vorschlagen, zuerst … zu klären."] },
  { label: "Meinung erfragen", items: ["Was denkst du darüber?", "Wie siehst du das?", "Bist du damit einverstanden, oder hättest du einen anderen Vorschlag?"] },
  { label: "Zustimmen", items: ["Da stimme ich dir voll und ganz zu.", "Das ist ein guter Punkt, das sehe ich genauso.", "Einverstanden, das klingt vernünftig."] },
  { label: "Höflich widersprechen", items: ["Das verstehe ich, aber ich sehe das etwas anders.", "Da bin ich mir nicht so sicher, denn …", "Ich hätte da Bedenken, weil …"] },
  { label: "Begründen", items: ["Das schlage ich vor, weil …", "Der Grund dafür ist, dass …", "Das wäre sinnvoll, denn …"] },
  { label: "Vergleichen", items: ["Im Vergleich zu … finde ich … besser, weil …", "Auf der einen Seite …, auf der anderen Seite …", "Beide Möglichkeiten haben Vor- und Nachteile, aber …"] },
  { label: "Vor- & Nachteile nennen", items: ["Ein Vorteil davon wäre, dass …", "Ein Nachteil könnte allerdings sein, dass …", "Man muss auch bedenken, dass …"] },
  { label: "Reagieren", items: ["Das ist ein interessanter Punkt, daran habe ich noch gar nicht gedacht.", "Gute Idee, das könnten wir wirklich so machen.", "Hm, verstehe, aber wie stellst du dir das genau vor?"] },
  { label: "Themenwechsel", items: ["Gut, dann wären wir uns da einig. Kommen wir zum nächsten Punkt.", "Lass uns jetzt noch über … sprechen.", "Ein weiterer wichtiger Punkt wäre …"] },
  { label: "Entscheidung treffen", items: ["Dann einigen wir uns also darauf, dass …", "Ich denke, wir sind uns einig: Wir machen es so, dass …", "Fassen wir zusammen: Wir entscheiden uns für …"] },
  { label: "Abschluss", items: ["Ich finde, wir haben einen guten Plan zusammengestellt.", "Dann halten wir das so fest. Vielen Dank für die gute Zusammenarbeit.", "Ich denke, damit haben wir alles Wichtige besprochen."] },
];

const TIPPS: string[] = [
  "Beginnen Sie aktiv mit einem eigenen Vorschlag — warten Sie nicht nur ab.",
  "Stellen Sie Ihrem Partner / Ihrer Partnerin echte Fragen und hören Sie aktiv zu.",
  "Wenn Sie unsicher sind, sagen Sie das offen: „Ich bin mir nicht sicher, aber vielleicht …“",
  "Widersprechen Sie höflich, nicht abweisend — bestätigen Sie erst, was gut ist, bevor Sie Einwände nennen.",
  "Nutzen Sie Themenwechsel-Redemittel, um strukturiert von einem Punkt zum nächsten zu kommen.",
  "Achten Sie darauf, wirklich zu einer gemeinsamen Entscheidung zu kommen — das wird explizit bewertet.",
  "Vermeiden Sie lange Monologe; ein Gespräch lebt vom Hin und Her.",
];

function groupTopics(topics: Topic[]) {
  const groups: { name: string; topics: Topic[] }[] = [];
  for (const name of GROUP_ORDER) {
    const inGroup = topics.filter((t) => (t.theme_category ?? "Sonstiges") === name);
    if (inGroup.length) groups.push({ name, topics: inGroup });
  }
  const known = new Set(GROUP_ORDER);
  const leftover = [...new Set(topics.map((t) => t.theme_category ?? "Sonstiges").filter((n) => !known.has(n)))];
  for (const name of leftover) groups.push({ name, topics: topics.filter((t) => (t.theme_category ?? "Sonstiges") === name) });
  return groups;
}

const PAGES = [
  { key: "aufgabe", label: "1. Aufgabe", icon: FileText },
  { key: "erklaerung", label: "2. Erklärung", icon: ClipboardList },
  { key: "redemittel", label: "3. Redemittel", icon: MessageSquareText },
  { key: "ideen", label: "4. Ideen", icon: Lightbulb },
  { key: "tipps", label: "5. Tipps", icon: Sparkles },
  { key: "dialog", label: "6. Dialog", icon: MessagesSquare },
  { key: "wortschatz", label: "7. Wortschatz", icon: GraduationCap },
] as const;
type PageKey = typeof PAGES[number]["key"];

function isReady(tb: Topic["speaking_toolbox"]): tb is SpeakingToolboxT3 {
  return !!tb && (tb as any).schema_version === 1;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  );
}

function PlainList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-500" />
          <span className="text-foreground">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function TopicDetail({ topic, onOpenPdf, pdfAvailable }: { topic: Topic; onOpenPdf: () => void; pdfAvailable: boolean }) {
  const [page, setPage] = useState<PageKey>("aufgabe");
  const tb = isReady(topic.speaking_toolbox) ? topic.speaking_toolbox : null;

  useEffect(() => { setPage("aufgabe"); }, [topic.id]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-center gap-2">
          {topic.theme_category && <Pill>{topic.theme_category}</Pill>}
          {topic.difficulty_level && <Pill>{topic.difficulty_level}</Pill>}
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black text-foreground">{topic.title}</h2>
          <button
            onClick={onOpenPdf}
            disabled={!pdfAvailable}
            title={pdfAvailable ? "Gesamtes PDF-Buch öffnen (alle Themen)" : "PDF-Buch noch nicht verfügbar"}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/30 px-3 py-2">
        {PAGES.map((p) => {
          const Icon = p.icon;
          const disabled = p.key !== "aufgabe" && !tb;
          return (
            <button
              key={p.key}
              onClick={() => !disabled && setPage(p.key)}
              disabled={disabled}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                page === p.key ? "bg-sky-600 text-white" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Icon className="h-3.5 w-3.5" /> {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {page === "aufgabe" && (
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{topic.body_text}</p>
        )}

        {page === "erklaerung" && tb && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Worum geht es?</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{tb.erklaerung.worum_geht_es}</p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Was wird erwartet?</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{tb.erklaerung.was_wird_erwartet}</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Wichtige Punkte</h3>
                <PlainList items={tb.erklaerung.wichtige_punkte} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Worauf achten?</h3>
                <PlainList items={tb.erklaerung.worauf_achten} />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Struktur für das Gespräch</h3>
              <ol className="space-y-2">
                {STRUKTUR.map((s, i) => (
                  <li key={i} className="text-sm text-foreground">
                    <span className="font-bold">{s.schritt}</span>{" "}
                    <span className="text-muted-foreground">— {s.beschreibung}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {page === "redemittel" && tb && (
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {REDEMITTEL.map((cat) => (
              <div key={cat.label}>
                <h3 className="mb-1.5 text-sm font-black text-sky-600 dark:text-sky-400">{cat.label}</h3>
                <ul className="space-y-1">
                  {cat.items.map((r, i) => (
                    <li key={i} className="text-sm italic text-muted-foreground">„{r}“</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {page === "ideen" && tb && <PlainList items={tb.diskussionsideen} />}

        {page === "tipps" && tb && <PlainList items={TIPPS} />}

        {page === "dialog" && tb && (
          <div className="space-y-2.5">
            {tb.beispieldialog.map((l, i) => (
              <p key={i} className="text-sm leading-relaxed">
                <span className={`font-black ${l.speaker === "A" ? "text-sky-600 dark:text-sky-400" : "text-rose-600 dark:text-rose-400"}`}>{l.speaker}:</span>{" "}
                <span className="text-foreground">{l.text}</span>
              </p>
            ))}
          </div>
        )}

        {page === "wortschatz" && tb && (
          <div className="grid gap-6 sm:grid-cols-3">
            {([
              ["Wichtige Verben", tb.wortschatz.verben],
              ["Wichtige Wörter", tb.wortschatz.woerter],
              ["Wichtige Adjektive", tb.wortschatz.adjektive],
            ] as [string, string[]][]).map(([label, items]) => (
              <div key={label}>
                <h3 className="mb-2 text-sm font-black text-foreground">{label}</h3>
                <ul className="space-y-1.5">
                  {items.map((it, i) => (
                    <li key={i} className="text-sm font-medium text-foreground">{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {page !== "aufgabe" && !tb && (
          <p className="text-sm text-muted-foreground">Weitere Seiten für dieses Thema folgen in Kürze.</p>
        )}
      </div>
    </div>
  );
}

export function MuendlichTeil3Themen() {
  const level = useActiveLevel();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Topic | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [book, setBook] = useState<{ storage_path: string; title: string } | null>(null);

  useEffect(() => {
    if (!level) return;
    (async () => {
      const { data } = await supabase
        .from("muendlich_materials")
        .select("id, title, body_text, theme_category, difficulty_level, speaking_toolbox, level")
        .eq("teil", 3).eq("category", "themen").eq("level", level)
        .order("title");
      setTopics(enforceLevel((data ?? []) as Topic[], level));
      setLoading(false);
    })();
    (async () => {
      const { data } = await supabase
        .from("muendlich_materials")
        .select("title, storage_path")
        .eq("teil", 3).eq("category", "redemittel").eq("level", level)
        .not("storage_path", "is", null)
        .maybeSingle();
      if (data?.storage_path) setBook({ storage_path: data.storage_path, title: data.title });
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
                  selected?.id === t.id ? "bg-sky-500/10 font-semibold text-sky-600 dark:text-sky-400" : "text-foreground hover:bg-muted"
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm" style={{ height: "min(720px, 78vh)" }}>
      <div className="hidden h-full sm:grid sm:grid-cols-[280px_1fr]">
        <div className="border-r border-border p-3">{list}</div>
        <div className="overflow-hidden">
          {selected ? (
            <TopicDetail topic={selected} onOpenPdf={() => setPdfOpen(true)} pdfAvailable={!!book} />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
              Wählen Sie links ein Thema aus, um Erklärung, Struktur, Redemittel, Diskussionsideen, Tipps, einen Beispieldialog und Wortschatz zu sehen.
            </div>
          )}
        </div>
      </div>

      <div className="flex h-full flex-col p-3 sm:hidden">{!mobileOpen && list}</div>

      {mobileOpen && selected && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background sm:hidden">
          <button onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 border-b border-border p-3 text-sm font-semibold text-muted-foreground">
            <ChevronRight className="h-4 w-4 rotate-180" /> Zurück zur Liste
          </button>
          <div className="flex-1 overflow-hidden"><TopicDetail topic={selected} onOpenPdf={() => setPdfOpen(true)} pdfAvailable={!!book} /></div>
        </div>
      )}

      {pdfOpen && book && (
        <PdfViewer storagePath={book.storage_path} title={book.title} onClose={() => setPdfOpen(false)} />
      )}
    </div>
  );
}
