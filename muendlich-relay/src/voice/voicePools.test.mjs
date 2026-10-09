// Unit test (no network): the voice pools — 2:1 exam room keeps its original 5 voices, the 1:1 tutor has 10 examiner + 10 partner voices, no overlap.
//   npx tsx src/voice/voicePools.test.mjs
import { getPool, getTutorPool, voiceProvider, EXAMINER_POOL, TUTOR_EXAMINER_POOL, TUTOR_PARTNER_POOL } from "./voicePools.ts";
import { VOICES } from "./voices.config.ts";

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

const ids = (pool) => getPool(pool).map((v) => v.voiceId);
const eleven = (pool) => getPool(pool).filter((v) => voiceProvider(v) === "elevenlabs").map((v) => v.voiceId);
const azure = (pool) => getPool(pool).filter((v) => voiceProvider(v) === "azure").map((v) => v.voiceId);
const exam = ids(EXAMINER_POOL), tutorEx = eleven(TUTOR_EXAMINER_POOL), tutorPa = eleven(TUTOR_PARTNER_POOL);

ok("2:1 exam room pool is unchanged (the original 5 voices)", exam.length === 5, `(${exam.length})`);
ok("2:1 pool = Leonie, Daniel, Lena, Mila Winter, Kerstin", ["Leonie", "Daniel", "Lena", "Mila Winter", "Kerstin"].every((n) => getPool(EXAMINER_POOL).some((v) => v.name === n)));
ok("1:1 ElevenLabs examiner pool has 10 voices", tutorEx.length === 10, `(${tutorEx.length})`);
ok("1:1 Azure examiner pool = the two German DragonHD voices", azure(TUTOR_EXAMINER_POOL).join() === "de-DE-Seraphina:DragonHDLatestNeural,de-DE-Florian:DragonHDLatestNeural");
ok("1:1 Azure partner pool has 4 neural voices, none of them an examiner", azure(TUTOR_PARTNER_POOL).length === 4 && azure(TUTOR_PARTNER_POOL).every((id) => !azure(TUTOR_EXAMINER_POOL).includes(id)));
ok("getTutorPool: default provider is ElevenLabs (10 + 10)", getTutorPool(TUTOR_EXAMINER_POOL).length === 10 && getTutorPool(TUTOR_PARTNER_POOL).length === 10);
process.env.TUTOR_TTS_PROVIDER = "azure"; delete process.env.AZURE_SPEECH_KEY; delete process.env.AZURE_SPEECH_REGION;
ok("getTutorPool: provider=azure without the Azure key falls back to ElevenLabs", getTutorPool(TUTOR_EXAMINER_POOL).length === 10 && getTutorPool(TUTOR_EXAMINER_POOL).every((v) => voiceProvider(v) === "elevenlabs"));
process.env.AZURE_SPEECH_KEY = "k"; process.env.AZURE_SPEECH_REGION = "westeurope";
ok("getTutorPool: provider=azure with the key gives only Azure voices", getTutorPool(TUTOR_EXAMINER_POOL).length === 2 && getTutorPool(TUTOR_PARTNER_POOL).length === 4 && [...getTutorPool(TUTOR_EXAMINER_POOL), ...getTutorPool(TUTOR_PARTNER_POOL)].every((v) => voiceProvider(v) === "azure"));
delete process.env.TUTOR_TTS_PROVIDER;
const inworld = (pool) => getPool(pool).filter((v) => voiceProvider(v) === "inworld").map((v) => v.voiceId);
const inworldNames = [...inworld(TUTOR_EXAMINER_POOL), ...inworld(TUTOR_PARTNER_POOL)].map((id) => id.replace("inworld:", ""));
ok("1:1 Inworld pools: 6 examiners + 6 partners, no overlap", inworld(TUTOR_EXAMINER_POOL).length === 6 && inworld(TUTOR_PARTNER_POOL).length === 6 && inworld(TUTOR_EXAMINER_POOL).every((id) => !inworld(TUTOR_PARTNER_POOL).includes(id)));
ok("owner veto: Reinhard, Kilian, Josef, Hendrik, Johanna are never configured", ["Reinhard", "Kilian", "Josef", "Hendrik", "Johanna"].every((n) => !inworldNames.includes(n)), inworldNames.join(","));
process.env.TUTOR_TTS_PROVIDER = "inworld"; delete process.env.INWORLD_API_KEY;
ok("getTutorPool: provider=inworld without the key falls back to ElevenLabs", getTutorPool(TUTOR_EXAMINER_POOL).every((v) => voiceProvider(v) === "elevenlabs") && getTutorPool(TUTOR_EXAMINER_POOL).length === 10);
process.env.INWORLD_API_KEY = "k";
ok("getTutorPool: provider=inworld with the key gives only Inworld voices", getTutorPool(TUTOR_EXAMINER_POOL).length === 6 && getTutorPool(TUTOR_PARTNER_POOL).length === 6 && [...getTutorPool(TUTOR_EXAMINER_POOL), ...getTutorPool(TUTOR_PARTNER_POOL)].every((v) => voiceProvider(v) === "inworld"));
delete process.env.TUTOR_TTS_PROVIDER; delete process.env.INWORLD_API_KEY;
ok("1:1 ElevenLabs partner pool has 10 voices", tutorPa.length === 10, `(${tutorPa.length})`);
ok("examiner and partner pools do not overlap", tutorEx.every((id) => !tutorPa.includes(id)));
ok("Leonie is the first examiner in the list", getPool(TUTOR_EXAMINER_POOL)[0]?.name === "Leonie");
ok("all voice ids are unique", new Set(VOICES.map((v) => v.voiceId)).size === VOICES.length);
ok("every voice has name, gender, language de", VOICES.every((v) => v.name && v.gender && v.language === "de"));
ok("no new voice leaked into the 2:1 pool", VOICES.filter((v) => v.pools && !v.pools.includes("examiner")).every((v) => !exam.includes(v.voiceId)));

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
