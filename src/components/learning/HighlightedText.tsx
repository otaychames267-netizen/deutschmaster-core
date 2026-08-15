/**
 * Renders a passage/transcript with per-question evidence sentences
 * highlighted inline via plain, case-sensitive substring matching. Each
 * match gets a small numbered tag so the student can trace it back to the
 * matching "Warum?" card (see EvidenceBlock's triggerLabel).
 *
 * Items whose evidenceText can't be found verbatim in text are silently
 * skipped — never crashes the page. Content authoring keeps evidence_text
 * as a genuine quote from the source; scripts/learning-aids/verify-evidence-
 * substrings.mjs checks this across the DB separately.
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

export function HighlightedText({ text, items, className }: Props) {
  const matches: Match[] = [];
  for (const item of items) {
    if (!item.evidenceText) continue;
    const start = text.indexOf(item.evidenceText);
    if (start === -1) continue;
    const end = start + item.evidenceText.length;
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
