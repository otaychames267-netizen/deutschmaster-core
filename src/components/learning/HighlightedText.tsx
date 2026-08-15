/**
 * Renders a passage/transcript with per-question evidence sentences
 * highlighted inline via whitespace-tolerant substring matching. Each
 * match gets a small numbered tag so the student can trace it back to the
 * matching "Warum?" card (see EvidenceBlock's triggerLabel).
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
import { Fragment, type ReactNode } from "react";
import { getEvidenceColor, type EvidenceColor } from "./evidenceColors";

export interface HighlightItem {
  itemKey: string;
  /** Short tag text, e.g. "6" or "Frage 6". */
  label: string;
  evidenceText: string | null | undefined;
  colorIndex: number;
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

export function HighlightedText({ text, items, className }: Props) {
  const matches: Match[] = [];
  for (const item of items) {
    if (!item.evidenceText) continue;
    const range = findEvidenceRange(text, item.evidenceText);
    if (!range) continue;
    const { start, end } = range;
    if (matches.some((m) => start < m.end && end > m.start)) continue;
    matches.push({ start, end, item, color: getEvidenceColor(item.colorIndex) });
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
      <mark key={`m-${i}`} className={`rounded px-0.5 py-px text-foreground ${m.color.mark}`}>
        {text.slice(m.start, m.end)}
        <sup className={`ml-0.5 rounded-full border px-1 text-[9px] font-black not-italic ${m.color.badge}`}>
          {m.item.label}
        </sup>
      </mark>,
    );
    cursor = m.end;
  });
  if (cursor < text.length) nodes.push(<Fragment key="t-last">{text.slice(cursor)}</Fragment>);

  return <span className={className}>{nodes}</span>;
}
