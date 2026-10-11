// Unit test (no network): the decision logic of the operations watchdog.   npx tsx src/opsWatch.test.mjs
process.env.OPS_WATCH = "off";
const m = await import("./opsWatch.ts");
let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };

// DeepInfra credit is the NEGATIVE of stripe_balance
ok("stripe_balance -10.6 means $10.60 of credit; 0 or positive means none", m.deepinfraCredit(-10.6) === 10.6 && m.deepinfraCredit(0) === 0 && m.deepinfraCredit(3) === 0 && m.deepinfraCredit(undefined) === null);
const base = { suspended: false, topupFailed: false, topup: false };
ok("DeepInfra: $10.6 -> ok, and it says how many exams that is", (() => { const r = m.judgeDeepInfra({ ...base, credit: 10.6 }); return r.level === "ok" && /182 more exams/.test(r.detail) && /auto top-up OFF/.test(r.detail); })());
ok("DeepInfra: $4.9 -> warning, $1.99 -> critical, $0 -> critical", m.judgeDeepInfra({ ...base, credit: 4.9 }).level === "warning" && m.judgeDeepInfra({ ...base, credit: 1.99 }).level === "critical" && m.judgeDeepInfra({ ...base, credit: 0 }).level === "critical");
ok("DeepInfra: suspended or failed top-up is critical whatever the credit", m.judgeDeepInfra({ ...base, credit: 50, suspended: true }).level === "critical" && m.judgeDeepInfra({ ...base, credit: 50, topupFailed: true }).level === "critical");
ok("DeepInfra: unreadable balance is a warning, not silence", m.judgeDeepInfra({ ...base, credit: null }).level === "warning");

ok("ElevenLabs subscription: 0 left critical, 3% critical, 10% warning, 50% ok", m.judgeElevenLabsSubscription(100000, 100000).level === "critical" && m.judgeElevenLabsSubscription(97000, 100000).level === "critical" && m.judgeElevenLabsSubscription(90000, 100000).level === "warning" && m.judgeElevenLabsSubscription(50000, 100000).level === "ok");
ok("probes: 200 ok; 'credit balance is too low' critical; quota_exceeded critical; 401 critical; 429/529 warning",
  m.judgeProbe("anthropic", 200, "").level === "ok" &&
  m.judgeProbe("anthropic", 400, '{"error":{"message":"Your credit balance is too low to access the Anthropic API"}}').level === "critical" &&
  m.judgeProbe("elevenlabs", 401, '{"detail":{"code":"quota_exceeded"}}').level === "critical" &&
  m.judgeProbe("groq", 401, "invalid key").level === "critical" &&
  m.judgeProbe("anthropic", 529, "overloaded").level === "warning" && m.judgeProbe("groq", 429, "").level === "warning");

// AlertState
const t0 = 1_000_000, H = 3600_000;
{
  const s = new m.AlertState(6 * H);
  ok("first check ok -> silent", s.decide("x", "ok", t0) === "none");
  ok("ok -> warning -> alert", s.decide("x", "warning", t0 + 1) === "alert");
  ok("same level again -> silent", s.decide("x", "warning", t0 + 10 * 60_000) === "none");
  ok("warning -> critical (escalation) -> alert", s.decide("x", "critical", t0 + 20 * 60_000) === "alert");
  ok("still critical 5 h later -> silent, 6 h later -> reminder", s.decide("x", "critical", t0 + 5 * H) === "none" && s.decide("x", "critical", t0 + 6.5 * H) === "reminder");
  ok("critical -> warning is an improvement, not news", s.decide("x", "warning", t0 + 7 * H) === "none");
  ok("warning -> ok -> recovered", s.decide("x", "ok", t0 + 8 * H) === "recovered");
  ok("ok again afterwards -> silent", s.decide("x", "ok", t0 + 9 * H) === "none");
}
{
  const s = new m.AlertState();
  ok("a service that is already critical on the first check IS reported (e.g. after a restart)", s.decide("y", "critical", t0) === "alert");
}
// StreakFilter
{
  const f = new m.StreakFilter(3);
  const blip = { id: "g", name: "G", level: "warning", detail: "net", checkedAt: "", transient: true };
  ok("2 network blips in a row stay hidden, the 3rd is reported", f.apply(blip).level === "ok" && f.apply(blip).level === "ok" && f.apply(blip).level === "warning");
  ok("a real answer resets the streak", f.apply({ ...blip, transient: false, level: "ok" }).level === "ok" && f.apply(blip).level === "ok");
  ok("a real (non-transient) problem is reported at once", f.apply({ ...blip, transient: false, level: "critical" }).level === "critical");
}
// readiness
{
  const P = (id, level, metrics) => ({ id, name: id, level, detail: "", checkedAt: "", metrics });
  const fresh = (providers) => ({ generatedAt: new Date().toISOString(), providers });
  const allOk = () => [P("deepinfra", "ok", { credit_usd: 10, suspended: false }), P("elevenlabs", "ok"), P("anthropic", "ok"), P("groq", "ok"), P("supabase", "ok")];
  const set = (list, id, p) => list.map((x) => (x.id === id ? p : x));
  const fo = { enabled: true, breakerOpen: false };
  ok("readiness: everything fine -> ready", m.computeReadiness(fresh(allOk()), fo).ready === true);
  ok("readiness: no snapshot yet -> ready but unknown (never blocks)", (() => { const r = m.computeReadiness({ generatedAt: "", providers: [] }, fo); return r.ready && r.unknown; })());
  ok("readiness: stale snapshot (40 min) -> ready but unknown", (() => { const r = m.computeReadiness({ generatedAt: new Date(Date.now() - 40 * 60_000).toISOString(), providers: allOk().map((p) => ({ ...p, level: "critical" })) }, fo); return r.ready && r.unknown; })());
  const noDi = set(allOk(), "deepinfra", P("deepinfra", "critical", { credit_usd: 0, suspended: false }));
  ok("readiness: DeepInfra empty but ElevenLabs works -> ready (the failover speaks)", m.computeReadiness(fresh(noDi), fo).ready === true);
  ok("readiness: DeepInfra empty and failover switched off -> NOT ready (tts)", (() => { const r = m.computeReadiness(fresh(noDi), { enabled: false, breakerOpen: false }); return !r.ready && r.reason === "tts"; })());
  const noBoth = set(noDi, "elevenlabs", P("elevenlabs", "critical"));
  ok("readiness: DeepInfra AND ElevenLabs empty -> NOT ready (tts)", (() => { const r = m.computeReadiness(fresh(noBoth), fo); return !r.ready && r.reason === "tts" && !r.unknown; })());
  ok("readiness: DeepInfra with 5 cents left is unusable, with 10 dollars usable", !m.computeReadiness(fresh(set(set(allOk(), "deepinfra", P("deepinfra", "critical", { credit_usd: 0.05 })), "elevenlabs", P("elevenlabs", "critical"))), fo).ready && m.computeReadiness(fresh(allOk()), fo).ready);
  ok("readiness: suspended DeepInfra with ElevenLabs down -> NOT ready", !m.computeReadiness(fresh(set(set(allOk(), "deepinfra", P("deepinfra", "critical", { credit_usd: 50, suspended: true })), "elevenlabs", P("elevenlabs", "critical"))), fo).ready);
  ok("readiness: Anthropic out of credit -> NOT ready (llm)", (() => { const r = m.computeReadiness(fresh(set(allOk(), "anthropic", P("anthropic", "critical"))), fo); return !r.ready && r.reason === "llm"; })());
  ok("readiness: Groq dead but ElevenLabs Scribe alive -> ready; both dead -> NOT ready (stt)", m.computeReadiness(fresh(set(allOk(), "groq", P("groq", "critical"))), fo).ready && (() => { const r = m.computeReadiness(fresh(set(set(allOk(), "groq", P("groq", "critical")), "elevenlabs", P("elevenlabs", "critical"))), fo); return !r.ready && r.reason === "stt"; })());
  ok("readiness: database down -> NOT ready (db)", (() => { const r = m.computeReadiness(fresh(set(allOk(), "supabase", P("supabase", "critical"))), fo); return !r.ready && r.reason === "db"; })());
}
ok("worst() picks the highest level", m.worst(["ok", "warning"]) === "warning" && m.worst(["ok", "critical", "warning"]) === "critical" && m.worst([]) === "ok");
if (failed) { console.log(`\n${failed} FAILED`); process.exit(1); } else console.log("\nall passed");
