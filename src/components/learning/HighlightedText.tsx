/**
 * Renders a passage/transcript with per-question evidence sentences
 * highlighted inline via whitespace-tolerant substring matching. Each
 * match gets a small numbered "Beleg für Frage N" tag so the student can
 * trace it back to the matching "Warum?" card (see EvidenceBlock's
 * triggerLabel), plus its own inline "🇸🇦" toggle that reveals the Arabic
 * translation of THAT sentence directly underneath it — independent of any
 * bulk "Sätze übersetzen" summary, so a student can translate one sentence
 * without leaving the passage or opening every question's card.
 *
 * PDF-derived source text often carries its original line-wrap `\n`s where
 * a naturally-authored evidence_text sentence has plain spaces — an exact
 * indexOf would miss those, so matching first tries exact, then falls back
 * to comparing both strings with runs of whitespace collapsed. The rendered
 * highlight still slices the ORIGINAL text, so real line breaks inside a
 * match are preserved visually. Items whose evidenceText can't be found
 * either way are silently skipped — never crashes the page. Content
 * authoring keeps evidence_text as a genuine quote from the source;
 * scripts/learning-aids/verify-evidence-substrings.mjs checks this across
 * the DB separately (with the same whitespace-tolerant logic).
 */
import { Fragment, useState, type ReactNode } from "react";
import { Languages } from "lucide-react";
import { getEvidenceColor, type EvidenceColor } from "./evidenceColors";

export interface HighlightItem {
  itemKey: string;
  /** Short tag text, e.g. "6" or "Frage 6". */
  label: string;
  evidenceText: string | null | undefined;
  /** Arabic translation of evidenceText, if authored — enables the inline
   * per-sentence translate toggle right after this specific mark. */
  evidenceTranslation?: string | null;
  /** Unit noun for the "Beleg für ⟨unit⟩ N" badge tooltip. Default "Frage" —
   * Lesen Teil 1 has no numbered questions, only Texte, so it passes "Text". */
  unitLabel?: string;
}

interface Match {
  start: number;
  end: number;
  item: HighlightItem;
  color: EvidenceColor;
}

interface Props {
  text: string;
  items: HighlightItem[];
  className?: string;
}

/** Collapses whitespace runs to a single space, keeping a map from each
 * normalized character back to its index in the original string. */
function normalizeForMatch(s: string): { normalized: string; map: number[] } {
  let normalized = "";
  const map: number[] = [];
  let inWhitespace = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      if (!inWhitespace) {
        normalized += " ";
        map.push(i);
        inWhitespace = true;
      }
    } else {
      normalized += ch;
      map.push(i);
      inWhitespace = false;
    }
  }
  return { normalized, map };
}

function findEvidenceRange(source: string, evidence: string): { start: number; end: number } | null {
  const direct = source.indexOf(evidence);
  if (direct !== -1) return { start: direct, end: direct + evidence.length };

  const { normalized: normSource, map } = normalizeForMatch(source);
  const { normalized: normEvidence } = normalizeForMatch(evidence);
  if (!normEvidence) return null;
  const idx = normSource.indexOf(normEvidence);
  if (idx === -1) return null;
  return { start: map[idx], end: map[idx + normEvidence.length - 1] + 1 };
}

/** One highlighted evidence span + its own inline "🇸🇦" translate toggle. */
function EvidenceMark({ text, item, color }: { text: string; item: HighlightItem; color: EvidenceColor }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <mark className={`rounded px-0.5 py-px text-foreground ${color.mark}`}>
        {text}
        <sup
          title={`Beleg für ${item.unitLabel ?? "Frage"} ${item.label}`}
          className={`ml-0.5 rounded-full border px-1 text-[9px] font-black not-italic ${color.badge}`}
        >
          {item.label}
        </sup>
        {item.evidenceTranslation && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            title="Satz übersetzen"
            className={`ml-0.5 inline-flex items-center rounded-full border px-1 py-px align-middle not-italic ${color.badge} hover:brightness-110`}
          >
            <Languages className="h-2.5 w-2.5" />
          </button>
        )}
      </mark>
      {open && item.evidenceTranslation && (
        <span
          dir="rtl"
          className={`mx-1 my-1 inline-block max-w-full rounded-lg border px-2 py-1 text-xs leading-relaxed align-middle ${color.badge}`}
        >
          {item.evidenceTranslation}
        </span>
      )}
    </>
  );
}

export function HighlightedText({ text, items, className }: Props) {
  const matches: Match[] = [];
  for (const item of items) {
    if (!item.evidenceText) continue;
    const range = findEvidenceRange(text, item.evidenceText);
    if (!range) continue;
    const { start, end } = range;
    if (matches.some((m) => start < m.end && end > m.start)) continue;
    matches.push({ start, end, item, color: getEvidenceColor() });
  }

  if (matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  matches.sort((a, b) => a.start - b.start);

  const nodes: ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) nodes.push(<Fragment key={`t-${i}`}>{text.slice(cursor, m.start)}</Fragment>);
    nodes.push(
      <EvidenceMark key={`m-${i}`} text={text.slice(m.start, m.end)} item={m.item} color={m.color} />,
    );
    cursor = m.end;
  });
  if (cursor < text.length) nodes.push(<Fragment key="t-last">{text.slice(cursor)}</Fragment>);

  return <span className={className}>{nodes}</span>;
}
