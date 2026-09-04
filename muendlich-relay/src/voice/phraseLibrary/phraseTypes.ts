/**
 * Shared types for the fixed-phrase system: the FIVE categories the product
 * spec asks for (welcome, exam_start, section_transition, task_transition,
 * exam_end), each written in three register/"style" buckets so different
 * examiner voices don't all sound the same (see voiceStyle.ts).
 *
 * Two of the five categories (welcome, exam_end) never need per-exam data
 * (no candidate name, no topic) — those are eligible for true
 * pre-generated, zero-runtime-TTS-cost audio (fixedPhrases.ts +
 * generateLibrary.ts). The other three (exam_start, task_transition,
 * section_transition) inherently carry per-exam text — a candidate's real
 * name, a real topic string — which cannot be baked into a fixed audio file
 * without re-generating it per exam (defeating the point of a reusable
 * library). Those stay as fully pre-written TEXT templates
 * (examinerPhrases.ts) that skip the Claude round-trip entirely (the
 * wording is 100% predetermined, so asking an LLM to "say exactly this
 * sentence" was always pure overhead) but still go through a real,
 * short, dynamic TTS synthesis — see voice/README.md for the full
 * cost-model writeup of this split.
 */

export type PhraseStyle = "formal" | "warm" | "calm";

// FixedPhraseCategory = the categories playLibraryPhrase()/getFixedPool()
// handle: no extra selection axis beyond (category, voice). "teil1_question"
// is deliberately NOT part of this union — it needs a topic too (7 Teil-1
// topics), so it always goes through the dedicated playTeil1Question()/
// getTeil1QuestionPool() path instead, never the topic-less one. See
// LibraryCategory below for the broader union the audio-library machinery
// (generateLibrary.ts, libraryStore.ts, PhraseAudioAsset) actually spans.
export type FixedPhraseCategory = "welcome" | "exam_end";
export type ScriptedPhraseCategory = "exam_start" | "task_transition" | "section_transition";
export type PhraseCategory = FixedPhraseCategory | ScriptedPhraseCategory;

/** Every category the pre-generated audio library (generateLibrary.ts,
 * libraryStore.ts) can hold — broader than FixedPhraseCategory because it
 * also includes "teil1_question" (topic-keyed — see teil1Questions.ts's
 * header for why it can't just join FixedPhraseCategory). */
export type LibraryCategory = FixedPhraseCategory | "teil1_question";

export interface FixedPhrase {
  id: string;
  category: FixedPhraseCategory;
  style: PhraseStyle;
  text: string;
  /** Set only for teil1_question — which of the 7 Teil-1 topics this
   * question belongs to. Undefined for welcome/exam_end, which have no
   * topic axis. */
  topic?: string;
}

/** One pre-generated audio asset for a (phrase, voice) pair. `pcmPath` is
 * relative to muendlich-relay/audio-library/. Raw PCM16 mono @ 24kHz — the
 * exact wire format the client already expects (server.ts's protocol
 * comment: "audio, data: <base64 pcm16 24kHz>") — chosen specifically so
 * playback needs zero server-side transcoding at runtime, trading a larger
 * on-disk footprint (uncompressed) for simplicity and zero new
 * dependencies (no MP3 decoder). See generateLibrary.ts's header for the
 * full tradeoff writeup. */
export interface PhraseAudioAsset {
  phraseId: string;
  category: LibraryCategory;
  style: PhraseStyle;
  voiceId: string;
  text: string;
  characterCount: number;
  pcmPath: string;
  generatedAt: string;
  /** Set only for teil1_question assets — see FixedPhrase.topic. */
  topic?: string;
}
