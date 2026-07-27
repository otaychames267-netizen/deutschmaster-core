import { NOTICE_TEXT } from "@/lib/admin/exercise-create.functions";

export { NOTICE_TEXT };

/** Splits a fetched, already-ordered exercise list into "regular" (no
 * Tunisia-notice flag) followed by "flagged" ones, preserving each group's
 * relative order. Returns the reordered list plus the index where the
 * flagged group begins, so callers can render a banner + reset numbering
 * at that boundary without disturbing index-based prev/next navigation. */
export function orderWithNoticeGroup<T extends { import_notes?: string | null }>(
  items: T[],
): { ordered: T[]; flaggedStartIndex: number } {
  const regular: T[] = [];
  const flagged: T[] = [];
  for (const item of items) {
    if (item.import_notes && item.import_notes.includes(NOTICE_TEXT)) flagged.push(item);
    else regular.push(item);
  }
  return { ordered: [...regular, ...flagged], flaggedStartIndex: regular.length };
}
