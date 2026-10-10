// Unit test (no network): the 1:1 tutor's adaptive "answer finished" silence.   npx tsx src/tutorTiming.test.mjs
import { tutorFinishSilenceMs } from "./tutorTiming.ts";
let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };
for (const k of ["MUENDLICH_TUTOR_FINISH_SILENCE_MS", "MUENDLICH_TUTOR_LONG_ANSWER_MS", "MUENDLICH_TUTOR_SHORT_ANSWER_EXTRA_MS"]) delete process.env[k];

ok("a long answer (>= 6 s of speech) is finished after 2.5 s of silence", tutorFinishSilenceMs(6_000) === 2_500 && tutorFinishSilenceMs(20_000) === 2_500);
ok("a short or hesitant answer waits 1.5 s longer (4 s, the previous fixed value)", tutorFinishSilenceMs(0) === 4_000 && tutorFinishSilenceMs(5_999) === 4_000);
ok("never longer than the old fixed 4 s, never shorter than 2.5 s", [0, 1000, 5999, 6000, 30000].every((ms) => tutorFinishSilenceMs(ms) >= 2_500 && tutorFinishSilenceMs(ms) <= 4_000));
process.env.MUENDLICH_TUTOR_FINISH_SILENCE_MS = "1800"; process.env.MUENDLICH_TUTOR_LONG_ANSWER_MS = "3000"; process.env.MUENDLICH_TUTOR_SHORT_ANSWER_EXTRA_MS = "1000";
ok("the three env variables override the defaults", tutorFinishSilenceMs(3_000) === 1_800 && tutorFinishSilenceMs(2_999) === 2_800);
process.env.MUENDLICH_TUTOR_FINISH_SILENCE_MS = "abc"; ok("a garbage value falls back to the default", tutorFinishSilenceMs(10_000) === 2_500);
for (const k of ["MUENDLICH_TUTOR_FINISH_SILENCE_MS", "MUENDLICH_TUTOR_LONG_ANSWER_MS", "MUENDLICH_TUTOR_SHORT_ANSWER_EXTRA_MS"]) delete process.env[k];

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
