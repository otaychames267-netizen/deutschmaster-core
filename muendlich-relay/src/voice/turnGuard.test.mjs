// Unit test (no network): the 1:1 tutor's turn guard.   npx tsx src/voice/turnGuard.test.mjs
import { TurnGuard } from "./turnGuard.ts";
let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };
const opts = { holdSilenceMs: 3000, resumeSpeechMs: 250, maxHoldMs: 12000 };

// the student stopped speaking at t=1000; the guard starts at t=2500 (speculative start after 1.5 s of silence)
let g = new TurnGuard(opts, { lastSpeechAt: 1000, speechMs: 20000 }, 2500);
ok("waits while the silence is shorter than the hold time", g.check({ lastSpeechAt: 1000, speechMs: 20000 }, 3500) === "wait");
ok("opens once the student has been silent for the hold time", g.check({ lastSpeechAt: 1000, speechMs: 20000 }, 4000) === "open");
ok("yields when the student resumes (>= 250 ms of speech)", g.check({ lastSpeechAt: 3600, speechMs: 20300 }, 3700) === "yield");
ok("a single noisy frame (< 250 ms) does not yield", g.check({ lastSpeechAt: 3600, speechMs: 20064 }, 3700) === "wait");
ok("a short blip restarts the silence clock (waits again)", g.check({ lastSpeechAt: 3600, speechMs: 20064 }, 5000) === "wait" && g.check({ lastSpeechAt: 3600, speechMs: 20064 }, 6600) === "open");
ok("resume wins over a simultaneous open", g.check({ lastSpeechAt: 3900, speechMs: 20500 }, 9000) === "yield");

g = new TurnGuard({ ...opts, maxHoldMs: 5000 }, { lastSpeechAt: 1000, speechMs: 0 }, 2000);
ok("never holds longer than maxHoldMs even if the detector keeps flickering", g.check({ lastSpeechAt: 6900, speechMs: 100 }, 7000) === "open");

g = new TurnGuard(opts, { lastSpeechAt: 0, speechMs: 0 }, 5000);
ok("a student who never spoke (lastSpeechAt 0) opens immediately", g.check({ lastSpeechAt: 0, speechMs: 0 }, 5000) === "open");

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
