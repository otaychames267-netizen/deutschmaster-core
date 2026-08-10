/**
 * Full Teil 2 topic content — everything that used to live only in the PDF
 * (owner decision 2026-08-10: PDF removed entirely, all content native).
 * Rendered inside TopicModalShell once the parent has already fetched the
 * row (RLS-gated has_plan_access read) — this component is purely
 * presentational and never fetches on its own.
 */
import { useState } from "react";
import {
  BookOpen, Lightbulb, MessageCircle, MessageCircleHeart, Scale, HelpCircle,
  GraduationCap, Sparkles, ThumbsUp, ThumbsDown, ChevronRight,
} from "lucide-react";
import { TopicModalShell, type ModalTab } from "./MuendlichTopicModalShell";

interface Bilingual { de: string; ar: string }
interface ExampleBlock { text: string; ar: string; label?: string }
interface QAItem { q_de: string; q_ar?: string; answer_ideas: string[] }
interface VocabItem { de: string; ar: string }

export interface SpeakingToolboxV2 {
  schema_version: 2;
  page2_inhalt: {
    ar_summary: string;
    extraction_guide_ar: string;
    inhalt_de: string;
    inhalt_redemittel: Bilingual[];
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

export interface Teil2TopicRow {
  id: string; title: string; body_text: string | null;
  theme_category: string | null; difficulty_level: string | null;
  speaking_toolbox: SpeakingToolboxV2 | { schema_version?: number } | null;
}

function isV2(tb: Teil2TopicRow["speaking_toolbox"]): tb is SpeakingToolboxV2 {
  return !!tb && (tb as any).schema_version === 2;
}

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
    <p dir="rtl" className={`text-right text-sm leading-loose text-muted-foreground ${className}`}>
      {text}
    </p>
  );
}

function SentenceList({ items }: { items: Bilingual[] }) {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
          <div className="flex-1">
            <span className="text-foreground">{it.de}</span>
            <ArBlock text={it.ar} className="mt-1" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RedemittelList({ items }: { items: Bilingual[] }) {
  return (
    <ul className="space-y-2 text-sm text-foreground">
      {items.map((r, i) => (
        <li key={i}>
          <p className="italic">"{r.de}"</p>
          <ArBlock text={r.ar} className="mt-0.5" />
        </li>
      ))}
    </ul>
  );
}

function ExampleCallout({ example }: { example: ExampleBlock }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
      <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-black text-rose-600 dark:text-rose-400">
        <Sparkles className="h-4 w-4" /> {example.label ?? "Beispiel"}
      </h3>
      <p className="text-sm leading-relaxed text-foreground">{renderMarked(example.text)}</p>
      <ArBlock text={example.ar} className="mt-2 border-t border-rose-500/20 pt-2" />
    </div>
  );
}

const TABS: ModalTab<"text" | "inhalt" | "meinung" | "erfahrung" | "procontra" | "fragen" | "wortschatz">[] = [
  { key: "text", label: "Text", icon: BookOpen },
  { key: "inhalt", label: "Inhalt", icon: Lightbulb },
  { key: "meinung", label: "Meinung", icon: MessageCircle },
  { key: "erfahrung", label: "Erfahrung", icon: MessageCircleHeart },
  { key: "procontra", label: "Vor-/Nachteile", icon: Scale },
  { key: "fragen", label: "Prüfungsfragen", icon: HelpCircle },
  { key: "wortschatz", label: "Wortschatz", icon: GraduationCap },
];

export function Teil2TopicModal({ topic, onClose }: { topic: Teil2TopicRow; onClose: () => void }) {
  const [page, setPage] = useState<typeof TABS[number]["key"]>("text");
  const tb = isV2(topic.speaking_toolbox) ? topic.speaking_toolbox : null;

  return (
    <TopicModalShell
      title={topic.title}
      badges={[topic.theme_category, topic.difficulty_level]}
      tabs={TABS}
      activeTab={page}
      onTabChange={setPage}
      onClose={onClose}
    >
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
            <RedemittelList items={tb.page2_inhalt.inhalt_redemittel} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-black text-foreground">Ideen zum Text</h3>
            <SentenceList items={tb.page2_inhalt.ideas} />
          </div>
        </div>
      )}

      {page === "meinung" && tb && (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-black text-foreground">Redemittel für die Meinung</h3>
            <RedemittelList items={tb.page3_meinung.redemittel} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-black text-foreground">Ideen zur Meinung</h3>
            <SentenceList items={tb.page3_meinung.ideas} />
          </div>
          <ExampleCallout example={tb.page3_meinung.example} />
        </div>
      )}

      {page === "erfahrung" && tb && (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Persönliche Erfahrung</h3>
              <RedemittelList items={tb.page4_erfahrung.experience_redemittel} />
              <div className="mt-3"><SentenceList items={tb.page4_erfahrung.experience_ideas} /></div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-black text-foreground">Mein Heimatland (Tunesien)</h3>
              <RedemittelList items={tb.page4_erfahrung.heimatland_redemittel} />
              <div className="mt-3"><SentenceList items={tb.page4_erfahrung.heimatland_ideas} /></div>
            </div>
          </div>
          <ExampleCallout example={tb.page4_erfahrung.example} />
        </div>
      )}

      {page === "procontra" && tb && (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-emerald-600 dark:text-emerald-400">
                <ThumbsUp className="h-4 w-4" /> Vorteile
              </h3>
              <div className="mb-3"><RedemittelList items={tb.page5_procontra.vorteile.redemittel} /></div>
              <SentenceList items={tb.page5_procontra.vorteile.ideas} />
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-black text-red-600 dark:text-red-400">
                <ThumbsDown className="h-4 w-4" /> Nachteile
              </h3>
              <div className="mb-3"><RedemittelList items={tb.page5_procontra.nachteile.redemittel} /></div>
              <SentenceList items={tb.page5_procontra.nachteile.ideas} />
            </div>
          </div>
          <ExampleCallout example={tb.page5_procontra.example} />
        </div>
      )}

      {page === "fragen" && tb && (
        <div className="space-y-4">
          {tb.page6_fragen.questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-bold text-foreground">{i + 1}. {q.q_de}</p>
              {q.q_ar && <ArBlock text={q.q_ar} className="mt-1" />}
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
                    <span dir="rtl" className="text-muted-foreground">({it.ar})</span>
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
    </TopicModalShell>
  );
}
