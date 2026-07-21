/**
 * Lean, controlled answer-input renderers for the Prüfungssimulation.
 *
 * Deliberately NOT a reuse of the practice-mode Teil components
 * (src/components/exercise/lesen|sprachbausteine|hoeren/*) — those are
 * self-contained: they call their own scoring RPC on submit, render instant
 * right/wrong feedback, and offer a "Lösung anzeigen" reveal. All three are
 * wrong for an exam: answers must flow to the parent's `answers` state with
 * no feedback and no reveal, and scoring only happens once, at the very end,
 * via score_simulation_sections. These renderers reuse the same visual
 * language (cards, letter badges, spacing) for consistency but carry no
 * scoring/feedback/persistence logic of their own — pure value/onChange.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const CARD = "rounded-2xl border border-border bg-card p-5";

/* ─── Lesen Teil 1 — Schlagzeilen zuordnen ─────────────────────────────── */

export interface LesenT1Data {
  headlines: { letter: string; text: string }[];
  texts: { position: number; title: string | null; content: string }[];
}

export function LesenT1Input({ data, value, onChange }: { data: LesenT1Data; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const texts = [...data.texts].sort((a, b) => a.position - b.position);
  const headlines = [...data.headlines].sort((a, b) => a.letter.localeCompare(b.letter));
  return (
    <div className="space-y-4">
      <div className={CARD}>
        <p className="text-sm font-bold text-foreground mb-0.5">Schlagzeilen zuordnen</p>
        <p className="text-sm text-muted-foreground leading-relaxed">Wählen Sie über jedem Text die passende Schlagzeile (A–J). Fünf Schlagzeilen bleiben übrig.</p>
      </div>
      {texts.map((t) => (
        <div key={t.position} className={CARD}>
          <div className="flex items-center gap-3 mb-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-black text-muted-foreground">{t.position}</span>
            <div className="relative flex-1">
              <select
                value={value[String(t.position)] ?? ""}
                onChange={(e) => onChange({ ...value, [String(t.position)]: e.target.value })}
                className="w-full appearance-none rounded-xl border border-input bg-background px-3.5 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Schlagzeile wählen…</option>
                {headlines.map((h) => <option key={h.letter} value={h.letter}>{h.letter} — {h.text}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          {t.title && <p className="text-sm font-bold text-foreground mb-1">{t.title}</p>}
          <p className="text-sm text-foreground leading-[1.8] whitespace-pre-line">{t.content}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Lesen Teil 2 — Text + Multiple Choice ────────────────────────────── */

export interface LesenT2Data {
  passage: string;
  questions: { number: number; question: string; option_a: string; option_b: string; option_c: string }[];
}

export function LesenT2Input({ data, value, onChange }: { data: LesenT2Data; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const questions = [...data.questions].sort((a, b) => a.number - b.number);
  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className={`${CARD} lg:sticky lg:top-20`}>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Lesetext</p>
        <p className="text-sm text-foreground leading-[1.9] whitespace-pre-line">{data.passage}</p>
      </div>
      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.number} className={CARD}>
            <div className="flex items-start gap-3 mb-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-black text-blue-600 dark:text-blue-400">{q.number}</span>
              <p className="text-sm font-semibold text-foreground leading-snug">{q.question}</p>
            </div>
            <div className="space-y-2">
              {(["a", "b", "c"] as const).map((k) => {
                const label = k === "a" ? q.option_a : k === "b" ? q.option_b : q.option_c;
                const selected = value[String(q.number)] === k;
                return (
                  <button key={k} onClick={() => onChange({ ...value, [String(q.number)]: k })}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
                      selected ? "border-primary bg-primary/5 font-medium" : "border-border bg-background hover:border-primary/30"
                    }`}>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black ${selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{k}</span>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Lesen Teil 3 — Situationen + Anzeigen ────────────────────────────── */

export interface LesenT3Data {
  situations: { number: number; description: string }[];
  texts: { letter: string; title: string | null; content: string }[];
}

export function LesenT3Input({ data, value, onChange }: { data: LesenT3Data; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const situations = [...data.situations].sort((a, b) => a.number - b.number);
  const texts = [...data.texts].sort((a, b) => a.letter.localeCompare(b.letter));
  return (
    <div className="space-y-4">
      <div className={CARD}>
        <p className="text-sm font-bold text-foreground mb-0.5">Situationen den Anzeigen zuordnen</p>
        <p className="text-sm text-muted-foreground leading-relaxed">Für zwei Situationen gibt es keine passende Anzeige — wählen Sie dann „X — keine passende Anzeige".</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2.5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Situationen</p>
          {situations.map((s) => (
            <div key={s.number} className={CARD}>
              <div className="flex items-start gap-3 mb-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-black text-muted-foreground">{s.number}</span>
                <p className="flex-1 text-sm text-foreground leading-snug">{s.description}</p>
              </div>
              <div className="relative">
                <select
                  value={value[String(s.number)] ?? ""}
                  onChange={(e) => onChange({ ...value, [String(s.number)]: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-input bg-background px-3.5 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="">Anzeige wählen…</option>
                  {texts.map((t) => <option key={t.letter} value={t.letter}>{t.letter} — {t.title || `Anzeige ${t.letter}`}</option>)}
                  <option value="0">X — keine passende Anzeige</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Anzeigen A–L</p>
          {texts.map((t) => (
            <div key={t.letter} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-border bg-muted/20 px-4 py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-xs font-black text-blue-600 dark:text-blue-400">{t.letter}</span>
                {t.title && <p className="text-xs font-bold text-foreground truncate flex-1">{t.title}</p>}
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{t.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Sprachbausteine Teil 1 — Lückentext mit A/B/C ────────────────────── */

export interface SBT1Data {
  passage: string; // contains {{31}} .. {{40}} gap markers
  gaps: { gap_number: number; option_a: string; option_b: string; option_c: string }[];
}

function parseGapPassage(passage: string): Array<string | number> {
  return passage.split(/(\{\{\d+\}\})/).map((p) => {
    const m = p.match(/^\{\{(\d+)\}\}$/);
    return m ? parseInt(m[1], 10) : p;
  });
}

export function SBT1Input({ data, value, onChange }: { data: SBT1Data; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const segments = parseGapPassage(data.passage);
  return (
    <div className="space-y-5">
      <div className={CARD}>
        <p className="text-sm leading-[2.1] text-foreground whitespace-pre-line">
          {segments.map((seg, i) =>
            typeof seg === "string"
              ? <span key={i}>{seg}</span>
              : <span key={i} className="mx-1 inline-block rounded border border-dashed border-primary/60 px-1.5 py-0.5 align-middle text-xs font-bold text-primary">{seg}</span>
          )}
        </p>
      </div>
      <div className="space-y-3">
        {data.gaps.slice().sort((a, b) => a.gap_number - b.gap_number).map((g) => (
          <div key={g.gap_number} className={CARD}>
            <p className="text-xs font-black text-muted-foreground mb-2">Lücke {g.gap_number}</p>
            <div className="grid grid-cols-3 gap-2">
              {(["a", "b", "c"] as const).map((k) => {
                const label = k === "a" ? g.option_a : k === "b" ? g.option_b : g.option_c;
                const selected = value[String(g.gap_number)] === k;
                return (
                  <button key={k} onClick={() => onChange({ ...value, [String(g.gap_number)]: k })}
                    className={`rounded-xl border px-3 py-2 text-sm transition-all ${selected ? "border-primary bg-primary/5 font-medium" : "border-border bg-background hover:border-primary/30"}`}>
                    {k.toUpperCase()}. {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Sprachbausteine Teil 2 — Lückentext mit Wortliste ────────────────── */

export interface SBT2Data {
  passage: string; // contains {{41}} .. {{50}} gap markers
  words: { word_number: number; word: string }[];
}

export function SBT2Input({ data, value, onChange }: { data: SBT2Data; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const segments = parseGapPassage(data.passage);
  const usedWords = new Set(Object.values(value).filter(Boolean));
  const [activeGap, setActiveGap] = useState<number | null>(null);

  function pick(gapNumber: number, word: string) {
    onChange({ ...value, [String(gapNumber)]: word });
    setActiveGap(null);
  }
  function clearGap(gapNumber: number) {
    const next = { ...value };
    delete next[String(gapNumber)];
    onChange(next);
  }

  return (
    <div className="space-y-5">
      <div className={CARD}>
        <p className="text-sm leading-[2.3] text-foreground whitespace-pre-line">
          {segments.map((seg, i) => {
            if (typeof seg === "string") return <span key={i}>{seg}</span>;
            const filled = value[String(seg)];
            return (
              <button key={i} onClick={() => (filled ? clearGap(seg) : setActiveGap(seg))}
                className={`mx-1 inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-sm font-medium align-middle transition-all ${
                  filled ? "border-primary/40 bg-primary/5 text-primary" : activeGap === seg ? "border-primary bg-primary/10 text-primary" : "border-dashed border-muted-foreground/40 text-muted-foreground"
                }`}>
                {filled ?? `[${seg}]`}
              </button>
            );
          })}
        </p>
      </div>
      <div className={CARD}>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">
          {activeGap ? `Wort für Lücke ${activeGap} wählen` : "Wortliste — zuerst eine Lücke im Text anklicken"}
        </p>
        <div className="flex flex-wrap gap-2">
          {data.words.slice().sort((a, b) => a.word_number - b.word_number).map((w) => {
            const disabled = usedWords.has(w.word) || !activeGap;
            return (
              <button key={w.word_number} disabled={disabled} onClick={() => activeGap && pick(activeGap, w.word)}
                className={`rounded-xl border px-3 py-1.5 text-sm transition-all ${
                  usedWords.has(w.word) ? "opacity-30 cursor-not-allowed border-border bg-muted" : !activeGap ? "opacity-50 border-border bg-muted cursor-not-allowed" : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                }`}>
                {w.word}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Hören — Richtig/Falsch (shared across Teil 1/2/3) ────────────────── */

export interface HoerenData {
  instructions: string | null;
  imageUrl: string | null;
  statements: { statement_number: number; statement_text: string }[];
}

export function HoerenInput({ data, value, onChange }: { data: HoerenData; value: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void }) {
  const statements = [...data.statements].sort((a, b) => a.statement_number - b.statement_number);
  return (
    <div className="space-y-4">
      <div className={CARD}>
        {data.instructions && <p className="text-sm text-muted-foreground leading-relaxed mb-3">{data.instructions}</p>}
        {data.imageUrl && (
          <div className="overflow-hidden rounded-xl border border-border">
            <img src={data.imageUrl} alt="" loading="lazy" className="w-full max-h-64 object-cover" />
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
        {statements.map((s) => {
          const current = value[String(s.statement_number)];
          return (
            <div key={s.statement_number} className="flex items-center gap-3 px-4 py-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 shrink-0">
                {([true, false] as const).map((v) => {
                  const selected = current === v;
                  return (
                    <button key={String(v)} onClick={() => onChange({ ...value, [String(s.statement_number)]: v })}
                      className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                      {v ? "Richtig" : "Falsch"}
                    </button>
                  );
                })}
              </div>
              <span className="shrink-0 text-[11px] font-black text-muted-foreground/50 tabular-nums">{s.statement_number}</span>
              <p className="text-sm text-foreground leading-snug flex-1 min-w-[50%]">{s.statement_text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Schreiben — task + textarea ───────────────────────────────────────── */

export function SchreibenInput({ task, value, onChange }: { task: string; value: string; onChange: (v: string) => void }) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="space-y-4">
      <div className={CARD}>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Aufgabe</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{task}</p>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={16}
        placeholder="Schreiben Sie Ihren Brief hier…"
        className="w-full resize-none rounded-2xl border border-input bg-background p-5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/20"
      />
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>{wordCount} Wörter</span>
        <span>Ziel: 180–220 Wörter</span>
      </div>
    </div>
  );
}
