// Unit test (no network): the 1:1 tutor speaks only the professional ("formal") register, and every cached lead / closing line it can pick has a v4 Turbo clip
// for every examiner voice (needs the locally generated audio-library/tutor-v4 — skipped with a notice when it has not been generated on this machine).
//   npx tsx src/tutorLibrary.test.mjs
import { pickSoloSectionTransition12Line, pickSoloSectionTransition23Line, getSoloExamEndPool, getSoloTransitionLeadPhrases, TUTOR_PHRASE_STYLE } from "./examinerPhrases.ts";
import { findTutorV4Asset } from "./voice/phraseLibrary/libraryStore.ts";
import { getPool } from "./voice/voicePools.ts";
import { TUTOR_EXAMINER_POOL } from "./voice/voicePools.ts";
import { existsSync } from "node:fs";

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

const examiners = getPool(TUTOR_EXAMINER_POOL);
ok("10 examiner voices", examiners.length === 10);

// Every voice gets formal wording, whatever its hashed style bucket would be.
let allFormal = true, picks = 0;
for (const v of examiners) for (let i = 0; i < 40; i++) {
  for (const l of [pickSoloSectionTransition12Line({ teil2Topic: "Freizeit" }, v.voiceId), pickSoloSectionTransition23Line({ teil3Topic: "eine Feier" }, v.voiceId)]) {
    picks++; if (!/_formal_/.test(l.id)) allFormal = false;
    if (/beide|beiden|miteinander|Sie beide|Präsentationen/i.test(l.full)) allFormal = false; // still readable for ONE student
  }
}
ok(`all ${picks} picked transitions are formal and solo-readable`, allFormal);

const leads = getSoloTransitionLeadPhrases();
ok("formal solo lead phrases exist for both transitions", leads.some((l) => l.id.startsWith("section_transition12_")) && leads.some((l) => l.id.startsWith("section_transition23_")), `(${leads.length})`);
const ends = getSoloExamEndPool().filter((p) => p.style === TUTOR_PHRASE_STYLE);
ok("formal closing lines exist and read for one student", ends.length >= 4 && ends.every((p) => !/beide|beiden|miteinander|Präsentationen/i.test(p.text)), `(${ends.length})`);

if (!existsSync(new URL("../audio-library/tutor-v4/manifest.json", import.meta.url))) {
  console.log("SKIP  audio-library/tutor-v4 not generated on this machine (npx tsx src/voice/phraseLibrary/generateTutorLibrary.ts)");
} else {
  let missing = 0;
  for (const v of examiners) {
    for (const l of leads) if (!(await findTutorV4Asset("scripted_lead", v.voiceId, l.id))) missing++;
    for (const e of ends) if (!(await findTutorV4Asset("exam_end", v.voiceId, e.id))) missing++;
  }
  ok("every lead and closing line has a clip for every examiner voice", missing === 0, `(${missing} missing)`);
}

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
