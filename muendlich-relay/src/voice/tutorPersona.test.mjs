// Unit test: which persona (examiner / practice partner) the 1:1 tutor speaks as per Teil (owner 2026-10-11: the partner talks in Teil 2 AND 3, Teil 1 is examiner-only).
//   npx tsx src/voice/tutorPersona.test.mjs
const { isPartnerPersona, buildTutorSystemPrompt } = await import("./tutorBrain.ts");
let failed = 0;
const ok = (name, cond) => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name); };
const base = { studentName: "Fatma", level: "B2", teil1Topic: "Reise", teil2Topic: "Hochzeit nur zu zweit", teil3Topic: "Stadtbesichtigung" };

ok("Teil 1 is never the partner (even if the flag were set by mistake)", !isPartnerPersona({ stage: 1 }) && !isPartnerPersona({ stage: 1, partner: false }));
ok("Teil 2 examiner mode (no flag) is the examiner", !isPartnerPersona({ stage: 2 }) && !isPartnerPersona({ stage: 2, partner: false }));
ok("Teil 2 partner mode is the partner", isPartnerPersona({ stage: 2, partner: true }));
ok("Teil 3 is always the partner", isPartnerPersona({ stage: 3 }) && isPartnerPersona({ stage: 3, partner: true }));

const p1 = buildTutorSystemPrompt({ ...base, stage: 1 });
const p2e = buildTutorSystemPrompt({ ...base, stage: 2 });
const p2p = buildTutorSystemPrompt({ ...base, stage: 2, partner: true });
const p3 = buildTutorSystemPrompt({ ...base, stage: 3, partner: true });
ok("Teil 1 prompt: examiner presentation", /KI-Prüferin/.test(p1) && /Präsentation/.test(p1));
ok("Teil 2 examiner prompt (rollback mode): the examiner leads the whole conversation", /du führst das GANZE Gespräch/.test(p2e) && !/Übungspartner/.test(p2e));
ok("Teil 2 partner prompt: practice partner, Teil 2, own opinion, opens with a greeting, exactly N contributions", /Übungspartner/.test(p2p) && /Teil 2/.test(p2p) && /eigene, begründete Meinung/.test(p2p) && /Beitrag 1 eröffnet/.test(p2p) && /GENAU 5 Beiträge/.test(p2p) && /Hochzeit nur zu zweit/.test(p2p));
ok("Teil 2 partner prompt keeps the no-help / no-correction rule and the length limit", /Keine Korrektur, keine Hilfe/.test(p2p) && /140 Zeichen/.test(p2p));
ok("Teil 3 prompt is the planning partner", /Übungspartner/.test(p3) && /Teil 3/.test(p3) && /Planungsaufgabe/.test(p3) && /GENAU 6 Beiträge/.test(p3));
ok("the Teil 2 partner prompt differs from the Teil 3 one (discussion, not planning)", p2p !== p3 && !/Planungsaufgabe/.test(p2p));
if (failed) { console.log(`\n${failed} FAILED`); process.exit(1); } else console.log("\nall passed");
