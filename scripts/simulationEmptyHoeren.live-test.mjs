/**
 * LIVE regression test: start_simulation must never pick a Hören exercise that has no statements (the "content pending" T3 placeholders).
 * A disposable subscribed user starts N simulations in a row (each one expired before the next, so the "no repeats" rule makes it draw
 * N DIFFERENT Teil-3 exercises); with 3 empty placeholders among ~59 Teil-3 rows, N=45 hits at least one of them ~97% of the time WITHOUT the guard.
 * Usage: node scripts/simulationEmptyHoeren.live-test.mjs [N=45]      (exit 1 if an empty exercise was ever picked)
 */
import { readFileSync } from "node:fs";
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=\"?([^\"\\n\\r]*)\"?", "m")) || [])[1];
const URL_ = get("SUPABASE_URL"), ANON = get("VITE_SUPABASE_ANON_KEY"), SERVICE = get("SUPABASE_SERVICE_ROLE_KEY");
const N = Number(process.argv[2] ?? 45);
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const rest = async (path, opts = {}) => { const r = await fetch(`${URL_}${path}`, { ...opts, headers: { ...svc, ...(opts.headers ?? {}) } }); const t = await r.text(); if (!r.ok) throw new Error(`${path} -> ${r.status}: ${t}`); return t ? JSON.parse(t) : null; };

const all = await rest(`/rest/v1/hoeren_exercises?select=id,title&level=eq.TELC_B2&is_hidden=eq.false&teil=eq.3`);
// PostgREST caps a response at 1000 rows — page through ALL statements, otherwise non-empty exercises look empty
const withStatements = new Set();
for (let from = 0; ; from += 1000) {
  const page = await rest(`/rest/v1/hoeren_statements?select=exercise_id&order=id`, { headers: { Range: `${from}-${from + 999}`, "Range-Unit": "items" } });
  page.forEach((s) => withStatements.add(s.exercise_id));
  if (page.length < 1000) break;
}
const emptyIds = new Set(all.filter((e) => !withStatements.has(e.id)).map((e) => e.id));
console.log(`Teil-3 exercises: ${all.length}, empty placeholders: ${emptyIds.size} (${all.filter((e) => emptyIds.has(e.id)).map((e) => e.title).join(", ")})`);

const email = `simtest-${Date.now()}@auralingovia-test.local`, password = "SimTestEmptyHoeren2026!";
const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
await rest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ level: "TELC_B2", target_level: "TELC_B2", onboarding_completed: true }) });
await rest("/rest/v1/subscriptions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, plan_code: "schriftlich", status: "active", started_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 864e5).toISOString() }) });
const login = await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })).json();
if (!login.access_token) throw new Error("login failed");

let hits = 0, ok = 0, failures = 0;
try {
  for (let i = 1; i <= N; i++) {
    const r = await fetch(`${URL_}/rest/v1/rpc/start_simulation`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${login.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_user_id: user.id, p_level: "TELC_B2" }) });
    const body = await r.json();
    if (!r.ok || !body.attempt_id) { failures++; console.log(`call ${i}: ${r.status} ${JSON.stringify(body).slice(0, 120)}`); if (failures >= 3) break; continue; }
    const [a] = await rest(`/rest/v1/simulation_attempts?select=hoeren_t3_id&id=eq.${body.attempt_id}`);
    ok++;
    if (emptyIds.has(a.hoeren_t3_id)) { hits++; console.log(`call ${i}: PICKED AN EMPTY Hören T3 exercise (${a.hoeren_t3_id})`); }
    await rest(`/rest/v1/simulation_attempts?id=eq.${body.attempt_id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "expired" }) });
  }
} finally {
  await rest(`/rest/v1/simulation_attempts?user_id=eq.${user.id}`, { method: "DELETE" }).catch((e) => console.log("cleanup attempts:", e.message));
  await rest(`/rest/v1/subscriptions?user_id=eq.${user.id}`, { method: "DELETE" }).catch(() => {});
  await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: svc }).catch(() => {});
}
console.log(`\n${ok} simulations started, ${hits} picked an empty Hören T3 exercise.`);
console.log(hits === 0 && ok > 0 ? "PASS" : hits > 0 ? "FAIL — empty exercise reachable" : "INCONCLUSIVE");
process.exit(hits === 0 && ok > 0 ? 0 : 1);
