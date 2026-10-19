// Unit test (no network): the 1:1 tutor's speculate / hold silence thresholds.   npx tsx src/tutorTiming.test.mjs
import { tutorSpeculateSilenceMs, tutorHoldSilenceMs, tutorAnswerWindowExpired, roomStageEndReached, roomTakeoverWindowExpired } from "./tutorTiming.ts";
let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };
const KEYS = ["MUENDLICH_TUTOR_SPECULATE_SILENCE_MS", "MUENDLICH_TUTOR_HOLD_SILENCE_MS", "MUENDLICH_TUTOR_LONG_ANSWER_MS", "MUENDLICH_TUTOR_SHORT_ANSWER_EXTRA_MS"];
for (const k of KEYS) delete process.env[k];

ok("a long answer (>= 6 s of speech) starts preparing after 1.5 s and may be answered after 3.5 s", tutorSpeculateSilenceMs(6_000) === 1_500 && tutorHoldSilenceMs(6_000) === 3_500 && tutorHoldSilenceMs(30_000) === 3_500);
ok("a short or hesitant answer waits 1.0 s longer on both thresholds", tutorSpeculateSilenceMs(0) === 2_500 && tutorHoldSilenceMs(0) === 4_500 && tutorHoldSilenceMs(5_999) === 4_500);
ok("the tutor never speaks before it has been silent for at least as long as it speculated", [0, 1000, 5999, 6000, 30000].every((ms) => tutorHoldSilenceMs(ms) > tutorSpeculateSilenceMs(ms)));
process.env.MUENDLICH_TUTOR_SPECULATE_SILENCE_MS = "1000"; process.env.MUENDLICH_TUTOR_HOLD_SILENCE_MS = "2500"; process.env.MUENDLICH_TUTOR_LONG_ANSWER_MS = "3000"; process.env.MUENDLICH_TUTOR_SHORT_ANSWER_EXTRA_MS = "500";
ok("the four env variables override the defaults", tutorSpeculateSilenceMs(3_000) === 1_000 && tutorHoldSilenceMs(3_000) === 2_500 && tutorHoldSilenceMs(2_999) === 3_000);
process.env.MUENDLICH_TUTOR_HOLD_SILENCE_MS = "abc"; ok("a garbage value falls back to the default", tutorHoldSilenceMs(10_000) === 3_500);
for (const k of KEYS) delete process.env[k];

// the answer window never cuts a sentence in half (owner 2026-10-11)
const W = 40_000;
ok("before the window is over nothing expires", tutorAnswerWindowExpired(39_000, W, 0) === false);
ok("window over and the student already paused -> expires at once (as before)", tutorAnswerWindowExpired(40_500, W, 2_000) === true);
ok("window over but the student is mid-sentence -> waits", tutorAnswerWindowExpired(41_000, W, 300) === false);
ok("keeps waiting while the sentence goes on (up to the grace)", tutorAnswerWindowExpired(50_000, W, 800) === false);
ok("never waits longer than the grace, even for a non-stop talker", tutorAnswerWindowExpired(52_500, W, 100) === true);
process.env.MUENDLICH_TUTOR_WINDOW_GRACE_MS = "5000";
ok("the grace is configurable", tutorAnswerWindowExpired(45_500, W, 100) === true && tutorAnswerWindowExpired(44_000, W, 100) === false);
delete process.env.MUENDLICH_TUTOR_WINDOW_GRACE_MS;

// 2:1 room: the end of a Teil / the closing line never cuts a candidate mid-sentence (owner 2026-10-11)
const S = 360_000;
ok("room: before the Teil's time is up nothing happens", roomStageEndReached(359_000, S, 100) === false);
ok("room: time is up, nobody talking -> the Teil ends at once", roomStageEndReached(360_500, S, 2_000) === true);
ok("room: time is up but a candidate is mid-sentence -> waits", roomStageEndReached(361_000, S, 300) === false);
ok("room: the next natural gap (1.2 s of silence) ends it", roomStageEndReached(366_000, S, 1_300) === true);
ok("room: never waits longer than 12 s", roomStageEndReached(372_500, S, 100) === true && roomStageEndReached(371_000, S, 100) === false);
ok("room takeover window: waits for the addressed candidate to finish, max 10 s", roomTakeoverWindowExpired(31_000, 30_000, 200) === false && roomTakeoverWindowExpired(40_500, 30_000, 200) === true && roomTakeoverWindowExpired(31_000, 30_000, 2_000) === true);

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
