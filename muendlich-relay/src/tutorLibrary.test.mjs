// Unit test (no network): the 1:1 tutor speaks only the professional ("formal") register, and every cached lead / closing line it can pick has a v4 Turbo clip
// for every examiner voice (needs the locally generated audio-library/tutor-v4 — skipped with a notice when it has not been generated on this machine).
//   npx tsx src/tutorLibrary.test.mjs
import { pickSoloSectionTransition12Line, pickSoloSectionTransition23Line, getSoloExamEndPool, getSoloTransitionLeadPhrases, TUTOR_PHRASE_STYLE } from "./examinerPhrases.ts";
import { findTutorV4Asset } from "./voice/phraseLibrary/libraryStore.ts";
import { getPool, voiceProvider } from "./voice/voicePools.ts";
import { TUTOR_EXAMINER_POOL } from "./voice/voicePools.ts";
import { existsSync } from "node:fs";

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

const examiners = getPool(TUTOR_EXAMINER_POOL).filter((v) => voiceProvider(v) === "elevenlabs");
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


// Owner 2026-10-09: professional, relatively long, strong sentences — no casual or curt wording, for every voice that speaks formal (the Qwen voices always do).
{
  const { getScriptedLeadPhrases } = await import("./examinerPhrases.ts");
  const { assignPhraseStyle } = await import("./voice/phraseLibrary/voiceStyle.ts");
  const formalLeads = getScriptedLeadPhrases().filter((p) => p.style === "formal");
  ok("formal fixed leads are long (>= 90 characters, two sentences or more)", formalLeads.length >= 20 && formalLeads.every((p) => p.text.length >= 90), `(${formalLeads.length} leads, shortest ${Math.min(...formalLeads.map((p) => p.text.length))})`);
  ok("no casual/curt wording in the formal fixed leads", formalLeads.every((p) => !/legen wir los|geht's|Gut gemacht|Das war's|So, dann|geschafft|locker|einfach drauflos/i.test(p.text)));
  ok("every Qwen (DeepInfra) voice always speaks the formal register", getPool(TUTOR_EXAMINER_POOL).filter((v) => voiceProvider(v) === "deepinfra").every((v) => assignPhraseStyle(v.voiceId) === "formal"));
  const { getFixedPool } = await import("./voice/phraseLibrary/fixedPhrases.ts");
  for (const cat of ["welcome", "exam_end"]) {
    const f = getFixedPool(cat).filter((p) => p.style === "formal");
    ok(`formal ${cat} lines are long and professional (>= 150 chars)`, f.length >= 8 && f.every((p) => p.text.length >= 150), `(${f.length}, shortest ${Math.min(...f.map((p) => p.text.length))})`);
  }
}

const haveLibrary = existsSync(new URL("../audio-library/tutor-v4/manifest.json", import.meta.url));
if (!haveLibrary) {
  console.log("SKIP  audio-library/tutor-v4 not generated on this machine (npx tsx src/voice/phraseLibrary/generateTutorLibrary.ts)");
} else {
  // The clips of the provider the owner chose (DeepInfra / Qwen) must exist for every lead and closing line AND carry the CURRENT wording.
  const qwen = getPool(TUTOR_EXAMINER_POOL).filter((v) => voiceProvider(v) === "deepinfra");
  let missing = 0, stale = 0;
  for (const v of qwen) {
    for (const l of leads) { const a = await findTutorV4Asset("scripted_lead", v.voiceId, l.id); if (!a) missing++; else if (a.asset.text !== l.text) stale++; }
    for (const e of ends) { const a = await findTutorV4Asset("exam_end", v.voiceId, e.id); if (!a) missing++; else if (a.asset.text !== e.text) stale++; }
  }
  ok(`every lead and closing line has a clip with the current wording for all ${qwen.length} Qwen examiner voices`, qwen.length === 10 && missing === 0 && stale === 0, `(${missing} missing, ${stale} stale)`);
  // Other providers (ElevenLabs / Azure / Inworld) are not the active provider: clips generated for an older wording are ignored at runtime (the session compares the text), so this is only a notice.
  let other = 0;
  for (const v of getPool(TUTOR_EXAMINER_POOL).filter((x) => voiceProvider(x) !== "deepinfra")) {
    for (const l of leads) { const a = await findTutorV4Asset("scripted_lead", v.voiceId, l.id); if (!a || a.asset.text !== l.text) other++; }
  }
  console.log(`NOTE  ${other} lead clips of the ElevenLabs/Azure/Inworld voices are missing or were generated for an older wording (not played; the line is spoken live) — regenerate with generateTutorLibrary.ts only if one of those providers is used again`);
}

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
