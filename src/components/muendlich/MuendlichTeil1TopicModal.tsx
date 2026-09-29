/**
 * Teil 1 topic content — a sibling to Teil3TopicModal.tsx, not a shared
 * component: Teil 1 is a SOLO monologue (describe a photo / present alone),
 * unlike Teil 2/3's two-candidate dialogue, so its "Struktur" is a sequence
 * of phases with example sentences a candidate says by themselves, never an
 * A/B exchange. Renders gracefully with only the Aufgabe when a topic's
 * speaking_toolbox hasn't been authored yet (e.g. Präsentation topics that
 * predate this component) — see isReady()'s fallback.
 */
import { useState } from "react";
import { ClipboardList, MessagesSquare, GraduationCap } from "lucide-react";
import { TopicModalShell, type ModalTab } from "./MuendlichTopicModalShell";

interface Erklaerung {
  worum_geht_es: string; worum_geht_es_ar?: string;
  was_wird_erwartet: string; was_wird_erwartet_ar?: string;
  wichtige_punkte: string[]; wichtige_punkte_ar?: string[];
  worauf_achten: string[];
}
interface BeispielSatz { de: string; ar?: string }
interface StrukturPhase { key: string; emoji?: string; label: string; beispiele: BeispielSatz[] }
interface Wortschatz { verben: string[]; woerter: string[]; adjektive: string[] }

export interface SpeakingToolboxT1V1 {
  schema_version: 1;
  erklaerung: Erklaerung;
  struktur: StrukturPhase[];
  wortschatz: Wortschatz;
  wortschatz_ar?: Wortschatz;
}

export interface Teil1TopicRow {
  id: string; title: string; body_text: string | null;
  theme_category: string | null; difficulty_level: string | null;
  speaking_toolbox: SpeakingToolboxT1V1 | { schema_version?: number } | null;
}

function isReady(tb: Teil1TopicRow["speaking_toolbox"]): tb is SpeakingToolboxT1V1 {
  return !!tb && (tb as any).schema_version === 1 && Array.isArray((tb as any).struktur);
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

function PhaseCard({ phase }: { phase: StrukturPhase }) {
  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.02] p-4 shadow-sm">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-black text-sky-700 dark:text-sky-400">
        <span className="text-base">{phase.emoji ?? "•"}</span> {phase.label}
      </h4>
      <ul className="space-y-2">
        {phase.beispiele.map((b, i) => (
          <li key={i} className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-2.5">
            <p className="text-sm italic text-foreground">„{b.de}“</p>
            {b.ar && <p dir="rtl" className="mt-1 text-right text-sm text-indigo-600 dark:text-indigo-400">„{b.ar}“</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const TABS: ModalTab<"erklaerung" | "struktur" | "wortschatz">[] = [
  { key: "erklaerung", label: "Erklärung & Überblick", icon: ClipboardList },
  { key: "struktur", label: "Struktur & Redemittel", icon: MessagesSquare },
  { key: "wortschatz", label: "Wortschatz", icon: GraduationCap },
];

export function Teil1TopicModal({ topic, onClose }: { topic: Teil1TopicRow; onClose: () => void }) {
  const [page, setPage] = useState<"erklaerung" | "struktur" | "wortschatz">("erklaerung");
  const tb = isReady(topic.speaking_toolbox) ? topic.speaking_toolbox : null;

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

      {page === "struktur" && tb && (
        <div className="space-y-3">
          <p className="text-xs italic text-muted-foreground">Gehen Sie diese Phasen der Reihe nach durch — für jede Phase ein paar Beispielsätze:</p>
          {tb.struktur.map((phase) => <PhaseCard key={phase.key} phase={phase} />)}
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
