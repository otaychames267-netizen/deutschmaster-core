/**
 * Full Teil 3 topic content — everything that used to live only in the PDF
 * (owner decision 2026-08-10: PDF removed entirely, all content native).
 * Rendered inside TopicModalShell once the parent has already fetched the
 * row (RLS-gated has_plan_access read) — this component is purely
 * presentational and never fetches on its own.
 */
import { useState } from "react";
import { ClipboardList, MessagesSquare, GraduationCap, HelpCircle, Lightbulb } from "lucide-react";
import { TopicModalShell, type ModalTab } from "./MuendlichTopicModalShell";

interface StrukturSection { key: string; demo: { frage: string; antwort: string; reaktion?: string } }
interface DialogLine { speaker: "A" | "B"; text: string; section?: string }
interface Erklaerung {
  worum_geht_es: string; worum_geht_es_ar?: string;
  was_wird_erwartet: string; was_wird_erwartet_ar?: string;
  wichtige_punkte: string[]; wichtige_punkte_ar?: string[];
  worauf_achten: string[];
}
interface Wortschatz { verben: string[]; woerter: string[]; adjektive: string[] }
interface WortschatzAr { verben: string[]; woerter: string[]; adjektive: string[] }

export interface SpeakingToolboxT3V2 {
  schema_version: 2 | 3;
  erklaerung: Erklaerung;
  struktur: StrukturSection[];
  moegliche_fragen: string[];
  moegliche_antworten_ideen: string[];
  beispieldialog: DialogLine[];
  wortschatz: Wortschatz;
  wortschatz_ar?: WortschatzAr;
}

export interface Teil3TopicRow {
  id: string; title: string; body_text: string | null;
  theme_category: string | null; difficulty_level: string | null;
  speaking_toolbox: SpeakingToolboxT3V2 | { schema_version?: number } | null;
}

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

function isReady(tb: Teil3TopicRow["speaking_toolbox"]): tb is SpeakingToolboxT3V2 {
  return !!tb && ((tb as any).schema_version === 2 || (tb as any).schema_version === 3);
}

function PlainList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" />
          <span className="text-foreground">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function PlainListBilingual({ items, itemsAr }: { items: string[]; itemsAr?: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sky-500" />
          <div>
            <span className="text-foreground">{it}</span>
            {itemsAr?.[i] && <p dir="rtl" className="mt-0.5 text-right text-sm text-indigo-600 dark:text-indigo-400">{itemsAr[i]}</p>}
          </div>
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
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.02] p-4 shadow-sm">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-black text-sky-700 dark:text-sky-400">
        <span className="text-base">{lib.emoji}</span> {lib.label}
      </h4>
      <RedemittelCols frage={lib.frage} antwort={lib.antwort} />
      <div className="mt-3 space-y-1 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
        <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-sky-600/70 dark:text-sky-400/70">
          <MessagesSquare className="h-3 w-3" /> Beispiel
        </p>
        <p className="text-sm"><span className="font-black text-sky-600 dark:text-sky-400">A:</span> {sec.demo.frage}</p>
        <p className="text-sm"><span className="font-black text-rose-600 dark:text-rose-400">B:</span> {sec.demo.antwort}</p>
        {sec.demo.reaktion && <p className="text-sm"><span className="font-black text-sky-600 dark:text-sky-400">A:</span> {sec.demo.reaktion}</p>}
      </div>
    </div>
  );
}

const TABS: ModalTab<"erklaerung" | "vorstellung" | "wortschatz">[] = [
  { key: "erklaerung", label: "Erklärung & Überblick", icon: ClipboardList },
  { key: "vorstellung", label: "Vorstellung & Dialog", icon: MessagesSquare },
  { key: "wortschatz", label: "Wortschatz", icon: GraduationCap },
];

export function Teil3TopicModal({ topic, onClose }: { topic: Teil3TopicRow; onClose: () => void }) {
  const [page, setPage] = useState<"erklaerung" | "vorstellung" | "wortschatz">("erklaerung");
  const tb = isReady(topic.speaking_toolbox) ? topic.speaking_toolbox : null;
  const opening = tb?.beispieldialog?.[0];

  return (
    <TopicModalShell
      title={topic.title}
      badges={[topic.theme_category, topic.difficulty_level]}
      tabs={TABS}
      activeTab={page}
      onTabChange={setPage}
      onClose={onClose}
    >
      {page === "erklaerung" && (
        <div className="space-y-6">
          {topic.body_text && (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <h3 className="mb-2 text-sm font-black text-foreground">Aufgabe</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{topic.body_text}</p>
            </div>
          )}
          {tb && (
            <>
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Worum geht es?</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{tb.erklaerung.worum_geht_es}</p>
                {tb.erklaerung.worum_geht_es_ar && (
                  <p dir="rtl" className="mt-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 text-right text-sm leading-loose text-indigo-700 dark:text-indigo-300">{tb.erklaerung.worum_geht_es_ar}</p>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-black text-foreground">Was wird erwartet?</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{tb.erklaerung.was_wird_erwartet}</p>
                {tb.erklaerung.was_wird_erwartet_ar && (
                  <p dir="rtl" className="mt-2 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 text-right text-sm leading-loose text-indigo-700 dark:text-indigo-300">{tb.erklaerung.was_wird_erwartet_ar}</p>
                )}
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="mb-2 text-sm font-black text-foreground">Wichtige Punkte</h3>
                  <PlainListBilingual items={tb.erklaerung.wichtige_punkte} itemsAr={tb.erklaerung.wichtige_punkte_ar} />
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <h3 className="mb-2 text-sm font-black text-foreground">Worauf achten?</h3>
                  <PlainList items={tb.erklaerung.worauf_achten} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {page === "vorstellung" && tb && (
        <div className="space-y-6">
          {opening && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-sky-700 dark:text-sky-400">
                <MessagesSquare className="h-4 w-4" /> Vorstellung des Themas (Eröffnung)
              </h3>
              <p className="text-sm leading-relaxed">
                <span className="font-black text-sky-600 dark:text-sky-400">A:</span>{" "}
                <span className="text-foreground">{opening.text}</span>
              </p>
              <p className="mt-2 text-xs italic text-muted-foreground">
                Kandidat/in A präsentiert das Szenario, bevor die Diskussion beginnt — so sollte jedes Gespräch in Teil 3 eröffnet werden.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-xs italic text-muted-foreground">Fragen stellen → Antworten geben → reagieren. Für jeden Punkt ein Beispiel:</p>
            {tb.struktur.map((sec, i) => <StrukturCard key={i} sec={sec} />)}
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-black text-violet-700 dark:text-violet-400">
                <span className="text-base">🔁</span> Zustimmen &amp; höflich widersprechen
              </h4>
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

          <div>
            <h3 className="mb-3 text-sm font-black text-foreground">Vollständiger Beispieldialog</h3>
            <div className="space-y-1 rounded-xl border border-border bg-muted/20 p-4">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">
                <HelpCircle className="h-3.5 w-3.5" /> Weitere mögliche Fragen
              </h4>
              <div className="space-y-2">
                {tb.moegliche_fragen.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5">
                    <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="text-sm text-foreground">{f}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <Lightbulb className="h-3.5 w-3.5" /> Antwortideen
              </h4>
              <div className="space-y-2">
                {tb.moegliche_antworten_ideen.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2.5">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm text-foreground">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {page === "wortschatz" && tb && (
        <div className="grid gap-6 sm:grid-cols-3">
          {([
            ["Wichtige Verben", tb.wortschatz.verben, tb.wortschatz_ar?.verben],
            ["Wichtige Wörter", tb.wortschatz.woerter, tb.wortschatz_ar?.woerter],
            ["Wichtige Adjektive", tb.wortschatz.adjektive, tb.wortschatz_ar?.adjektive],
          ] as [string, string[], string[] | undefined][]).map(([label, items, itemsAr]) => (
            <div key={label}>
              <h3 className="mb-2 text-sm font-black text-foreground">{label}</h3>
              <ul className="space-y-1.5">
                {items.map((it, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 border-b border-dotted border-border pb-1 text-sm">
                    <span className="font-medium text-foreground">{it}</span>
                    {itemsAr?.[i] && <span dir="rtl" className="text-muted-foreground">{itemsAr[i]}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {!tb && page !== "erklaerung" && (
        <p className="text-sm text-muted-foreground">Weitere Inhalte für dieses Thema folgen in Kürze.</p>
      )}
    </TopicModalShell>
  );
}
