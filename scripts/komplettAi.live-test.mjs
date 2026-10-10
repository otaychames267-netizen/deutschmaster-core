/**
 * LIVE verification of the Komplett plan (komplett_ai) against the real Supabase project, as REAL signed-in users (RLS and the voice_tutor_sessions trigger
 * are exercised, not bypassed). Disposable accounts are created and deleted.
 *   komplett_ai:   Schriftlich content + Mündlich Vorbereitung + the AI Sprachtrainer (module 'muendlich_ai'); NOT the exam rooms ('muendlich')
 *   everyone else: NO AI Sprachtrainer — not Schriftlich, not Mündlich, not the legacy Komplett (87 subscribers at 30 TND), not Premium, not a grandfathered
 *                  subscription; and the voice_tutor_sessions INSERT is refused by the database (NO_AI_ACCESS), not just hidden in the UI
 *   admins:        exempt (the preview / support access stays)
 * Run: node scripts/komplettAi.live-test.mjs
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
const asUser = (jwt) => ({ apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" });
async function userRpc(u, fn, args) { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: asUser(u.jwt), body: JSON.stringify(args) }); return { status: r.status, body: await r.text() }; }

const created = [];
async function makeUser(label, planCode, startedAt) {
  const email = `komplettai-${label}-${Date.now()}@auralingovia-test.local`, password = "TestKomplettAi2026!";
  const user = await rest("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  created.push(user.id);
  await rest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ level: "TELC_B2", full_name: `KAI ${label}` }) });
  if (planCode) {
    await rest("/rest/v1/subscriptions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id, plan_code: planCode, status: "active", started_at: startedAt, expires_at: new Date(Date.now() + 25 * 86400e3).toISOString() }) });
  }
  const login = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const { access_token: jwt } = await login.json();
  if (!jwt) throw new Error(`login failed (${label})`);
  return { id: user.id, jwt };
}

const now = new Date().toISOString();
const GRANDFATHER = "2026-10-01T00:00:00Z";
let failedRun = null;
try {
  const [plan] = await rest("/rest/v1/plans?code=eq.komplett_ai&select=code,name,price_tnd,active");
  check(plan?.name === "Komplett" && Number(plan.price_tnd) === 60 && plan.active === true, `plans row: ${JSON.stringify(plan)}`);
  const [legacy] = await rest("/rest/v1/plans?code=eq.komplett&select=price_tnd");
  check(Number(legacy.price_tnd) === 30, `legacy komplett still costs ${legacy.price_tnd} TND (the 87 existing subscribers keep 30)`);

  const users = {
    komplett_ai: await makeUser("komplettai", "komplett_ai", now),
    komplett_legacy: await makeUser("legacy", "komplett", GRANDFATHER),
    komplett_new_started: await makeUser("komplettnew", "komplett", now),
    schriftlich: await makeUser("schriftlich", "schriftlich", now),
    schriftlich_grandfathered: await makeUser("grandf", "schriftlich", GRANDFATHER),
    muendlich: await makeUser("muendlich", "muendlich", now),
    premium: await makeUser("premium", "premium", now),
    nobody: await makeUser("nobody", null, now),
  };
  const access = async (u, m) => (await userRpc(u, "has_plan_access", { p_user_id: u.id, p_module: m })).body === "true";
  const expected = {
    komplett_ai: { schriftlich: true, muendlich: false, muendlich_prep: true, muendlich_ai: true },
    komplett_legacy: { schriftlich: true, muendlich: true, muendlich_prep: true, muendlich_ai: false },
    komplett_new_started: { schriftlich: true, muendlich: true, muendlich_prep: true, muendlich_ai: false },
    schriftlich: { schriftlich: true, muendlich: false, muendlich_prep: true, muendlich_ai: false },
    schriftlich_grandfathered: { schriftlich: true, muendlich: true, muendlich_prep: true, muendlich_ai: false },
    muendlich: { schriftlich: false, muendlich: true, muendlich_prep: true, muendlich_ai: false },
    premium: { schriftlich: true, muendlich: true, muendlich_prep: true, muendlich_ai: false },
    nobody: { schriftlich: false, muendlich: false, muendlich_prep: false, muendlich_ai: false },
  };
  for (const [name, u] of Object.entries(users)) {
    const got = {};
    for (const m of ["schriftlich", "muendlich", "muendlich_prep", "muendlich_ai"]) got[m] = await access(u, m);
    check(JSON.stringify(got) === JSON.stringify(expected[name]), `${name}: has_plan_access ${JSON.stringify(got)}`);
  }

  // the database itself refuses the tutor session for everybody except Komplett (and staff) — not just the UI
  const mats = {};
  for (const teil of [1, 2, 3]) mats[teil] = (await rest(`/rest/v1/muendlich_materials?teil=eq.${teil}&category=eq.themen&level=eq.TELC_B2&limit=1&select=id`))[0].id;
  async function tryInsert(u) {
    const r = await fetch(`${URL_}/rest/v1/voice_tutor_sessions`, { method: "POST", headers: { ...asUser(u.jwt), Prefer: "return=representation" }, body: JSON.stringify({ user_id: u.id, level: "TELC_B2", teil1_material_id: mats[1], teil2_material_id: mats[2], teil3_material_id: mats[3] }) });
    return { status: r.status, body: await r.text() };
  }
  for (const [name, u] of Object.entries(users)) {
    const r = await tryInsert(u);
    if (name === "komplett_ai") {
      check(r.status === 201, `${name}: tutor session INSERT allowed (HTTP ${r.status})`);
      try { const id = JSON.parse(r.body)[0].id; await rest(`/rest/v1/voice_tutor_sessions?id=eq.${id}`, { method: "DELETE" }); } catch {}
    } else {
      check(r.status >= 400 && r.body.includes("NO_AI_ACCESS"), `${name}: tutor session INSERT refused with NO_AI_ACCESS (HTTP ${r.status})`);
    }
  }

  // staff stay exempt (the admin preview / support): a disposable admin
  const admin = await makeUser("admin", null, now);
  await rest("/rest/v1/user_roles", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ user_id: admin.id, role: "admin" }) });
  const ra = await tryInsert(admin);
  check(ra.status === 201, `admin without any subscription: tutor session INSERT allowed (HTTP ${ra.status})`);
  try { const id = JSON.parse(ra.body)[0].id; await rest(`/rest/v1/voice_tutor_sessions?id=eq.${id}`, { method: "DELETE" }); } catch {}

  // wallet: a komplett_ai grant gives the same 30 essay credits as Schriftlich (and NO speaking-minutes wallet)
  const grantee = await makeUser("grantee", null, now);
  const r = await fetch(`${URL_}/rest/v1/rpc/admin_manual_subscription_action`, {
    method: "POST", headers: svc,
    body: JSON.stringify({ p_admin_id: users.komplett_ai.id, p_user_id: grantee.id, p_action: "grant", p_action_label: "komplett-ai live test", p_plan_code: "komplett_ai", p_is_trial: false, p_new_expires_at: new Date(Date.now() + 30 * 86400e3).toISOString() }),
  });
  const body = await r.text();
  check(r.ok, `admin_manual_subscription_action(grant komplett_ai) works (HTTP ${r.status}${r.ok ? "" : " " + body.slice(0, 160)})`);
  if (r.ok) {
    const [credits] = await rest(`/rest/v1/student_credits?user_id=eq.${grantee.id}&select=balance`);
    check(Number(credits?.balance) === 30, `komplett_ai grant provisions 30 essay credits (balance ${credits?.balance})`);
    const [sub] = await rest(`/rest/v1/subscriptions?user_id=eq.${grantee.id}&select=plan_code,status`);
    check(sub?.plan_code === "komplett_ai" && sub?.status === "active", `subscription row: ${JSON.stringify(sub)}`);
    const mc = await rest(`/rest/v1/muendlich_credits?user_id=eq.${grantee.id}&select=minutes_balance`);
    check(!mc.length || Number(mc[0].minutes_balance) === 0, `no speaking-minutes wallet is provisioned for komplett_ai (${JSON.stringify(mc)})`);
  }
} catch (e) {
  failedRun = e;
  console.error("ERROR", e);
  failed++;
} finally {
  for (const id of created) {
    await fetch(`${URL_}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: svc }).catch(() => {});
  }
  console.log(`cleanup: ${created.length} disposable users deleted`);
}
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
