/**
 * Rich Mündlich Teil 3 "gemeinsam etwas planen" study view — schema_version 2
 * (section-based Q&A structure modeled directly on the owner's reference
 * example): Aufgabe / Erklärung / Struktur & Redemittel (per-section
 * Frage+Antwort phrases with a topic demo exchange, e.g. 🟢 Start, 🎯 Ziel,
 * ⏰ Zeit, 📍 Ort, ...) / Mögliche Fragen / Mögliche Antworten / Beispieldialog
 * (with emoji section headers) / Wortschatz. German-only (no Arabic layer).
 *
 * The category Redemittel (Frage/Antwort per section key) live in
 * REDEMITTEL_LIBRARY, duplicated from scripts/teil3-redemittel-library.mjs
 * (same sync convention as Teil 2's GROUP_ORDER) since they're genuinely
 * reusable across topics — each topic just picks an ordered subset of keys
 * that fits its actual task and supplies a topic-specific demo exchange.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, ChevronRight, ChevronDown, FileText, ClipboardList, MessageSquareText,
  HelpCircle, Lightbulb, MessagesSquare, GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveLevel, enforceLevel } from "@/lib/useActiveLevel";
import { PdfViewer } from "./PdfViewer";

interface StrukturSection { key: string; demo: { frage: string; antwort: string; reaktion?: string } }
interface DialogLine { speaker: "A" | "B"; text: string; section?: string }
interface Erklaerung { worum_geht_es: string; was_wird_erwartet: string; wichtige_punkte: string[]; worauf_achten: string[] }
interface Wortschatz { verben: string[]; woerter: string[]; adjektive: string[] }

interface SpeakingToolboxT3V2 {
  schema_version: 2;
  erklaerung: Erklaerung;
  struktur: StrukturSection[];
  moegliche_fragen: string[];
  moegliche_antworten_ideen: string[];
  beispieldialog: DialogLine[];
  wortschatz: Wortschatz;
}

interface Topic {
  id: string;
  title: string;
  body_text: string | null;
  theme_category: string | null;
  difficulty_level: string | null;
  speaking_toolbox: SpeakingToolboxT3V2 | { schema_version?: number } | null;
  level?: string | null;
}

// ── same GROUP_ORDER as scripts/teil3-redemittel-library.mjs's book generator, kept in sync deliberately ──
const GROUP_ORDER = [
  "Freizeit", "Bildung", "Gesellschaft", "Reisen", "Familie",
  "Beruf", "Gesundheit", "Technologie", "Soziales Engagement", "Medien",
];

// ── same category Redemittel library as scripts/teil3-redemittel-library.mjs ──
const REDEMITTEL_LIBRARY: Record<string, { emoji: string; label: string; frage: string[]; antwort: string[] }> = {
  start: { emoji: "🟢", label: "Start", frage: ["Dann lass uns gemeinsam überlegen, wie wir … organisieren können.", "Sollen wir gleich mit der Planung anfangen?", "Wo, meinst du, sollten wir anfangen?"], antwort: ["Ja, das ist eine gute Idee. Schließlich ist das Thema wirklich wichtig.", "Gerne, ich habe auch schon ein paar erste Gedanken dazu.", "Ja, fangen wir am besten gleich an."] },
  ziel: { emoji: "🎯", label: "Ziel / Zweck", frage: ["Was sollte deiner Meinung nach das Hauptziel sein?", "Was wollen wir mit … eigentlich erreichen?", "Was ist dir dabei besonders wichtig?"], antwort: ["Meiner Ansicht nach sollte das Hauptziel darin bestehen, …", "Ich denke, es geht vor allem darum, dass …", "Für mich steht im Vordergrund, dass …"] },
  zeit: { emoji: "⏰", label: "Zeitpunkt", frage: ["Wann wäre deiner Meinung nach der geeignetste Zeitpunkt dafür?", "Welcher Termin würde dir am besten passen?", "Wann wäre es deiner Meinung nach am sinnvollsten, …?"], antwort: ["Am sinnvollsten wäre es wahrscheinlich, …", "Ich würde vorschlagen, dass wir …", "Ich halte … für den geeignetsten Zeitpunkt, weil …"] },
  ort: { emoji: "📍", label: "Ort", frage: ["Welcher Ort wäre dafür am besten geeignet?", "Wo könnten wir das am besten organisieren?", "Was hältst du davon, wenn wir es in … machen?"], antwort: ["Ich halte … für die praktischste Lösung, weil …", "Ich würde eher … bevorzugen, da …", "Dort hätten wir den Vorteil, dass …"] },
  verkehrsmittel: { emoji: "🚌", label: "Verkehrsmittel", frage: ["Wie sollen wir am besten dorthin kommen?", "Was hältst du von … als Verkehrsmittel?", "Wäre es nicht praktischer, mit … zu fahren?"], antwort: ["Ich würde … vorschlagen, weil das günstiger/schneller ist.", "Am bequemsten wäre wahrscheinlich …", "Dadurch würden wir außerdem Kosten sparen."] },
  unterkunft: { emoji: "🏨", label: "Unterkunft", frage: ["Wo sollten wir übernachten?", "Was hältst du von einer Jugendherberge statt einem Hotel?", "Welche Unterkunft passt am besten zu unserem Budget?"], antwort: ["Ich würde … bevorzugen, weil es günstiger/zentraler ist.", "Das wäre sicher komfortabler, allerdings auch teurer.", "Dort hätten wir den Vorteil, dass …"] },
  anlass: { emoji: "🎉", label: "Anlass", frage: ["Was genau möchten wir mit dieser Feier eigentlich feiern?", "Wie groß soll die Feier werden?", "Soll es eher überraschend oder offiziell angekündigt sein?"], antwort: ["Ich finde, wir sollten vor allem …", "Meiner Meinung nach sollte der Fokus auf … liegen.", "Ich denke, es sollte eher … sein."] },
  gaeste: { emoji: "🙋", label: "Gäste", frage: ["Wen sollten wir alles einladen?", "Wie viele Gäste erwarten wir ungefähr?", "Sollen auch Familienmitglieder oder Partner eingeladen werden?"], antwort: ["Ich würde vorschlagen, dass wir …", "Am besten laden wir … ein, weil …", "Ich denke, wir sollten die Gästeliste auf … begrenzen."] },
  essen: { emoji: "🍽️", label: "Essen & Getränke", frage: ["Was sollten wir zu essen und trinken anbieten?", "Sollen wir selbst kochen oder etwas bestellen?", "Sollten wir auf besondere Ernährungsbedürfnisse achten?"], antwort: ["Ich würde vorschlagen, dass jeder etwas mitbringt.", "Am einfachsten wäre es, wenn wir …", "Wir sollten auch an vegetarische Optionen denken."] },
  programm: { emoji: "🎶", label: "Programm / Musik", frage: ["Was sollten wir für ein Programm planen?", "Was hältst du von Live-Musik statt einer Playlist?", "Sollten wir Spiele oder Aktivitäten einplanen?"], antwort: ["Ich hätte da eine Idee: Wir könnten …", "Das wäre sicher unterhaltsam, weil …", "Eine weitere Möglichkeit wäre …"] },
  inhalte: { emoji: "📚", label: "Inhalte", frage: ["Welche Themen sollten unbedingt behandelt werden?", "Was sollte inhaltlich im Mittelpunkt stehen?", "Welche Aspekte dürfen wir nicht vergessen?"], antwort: ["Meiner Meinung nach sollten wir vor allem … behandeln.", "Das halte ich ebenfalls für sinnvoll. Vielleicht könnten wir zusätzlich …", "Dadurch würden die Teilnehmer einen umfassenderen Überblick bekommen."] },
  aktivitaeten: { emoji: "🏞️", label: "Aktivitäten", frage: ["Welche Aktivitäten sollten wir einplanen?", "Was hältst du von …?", "Sollten wir eher etwas Ruhiges oder etwas Aktives einplanen?"], antwort: ["Ich würde vorschlagen, dass wir …", "Das wäre sicher interessant, weil …", "Wir könnten auch … einplanen, damit für jeden etwas dabei ist."] },
  vorschlaege: { emoji: "💡", label: "Vorschläge", frage: ["Hast du dazu schon eine konkrete Idee?", "Was hältst du davon, wenn wir …?", "Wie wäre es mit …?"], antwort: ["Ich würde vorschlagen, dass wir …", "Eine weitere Möglichkeit wäre, …", "Das klingt nach einer sehr guten Idee, vor allem weil …"] },
  material: { emoji: "🛠️", label: "Material", frage: ["Welche technischen Geräte und Materialien benötigen wir dafür?", "Glaubst du, dass wir noch etwas benötigen?", "Wer könnte das nötige Material besorgen?"], antwort: ["Wir brauchen auf jeden Fall …", "Ich könnte … besorgen, wenn du willst.", "Vielleicht sollten wir außerdem … einplanen."] },
  werbung: { emoji: "📢", label: "Werbung", frage: ["Wie könnten wir möglichst viele Besucher erreichen?", "Über welche Kanäle sollten wir werben?", "Wer könnte uns beim Bekanntmachen helfen?"], antwort: ["Wir könnten Werbung über … machen.", "Das halte ich für sinnvoll, weil wir dadurch eine größere Zielgruppe ansprechen.", "Vielleicht sollten wir auch … um Hilfe bitten."] },
  teilnehmer: { emoji: "🙋", label: "Teilnehmer", frage: ["An wen richtet sich das Angebot genau?", "Wie viele Teilnehmer erwarten wir?", "Sollten wir eine Anmeldung organisieren?"], antwort: ["Ich denke, vor allem … würden davon profitieren.", "Wir sollten eine ungefähre Teilnehmerzahl einplanen, um …", "Eine Anmeldeliste wäre sinnvoll, damit wir besser planen können."] },
  aufgabenverteilung: { emoji: "👥", label: "Aufgabenverteilung", frage: ["Wie könnten wir die Aufgaben möglichst effizient aufteilen?", "Was würdest du gerne übernehmen?", "Wer kümmert sich am besten um …?"], antwort: ["Ich könnte mich um … kümmern. Würdest du dann … übernehmen?", "Ja, das mache ich gerne. Außerdem könnte ich …", "Das teilen wir uns am besten je nach Stärken auf."] },
  kosten: { emoji: "💰", label: "Kosten", frage: ["Wie hoch sollte das Budget insgesamt sein?", "Wie teilen wir die Kosten am besten auf?", "Sollten wir versuchen, Kosten zu sparen?"], antwort: ["Ich würde vorschlagen, dass wir die Kosten gleich aufteilen.", "Wir sollten ein realistisches Budget von … einplanen.", "Vielleicht können wir bei … sparen, indem wir …"] },
  ablauf: { emoji: "🔄", label: "Ablauf / Durchführung", frage: ["Wie sollte der genaue Ablauf aussehen?", "Was passiert zuerst, was danach?", "Sollten wir das in mehreren Schritten organisieren?"], antwort: ["Ich würde vorschlagen, dass wir zuerst … und danach …", "Am sinnvollsten wäre eine klare Reihenfolge: zuerst …, dann …", "Wir sollten genug Zeit für jeden Schritt einplanen."] },
  abschluss: { emoji: "✅", label: "Abschluss", frage: ["Können wir das so festhalten?", "Sind wir uns bei allen Punkten einig?", "Passt das so für dich?"], antwort: ["Dann können wir festhalten, dass …", "Perfekt, dann haben wir einen guten Plan.", "Genau, ich denke, das wird gut funktionieren."] },
};

const ZUSTIMMUNG_WIDERSPRUCH = {
  meinung_erfragen: ["Was meinst du dazu?", "Wie siehst du das?", "Wie findest du diese Idee?", "Wäre das auch für dich passend?"],
  zustimmen: ["Das sehe ich genauso.", "Das halte ich ebenfalls für sinnvoll.", "Da stimme ich dir zu.", "Das klingt nach einer guten Lösung."],
  widersprechen: ["Ich verstehe deinen Punkt, aber ich würde eher …", "Das könnte schwierig sein, weil …", "Ich sehe das etwas anders, denn …", "Das ist ein guter Gedanke, allerdings sollten wir auch bedenken, dass …"],
};

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
  { key: "struktur", label: "3. Struktur", icon: MessageSquareText },
  { key: "fragen", label: "4. Fragen", icon: HelpCircle },
  { key: "antworten", label: "5. Antworten", icon: Lightbulb },
  { key: "dialog", label: "6. Dialog", icon: MessagesSquare },
  { key: "wortschatz", label: "7. Wortschatz", icon: GraduationCap },
] as const;
type PageKey = typeof PAGES[number]["key"];

function isReady(tb: Topic["speaking_toolbox"]): tb is SpeakingToolboxT3V2 {
  return !!tb && (tb as any).schema_version === 2;
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

function RedemittelCols({ frage, antwort }: { frage: string[]; antwort: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Fragen stellen</h5>
        <ul className="space-y-1">{frage.map((f, i) => <li key={i} className="text-sm italic text-muted-foreground">„{f}“</li>)}</ul>
      </div>
      <div>
        <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Antworten geben</h5>
        <ul className="space-y-1">{antwort.map((a, i) => <li key={i} className="text-sm italic text-muted-foreground">„{a}“</li>)}</ul>
      </div>
    </div>
  );
}

function StrukturCard({ sec }: { sec: StrukturSection }) {
  const lib = REDEMITTEL_LIBRARY[sec.key] ?? { emoji: "•", label: sec.key, frage: [], antwort: [] };
  return (
    <div className="rounded-xl border border-border p-4">
      <h4 className="mb-2 text-sm font-black text-foreground">{lib.emoji} {lib.label}</h4>
      <RedemittelCols frage={lib.frage} antwort={lib.antwort} />
      <div className="mt-3 space-y-1 rounded-lg bg-sky-500/5 p-3">
        <p className="text-sm"><span className="font-black text-sky-600 dark:text-sky-400">A:</span> {sec.demo.frage}</p>
        <p className="text-sm"><span className="font-black text-rose-600 dark:text-rose-400">B:</span> {sec.demo.antwort}</p>
        {sec.demo.reaktion && <p className="text-sm"><span className="font-black text-sky-600 dark:text-sky-400">A:</span> {sec.demo.reaktion}</p>}
      </div>
    </div>
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
          </div>
        )}

        {page === "struktur" && tb && (
          <div className="space-y-3">
            <p className="text-xs italic text-muted-foreground">Fragen stellen → Antworten geben → reagieren. Für jeden Punkt ein Beispiel:</p>
            {tb.struktur.map((sec, i) => <StrukturCard key={i} sec={sec} />)}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <h4 className="mb-2 text-sm font-black text-foreground">🔁 Zustimmen &amp; höflich widersprechen</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Nach Meinung fragen</h5>
                  <ul className="space-y-1">{ZUSTIMMUNG_WIDERSPRUCH.meinung_erfragen.map((f, i) => <li key={i} className="text-sm italic text-muted-foreground">„{f}“</li>)}</ul>
                </div>
                <div>
                  <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Zustimmen</h5>
                  <ul className="space-y-1">{ZUSTIMMUNG_WIDERSPRUCH.zustimmen.map((f, i) => <li key={i} className="text-sm italic text-muted-foreground">„{f}“</li>)}</ul>
                </div>
                <div>
                  <h5 className="mb-1 text-[10px] font-black uppercase tracking-wide text-muted-foreground">Höflich widersprechen</h5>
                  <ul className="space-y-1">{ZUSTIMMUNG_WIDERSPRUCH.widersprechen.map((f, i) => <li key={i} className="text-sm italic text-muted-foreground">„{f}“</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {page === "fragen" && tb && (
          <div>
            <p className="mb-3 text-xs italic text-muted-foreground">Realistische Fragen, die Ihr Gesprächspartner stellen könnte:</p>
            <PlainList items={tb.moegliche_fragen} />
          </div>
        )}

        {page === "antworten" && tb && (
          <div>
            <p className="mb-3 text-xs italic text-muted-foreground">Verschiedene Ideen, aus denen Sie in der Prüfung frei wählen können:</p>
            <PlainList items={tb.moegliche_antworten_ideen} />
          </div>
        )}

        {page === "dialog" && tb && (
          <div className="space-y-1">
            {(() => {
              let lastSection: string | undefined;
              return tb.beispieldialog.map((l, i) => {
                const showHeader = l.section && l.section !== lastSection;
                if (l.section) lastSection = l.section;
                const lib = l.section ? REDEMITTEL_LIBRARY[l.section] : null;
                return (
                  <div key={i}>
                    {showHeader && lib && (
                      <p className="mb-1 mt-4 text-xs font-black uppercase tracking-wide text-sky-600 first:mt-0 dark:text-sky-400">{lib.emoji} {lib.label}</p>
                    )}
                    <p className="text-sm leading-relaxed">
                      <span className={`font-black ${l.speaker === "A" ? "text-sky-600 dark:text-sky-400" : "text-rose-600 dark:text-rose-400"}`}>{l.speaker}:</span>{" "}
                      <span className="text-foreground">{l.text}</span>
                    </p>
                  </div>
                );
              });
            })()}
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
              Wählen Sie links ein Thema aus, um Erklärung, Struktur, Redemittel, mögliche Fragen &amp; Antworten, einen Beispieldialog und Wortschatz zu sehen.
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
