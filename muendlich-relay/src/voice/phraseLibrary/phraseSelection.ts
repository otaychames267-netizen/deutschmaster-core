/**
 * Style-aware, non-repeating phrase selection — shared by both the fixed
 * (audio-library) categories and the scripted (text-template) categories,
 * so there's one variety mechanism instead of five near-duplicates.
 *
 * Two variety guarantees, both pure in-memory (no ElevenLabs call, no DB
 * read — selection itself never costs anything):
 *   1. Prefer the voice's assigned style bucket (see voiceStyle.ts) so the
 *      same examiner voice doesn't randomly flip register between formal/
 *      warm/calm from one exam to the next.
 *   2. Avoid the last few variants used FOR THAT CATEGORY, tracked at
 *      process (module) scope — not per-participant. A true per-participant
 *      "never repeat what THIS student has heard before" history would need
 *      a DB read per selection; tracked here as a known, deliberate
 *      simplification (mirrors examinerPhrases.ts's original single-
 *      last-index approach, extended to a short history since these pools
 *      are now larger). Resets on relay restart — fine for a naturalness
 *      feature, not a correctness one.
 */

const RECENT_HISTORY_SIZE = 3;
const recentlyUsed = new Map<string, string[]>(); // category -> recent phrase ids, most recent last

export function pickVariant<T extends { id: string; style: string }>(category: string, pool: T[], style: string): T {
  const styled = pool.filter((p) => p.style === style);
  const candidates = styled.length > 0 ? styled : pool; // graceful fallback if a style bucket is ever empty
  const recent = recentlyUsed.get(category) ?? [];
  const fresh = candidates.filter((c) => !recent.includes(c.id));
  const pickFrom = fresh.length > 0 ? fresh : candidates; // all recently used -> allow repeats rather than throw
  const chosen = pickFrom[Math.floor(Math.random() * pickFrom.length)];

  const nextRecent = [...recent, chosen.id].slice(-RECENT_HISTORY_SIZE);
  recentlyUsed.set(category, nextRecent);
  return chosen;
}
