/**
 * VoiceManager — assigns an ElevenLabs voice to a Mündlich exam session and
 * keeps that assignment stable for the session's lifetime.
 *
 * Assignment key is the exam SESSION (muendlich_exam_sessions.id), not the
 * raw user id. Two reasons:
 *   1. The examiner is ONE shared persona both candidates in a room hear —
 *      there's no per-candidate examiner voice to assign, so per-user
 *      keying doesn't map onto how the feature actually works.
 *   2. The product requirement is explicitly "stable during a session,
 *      free to rotate between sessions" — keying on the session id gives
 *      that for free: the same session always resolves to the same voice
 *      (idempotent — reconnect-safe), and a user's NEXT exam attempt (a
 *      new session id) gets a fresh, independently-computed assignment
 *      instead of hearing the identical examiner forever.
 *
 * Algorithm: deterministic primary pick (stable hash of the session id →
 * pool index) with bounded load-balancing — if the deterministic pick's
 * recent usage is meaningfully above the pool's current minimum, linear-
 * probe forward through the pool (still deterministic, not random) until
 * landing on a less-overused voice or exhausting the pool. This keeps
 * assignment reproducible and debuggable (same session id always starts
 * probing from the same point) while satisfying "don't let one voice get
 * disproportionately overused" as real traffic accumulates.
 */
import type { VoiceProfile } from "./voiceProfiles.js";

export interface VoiceAssignmentStore {
  /** Existing assignment for this (sessionKey, characterId), if any. */
  get(sessionKey: string, characterId: string): Promise<string | null>;
  /** Persist a new assignment. Idempotent — safe to call even if one already exists. */
  set(sessionKey: string, characterId: string, voiceId: string): Promise<void>;
  /** Recent usage count per voice id, for load-balancing. Missing ids = 0. */
  getUsageCounts(voiceIds: string[]): Promise<Record<string, number>>;
}

/** Bounded-load threshold: only deviate from the deterministic pick if it's
 * used at least this many more times than the pool's current minimum.
 * Small pools (27 voices today) shouldn't be perturbed by every single
 * assignment — this only kicks in once real imbalance accumulates. */
const LOAD_IMBALANCE_THRESHOLD = 3;

/** FNV-1a — fast, dependency-free, good-enough distribution for this use
 * (not a security context, just needs to spread session ids evenly across
 * the pool). */
function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Pure, dependency-free selection logic — the part that actually needs to
 * be correct and is worth unit-testing without a database or network. */
export function selectVoiceId(
  sessionKey: string,
  pool: VoiceProfile[],
  usageCounts: Record<string, number>,
): string {
  if (pool.length === 0) throw new Error("selectVoiceId: pool is empty");
  const startIndex = stableHash(sessionKey) % pool.length;
  const minUsage = Math.min(...pool.map((v) => usageCounts[v.voiceId] ?? 0));

  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = pool[(startIndex + offset) % pool.length];
    const usage = usageCounts[candidate.voiceId] ?? 0;
    if (usage - minUsage < LOAD_IMBALANCE_THRESHOLD) return candidate.voiceId;
  }
  // Every candidate is equally (im)balanced — fall back to the deterministic pick.
  return pool[startIndex].voiceId;
}

export class VoiceManager {
  constructor(
    private pool: VoiceProfile[],
    private store: VoiceAssignmentStore,
    /** In-memory, per-process only — voices marked unavailable after a live
     * failure (see markUnavailable). Not persisted: a transient ElevenLabs
     * error shouldn't permanently blacklist a voice across process
     * restarts, only for the remainder of this process's uptime. */
    private unavailable = new Set<string>(),
  ) {}

  private availablePool(): VoiceProfile[] {
    const pool = this.pool.filter((v) => v.enabled && !this.unavailable.has(v.voiceId));
    if (pool.length === 0) throw new Error("VoiceManager: no available voices in pool (all disabled or marked unavailable)");
    return pool;
  }

  /** Get-or-create the voice assignment for a session. Idempotent — calling
   * this twice for the same sessionKey (e.g. on reconnect) returns the same
   * voice, never reassigns mid-session. */
  async assignVoice(sessionKey: string, characterId: string): Promise<VoiceProfile> {
    const existing = await this.store.get(sessionKey, characterId);
    const pool = this.availablePool();
    if (existing) {
      const found = pool.find((v) => v.voiceId === existing);
      if (found) return found;
      // Persisted voice is no longer available (disabled/marked unavailable
      // since it was assigned) — fall through and pick a fresh one, but log
      // so this is visible rather than silently swapping mid-session.
      console.warn(`[voice] session ${sessionKey}: previously assigned voice ${existing} is no longer available, reassigning`);
    }

    const usageCounts = await this.store.getUsageCounts(pool.map((v) => v.voiceId));
    const voiceId = selectVoiceId(sessionKey, pool, usageCounts);
    await this.store.set(sessionKey, characterId, voiceId);
    const profile = pool.find((v) => v.voiceId === voiceId)!;
    console.log(`[voice] session ${sessionKey}: assigned voice ${voiceId} (character=${characterId})`);
    return profile;
  }

  /** Called when ElevenLabs actually rejects a voice (invalid id, voice
   * removed, etc.) mid-use. Marks it unavailable for the rest of this
   * process's lifetime and returns a fresh replacement for the same
   * session — the caller re-persists the new assignment via assignVoice. */
  async reassignAfterFailure(sessionKey: string, characterId: string, failedVoiceId: string): Promise<VoiceProfile> {
    console.error(`[voice] voice ${failedVoiceId} failed for session ${sessionKey}, marking unavailable and falling back`);
    this.unavailable.add(failedVoiceId);
    return this.assignVoice(sessionKey, characterId);
  }
}
