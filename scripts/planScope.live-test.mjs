/**
 * LIVE verification of the plan-scoped access rules against the real Supabase project, as REAL signed-in users (so RLS
 * is exercised, not bypassed): disposable accounts with each plan are created, queried, and deleted.
 *   Schriftlich: schriftlich content + Mündlich Vorbereitung cards (muendlich_materials), NO exam rooms
 *   Mündlich:    Mündlich (cards + exam rooms), NO Schriftlich content
 *   Komplett:    everything
 *   Grandfathered Schriftlich (started before the cutoff, bought while every plan meant full access): everything
 * Run: node scripts/planScope.live-test.mjs
 */
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=\"?([^\"\\n\\r]*)\"?", "m")) || [])[1];
const URL_ = get("SUPABASE_URL") ?? get("VITE_SUPABASE_URL");
const ANON = get("VITE_SUPABASE_ANON_KEY") ?? get("SUPABASE_ANON_KEY");
const SERVICE = get("SUPABASE_SERVICE_ROLE_KEY");
if (!URL_ || !ANON || !SERVICE) throw new Error("missing Supabase env");

let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? "PASS" : "FAIL"} — ${msg}`); if (!ok) failed++; };
const svc = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const rest = async (path, opts = {}) => {
  const r = await fetch(`${URL_}${path}`, { ...opts, headers: { ...svc, ...(opts.headers ?? {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path} -> ${r.status}: ${t}`);
  return t ? JSON.parse(t) : null;
};

async function makeUser(label, planCode, startedAt) {
  const email = `planscope-${label}-${Date.now()}@auralingovia-test.local`, password = "TestPlanScope2026!";
  const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  await rest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ level: "TELC_B2", full_name: `Plan ${label}` }) });
  await rest("/rest/v1/subscriptions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, plan_code: planCode, status: "active", started_at: startedAt, expires_at: new Date(Date.now() + 30 * 864e5).toISOString() }) });
  const login = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const { access_token: jwt } = await login.json();
  if (!jwt) throw new Error(`login failed (${label})`);
  return { id: user.id, jwt };
}
const asUser = (jwt) => ({ apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" });
async function userRpc(u, fn, args) { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: asUser(u.jwt), body: JSON.stringify(args) }); return { status: r.status, body: await r.text() }; }
async function userCount(u, table, query) {
  const r = await fetch(`${URL_}/rest/v1/${table}?${query}`, { headers: { ...asUser(u.jwt), Prefer: "count=exact", Range: "0-0" } });
  return Number((r.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
}

const now = new Date().toISOString();
const users = {
  schriftlich: await makeUser("schriftlich", "schriftlich", now),
  muendlich: await makeUser("muendlich", "muendlich", now),
  komplett: await makeUser("komplett", "komplett", now),
  legacy: await makeUser("legacy", "schriftlich", "2026-10-01T00:00:00Z"),
};
try {
  const access = async (u, m) => (await userRpc(u, "has_plan_access", { p_user_id: u.id, p_module: m })).body === "true";
  const expected = {
    schriftlich: { schriftlich: true, muendlich: false, muendlich_prep: true },
    muendlich: { schriftlich: false, muendlich: true, muendlich_prep: true },
    komplett: { schriftlich: true, muendlich: true, muendlich_prep: true },
    legacy: { schriftlich: true, muendlich: true, muendlich_prep: true },
  };
  for (const [name, u] of Object.entries(users)) {
    for (const m of ["schriftlich", "muendlich", "muendlich_prep"]) {
      const got = await access(u, m);
      check(got === expected[name][m], `${name} plan: has_plan_access('${m}') = ${got} (expected ${expected[name][m]})`);
    }
  }

  // The real content, through RLS, as each user
  for (const [name, u] of Object.entries(users)) {
    const cards = await userCount(u, "muendlich_materials", "select=id&category=eq.themen&level=eq.TELC_B2");
    check(cards > 0, `${name}: can read the Mündlich Vorbereitung cards (muendlich_materials themen: ${cards})`);
    const lesen = await userCount(u, "lesen_exercises", "select=id&level=eq.TELC_B2");
    // Without Schriftlich access only the free-trial samples (is_free_sample, a separate policy) are visible — never the full bank.
    const samples = await userCount(u, "lesen_exercises", "select=id&level=eq.TELC_B2&is_free_sample=eq.true");
    check(expected[name].schriftlich ? lesen > samples : lesen === samples, `${name}: Lesen ${expected[name].schriftlich ? "full bank readable" : "only the free samples"} (${lesen} rows, ${samples} are samples)`);
  }

  // The cards open their PDFs from the private bucket as the signed-in user — must follow the same rule as the cards
  const pdf = (await rest("/rest/v1/muendlich_materials?select=storage_path&storage_path=not.is.null&storage_path=not.like.*/admin/*&limit=1"))[0]?.storage_path;
  check(!!pdf, `found a real Vorbereitung PDF path to test (${pdf})`);
  if (pdf) {
    for (const [name, u] of Object.entries(users)) {
      const r = await fetch(`${URL_}/storage/v1/object/sign/muendlich-pdfs/${pdf}`, { method: "POST", headers: asUser(u.jwt), body: JSON.stringify({ expiresIn: 60 }) });
      check(r.status === 200, `${name}: can open a Vorbereitung PDF via signed URL (HTTP ${r.status})`);
    }
  }

  // The exam: matchmaking queue refuses a plan without Mündlich access, at the DB level
  const q = await userRpc(users.schriftlich, "join_muendlich_queue", { p_level: "TELC_B2" });
  check(/NO_MUENDLICH_ACCESS/.test(q.body), "Schriftlich-only user is refused the Mündlich exam queue (NO_MUENDLICH_ACCESS)");
  const q2 = await userRpc(users.muendlich, "join_muendlich_queue", { p_level: "TELC_B2" });
  check(!/NO_MUENDLICH_ACCESS/.test(q2.body), `Mündlich plan is NOT refused by the access check (${q2.body.slice(0, 70)})`);
} finally {
  for (const u of Object.values(users)) {
    await rest(`/rest/v1/muendlich_matchmaking_queue?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
    await rest(`/rest/v1/subscriptions?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
    await rest(`/rest/v1/muendlich_credits?user_id=eq.${u.id}`, { method: "DELETE" }).catch(() => {});
    await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: svc }).catch(() => {});
  }
}
console.log(failed ? `\n${failed} CHECK(S) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
