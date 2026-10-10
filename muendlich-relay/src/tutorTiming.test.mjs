// Unit test (no network): the 1:1 tutor's speculate / hold silence thresholds.   npx tsx src/tutorTiming.test.mjs
import { tutorSpeculateSilenceMs, tutorHoldSilenceMs } from "./tutorTiming.ts";
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

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
