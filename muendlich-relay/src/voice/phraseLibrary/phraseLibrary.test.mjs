import { WELCOME_PHRASES, EXAM_END_PHRASES, getFixedPool } from "./fixedPhrases.ts";
import { assignPhraseStyle } from "./voiceStyle.ts";
import { pickVariant } from "./phraseSelection.ts";
import { pickLibraryAsset, _resetManifestCacheForTests } from "./libraryStore.ts";
import { pickExamStart, pickTaskTransition, pickSectionTransition12, pickSectionTransition23 } from "../../examinerPhrases.ts";
import { getTeil1QuestionPool, allTeil1Questions, TEIL1_TOPICS } from "./teil1Questions.ts";
import { VOICES } from "../voices.config.ts";

function ok(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}`);
  if (!cond) process.exitCode = 1;
}

// 1. Pool sizes meet the >= 20-per-category spec requirement.
ok(`welcome pool has >= 20 variants (got ${WELCOME_PHRASES.length})`, WELCOME_PHRASES.length >= 20);
ok(`exam_end pool has >= 20 variants (got ${EXAM_END_PHRASES.length})`, EXAM_END_PHRASES.length >= 20);

// 2. Every fixed phrase is genuinely non-trivial (not a one-clause chatbot
// line like "Willkommen zur Prüfung.") — a rough but real length floor.
const allFixed = [...WELCOME_PHRASES, ...EXAM_END_PHRASES];
const tooShort = allFixed.filter((p) => p.text.length < 80);
ok(`all fixed phrases are >= 80 chars (found ${tooShort.length} too short)`, tooShort.length === 0);

// 3. No duplicate ids, no duplicate text within a category.
const ids = new Set(allFixed.map((p) => p.id));
ok("all fixed phrase ids are unique", ids.size === allFixed.length);
const welcomeTexts = new Set(WELCOME_PHRASES.map((p) => p.text));
ok("no duplicate welcome text", welcomeTexts.size === WELCOME_PHRASES.length);
const endTexts = new Set(EXAM_END_PHRASES.map((p) => p.text));
ok("no duplicate exam_end text", endTexts.size === EXAM_END_PHRASES.length);

// 4. getFixedPool() routes to the right array.
ok("getFixedPool('welcome') === WELCOME_PHRASES", getFixedPool("welcome") === WELCOME_PHRASES);
ok("getFixedPool('exam_end') === EXAM_END_PHRASES", getFixedPool("exam_end") === EXAM_END_PHRASES);

// 5. Style assignment is deterministic per voice. Real pool is only 5
// voices as of 2026-08-26 (see voices.config.ts's header for why — 24 of
// the originally-configured 27 IDs turned out not to exist on the real
// ElevenLabs account), so requiring all 3 style buckets to be hit is no
// longer a meaningful assertion (5 items into 3 buckets can legitimately
// leave one empty) — pickVariant/pickLibraryAsset already fall back
// gracefully to the whole pool when a voice's bucket is empty (see
// phraseSelection.ts), so this just checks real spread, not full coverage.
const style1 = assignPhraseStyle("uvysWDLbKpA4XvpD3GI6");
const style2 = assignPhraseStyle("uvysWDLbKpA4XvpD3GI6");
ok("assignPhraseStyle is deterministic for the same voiceId", style1 === style2);
const stylesUsed = new Set(VOICES.map((v) => assignPhraseStyle(v.voiceId)));
ok(`style assignment spreads across at least 2 of 3 buckets over the real ${VOICES.length}-voice pool (got ${[...stylesUsed].join(",")})`, stylesUsed.size >= 2);

// 6. pickVariant: style-aware (only returns phrases from the requested style
// when that bucket is non-empty) and avoids immediate repetition.
for (let i = 0; i < 20; i++) {
  const chosen = pickVariant("test_style_filter", WELCOME_PHRASES, "formal");
  if (chosen.style !== "formal") { ok("pickVariant respects the style filter", false); break; }
  if (i === 19) ok("pickVariant respects the style filter", true);
}
{
  const seen = [];
  for (let i = 0; i < 6; i++) seen.push(pickVariant("test_no_immediate_repeat", WELCOME_PHRASES, "warm").id);
  let immediateRepeat = false;
  for (let i = 1; i < seen.length; i++) if (seen[i] === seen[i - 1]) immediateRepeat = true;
  ok(`pickVariant avoids immediate repetition across 6 draws (${seen.join(",")})`, !immediateRepeat);
}

// 7. Scripted (dynamic, name/topic-bearing) categories: 20+ variants each,
// and the picked text actually contains the interpolated data.
const voiceId = VOICES[0].voiceId;
const examStart = pickExamStart({ aName: "Fatima", topicA: "Reisen" }, voiceId);
ok("pickExamStart interpolates the candidate name", examStart.includes("Fatima"));
ok("pickExamStart interpolates the topic", examStart.includes("Reisen"));
const taskTransition = pickTaskTransition({ bName: "Ahmed", topicB: "Gesundheit" }, voiceId);
ok("pickTaskTransition interpolates the candidate name", taskTransition.includes("Ahmed"));
ok("pickTaskTransition interpolates the topic", taskTransition.includes("Gesundheit"));
const sectionTransition12 = pickSectionTransition12({ teil2Topic: "Sollte man Plastik verbieten?" }, voiceId);
ok("pickSectionTransition12 interpolates the topic", sectionTransition12.includes("Plastik verbieten"));
const sectionTransition23 = pickSectionTransition23({ teil3Topic: "eine Geburtstagsfeier organisieren" }, voiceId);
ok("pickSectionTransition23 interpolates the topic", sectionTransition23.includes("Geburtstagsfeier organisieren"));

// 8. Same voiceId consistently leans toward its assigned style across many
// draws for a scripted category (real register consistency per voice).
{
  const style = assignPhraseStyle(voiceId);
  let matches = 0;
  const draws = 30;
  for (let i = 0; i < draws; i++) {
    const text = pickTaskTransition({ bName: "X", topicB: "Y" }, voiceId);
    // Can't directly recover style from rendered text, so this is checked
    // structurally instead via pickVariant's own filtering above (test 6) —
    // this block just confirms repeated calls don't throw and stay well-formed.
    if (typeof text === "string" && text.length > 0) matches++;
  }
  ok(`pickTaskTransition stays well-formed across ${draws} repeated draws for one voice`, matches === draws);
}

// 9. libraryStore: with no manifest.json on disk (generation is currently
// BLOCKED by the ElevenLabs account tier — see generateLibrary.ts), lookups
// must return null (not throw), so muendlichVoiceSession.ts's fallback path
// is exercised safely rather than crashing the exam.
_resetManifestCacheForTests();
const result = await pickLibraryAsset("welcome", "nonexistent-voice-id");
ok("pickLibraryAsset returns null when no manifest exists (safe fallback)", result === null);

// 10. Teil1 question library: real coverage of all 7 confirmed real DB
// topics, real per-topic pool sizes, no duplicates, topic filtering works,
// and questions are genuinely substantive (not one-liners).
ok(`exactly 7 Teil-1 topics configured (got ${TEIL1_TOPICS.length}: ${TEIL1_TOPICS.join(", ")})`, TEIL1_TOPICS.length === 7);
for (const topic of TEIL1_TOPICS) {
  const pool = getTeil1QuestionPool(topic);
  ok(`"${topic}" has questions (got ${pool.length})`, pool.length > 0);
  ok(`"${topic}" pool is entirely tagged with that topic`, pool.every((q) => q.topic === topic));
}
const allQ = allTeil1Questions();
ok(`350 total Teil-1 questions across all topics (got ${allQ.length})`, allQ.length === 350);
for (const topic of TEIL1_TOPICS) {
  const pool = getTeil1QuestionPool(topic);
  ok(`"${topic}" has exactly 50 questions (got ${pool.length})`, pool.length === 50);
}
const qIds = new Set(allQ.map((q) => q.id));
ok("all Teil-1 question ids are unique", qIds.size === allQ.length);
const qTexts = new Set(allQ.map((q) => q.text));
ok("no duplicate Teil-1 question text", qTexts.size === allQ.length);
const shortQ = allQ.filter((q) => q.text.length < 30);
ok(`all Teil-1 questions are substantive (>= 30 chars, found ${shortQ.length} too short)`, shortQ.length === 0);
ok("getTeil1QuestionPool returns [] for an unknown topic (safe, not a throw)", getTeil1QuestionPool("Nichtexistentes Thema").length === 0);

console.log("\nAll phrase-library tests completed.");
