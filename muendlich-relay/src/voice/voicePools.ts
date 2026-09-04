/**
 * Voice pools group profiles by character/role. Today there is exactly one
 * AI persona in the app (the Mündlich examiner), so exactly one pool exists
 * — but the shape supports adding more later (e.g. a distinct pool for a
 * future "conversation partner" character) without changing the
 * VoiceManager: pools are resolved by filtering VOICES on `enabled` and
 * pool membership, not hardcoded per-character lists.
 *
 * A voice with no `pools` field is treated as belonging to every pool it
 * hasn't been explicitly excluded from would be over-engineering right now
 * with only one pool — so the simpler rule is: no `pools` field = member of
 * the default "examiner" pool. Once a voice is explicitly tagged with
 * `pools: [...]`, only those pools apply.
 */
import { VOICES } from "./voices.config.js";
import type { VoiceProfile } from "./voiceProfiles.js";

export const EXAMINER_POOL = "examiner";

export function getPool(poolId: string): VoiceProfile[] {
  return VOICES.filter((v) => v.enabled && (v.pools ? v.pools.includes(poolId) : poolId === EXAMINER_POOL));
}
