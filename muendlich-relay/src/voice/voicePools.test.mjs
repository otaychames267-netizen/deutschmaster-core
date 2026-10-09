// Unit test (no network): the voice pools — 2:1 exam room keeps its original 5 voices, the 1:1 tutor has 10 examiner + 10 partner voices, no overlap.
//   npx tsx src/voice/voicePools.test.mjs
import { getPool, EXAMINER_POOL, TUTOR_EXAMINER_POOL, TUTOR_PARTNER_POOL } from "./voicePools.ts";
import { VOICES } from "./voices.config.ts";

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

const ids = (pool) => getPool(pool).map((v) => v.voiceId);
const exam = ids(EXAMINER_POOL), tutorEx = ids(TUTOR_EXAMINER_POOL), tutorPa = ids(TUTOR_PARTNER_POOL);

ok("2:1 exam room pool is unchanged (the original 5 voices)", exam.length === 5, `(${exam.length})`);
ok("2:1 pool = Leonie, Daniel, Lena, Mila Winter, Kerstin", ["Leonie", "Daniel", "Lena", "Mila Winter", "Kerstin"].every((n) => getPool(EXAMINER_POOL).some((v) => v.name === n)));
ok("1:1 examiner pool has 10 voices", tutorEx.length === 10, `(${tutorEx.length})`);
ok("1:1 partner pool has 10 voices", tutorPa.length === 10, `(${tutorPa.length})`);
ok("examiner and partner pools do not overlap", tutorEx.every((id) => !tutorPa.includes(id)));
ok("Leonie is the first examiner in the list", getPool(TUTOR_EXAMINER_POOL)[0]?.name === "Leonie");
ok("all voice ids are unique", new Set(VOICES.map((v) => v.voiceId)).size === VOICES.length);
ok("every voice has name, gender, language de", VOICES.every((v) => v.name && v.gender && v.language === "de"));
ok("no new voice leaked into the 2:1 pool", VOICES.filter((v) => v.pools && !v.pools.includes("examiner")).every((v) => !exam.includes(v.voiceId)));

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
