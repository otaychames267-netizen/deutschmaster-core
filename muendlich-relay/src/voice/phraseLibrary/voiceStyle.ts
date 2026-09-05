/**
 * Maps a voice to a "phrase style" bucket — formal / warm / calm — used to
 * pick which register of pre-written examiner phrasing (see fixedPhrases.ts,
 * examinerPhrases.ts) that voice speaks, so different examiner voices don't
 * all use identical wording for the welcome, transitions, etc.
 *
 * This is a deliberate PLACEHOLDER heuristic, not a claim about the voice's
 * real personality: voiceProfiles.ts's header explains that every
 * descriptive field (personality, style, energy...) is unset because the dev
 * ElevenLabs key lacks `voices_read` permission, so there is no real,
 * independently-verifiable data to assign styles from. Rather than either
 * (a) fabricating personality metadata, or (b) making every voice sound
 * identical while that data is unavailable, this assigns a STABLE,
 * deterministic style per voiceId (same voice always gets the same style,
 * every session, forever) purely so the product gets real register variety
 * across the 27 voices today. Once fetchVoiceMetadata.ts can populate real
 * ElevenLabs voice labels, this should be swapped to derive style from
 * VoiceProfile.personality/style instead — the call site
 * (fixedPhrases.ts / examinerPhrases.ts) doesn't need to change, only this
 * function's body would.
 */
import type { PhraseStyle } from "./phraseTypes.js";

const STYLES: PhraseStyle[] = ["formal", "warm", "calm"];

function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function assignPhraseStyle(voiceId: string): PhraseStyle {
  return STYLES[stableHash(voiceId) % STYLES.length];
}
