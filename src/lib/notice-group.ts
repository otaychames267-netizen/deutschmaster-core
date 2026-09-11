import { NOTICE_TEXT } from "@/lib/admin/exercise-create.functions";
import { SHOW_UNRELEASED_CONTENT } from "@/lib/features";

export { NOTICE_TEXT };

/** Splits a fetched, already-ordered exercise list into "regular" (no
 * Tunisia-notice flag) and "flagged" ones.
 *
 * By default (reveal=false, the SHOW_UNRELEASED_CONTENT constant) flagged
 * items are dropped from `ordered` entirely — callers render `hiddenCount`
 * as a "Coming Soon" notice instead of listing them, per the launch
 * decision to keep not-yet-in-Tunisia content out of the catalog rather
 * than merely deprioritized. Pass `{ reveal: true }` (HoerenTeilPage does
 * this for teil 1 only) to keep the old behavior: flagged items appended
 * after `flaggedStartIndex`, fully visible and interactive. */
export function orderWithNoticeGroup<T extends { import_notes?: string | null }>(
  items: T[],
  opts?: { reveal?: boolean },
): { ordered: T[]; flaggedStartIndex: number; hiddenCount: number } {
  const regular: T[] = [];
  const flagged: T[] = [];
  for (const item of items) {
    if (item.import_notes && item.import_notes.includes(NOTICE_TEXT)) flagged.push(item);
    else regular.push(item);
  }
  const reveal = opts?.reveal ?? SHOW_UNRELEASED_CONTENT;
  if (reveal) {
    return { ordered: [...regular, ...flagged], flaggedStartIndex: regular.length, hiddenCount: 0 };
  }
  return { ordered: regular, flaggedStartIndex: regular.length, hiddenCount: flagged.length };
}
