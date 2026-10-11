/**
 * Operations watchdog (owner 2026-10-11: "yalla bil alert") — the relay is the only place that holds every provider key, so it checks the providers
 * itself and pushes an alert when something that would silently kill an exam is about to happen (or has happened):
 *
 *   DeepInfra (Qwen TTS)   credit from GET /payment/checklist (free call)  — warning < $5, critical < $2 / suspended / top-up failed; also reports "auto top-up OFF"
 *   ElevenLabs (backup TTS) remaining characters when the key may read the subscription, else a 1-word probe (quota_exceeded = critical: the failover cannot work)
 *   Anthropic (examiner, partner, correction)  a 1-token Haiku probe — "credit balance too low" / 401 = critical
 *   Groq (speech-to-text)  GET /models — 401/403 = critical
 *   Supabase               REST ping with the service role
 *   Relay itself           TTS failover engaged (breaker), memory, uptime
 *
 * Decisions are made here (AlertState: first non-ok, escalation, recovery, 6-hourly reminder while critical), delivery is the web app's job
 * (POST /api/ops-alert -> Telegram and/or email through the channels the project already has + the ops_alerts table), so no mail/Telegram secret
 * ever has to live on this server. A daily digest (08:00 Tunis) says how many exams ran and what they cost.
 * Snapshot for humans: GET /health/ops with header x-ops-secret.
 */
import { getTtsFailoverStats, setFailoverListener } from "./voice/ttsFailover.js";

export type Level = "ok" | "warning" | "critical";
const RANK: Record<Level, number> = { ok: 0, warning: 1, critical: 2 };

export interface ProviderStatus {
  id: string;
  name: string;
  level: Level;
  detail: string;
  checkedAt: string;
  /** true = the check itself failed in a transient way (network blip); only raised after several in a row. */
  transient?: boolean;
  metrics?: Record<string, number | string | boolean | null>;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Pure decision logic (unit-tested in opsWatch.test.mjs)
// ---------------------------------------------------------------------------------------------------------------------------------------------

export const DEEPINFRA_WARN_USD = Number(process.env.OPS_DEEPINFRA_WARN_USD ?? 5);
export const DEEPINFRA_CRIT_USD = Number(process.env.OPS_DEEPINFRA_CRIT_USD ?? 2);
/** Measured 2026-10-11: one full 1:1 exam speaks ~2,900 characters through Qwen = ~$0.058 of TTS. */
export const TTS_USD_PER_EXAM = 0.058;

/** DeepInfra's `stripe_balance` is NEGATIVE while there is credit (-10.6 = $10.60 left); positive or zero means nothing left. */
export function deepinfraCredit(stripeBalance: number | null | undefined): number | null {
  if (typeof stripeBalance !== "number" || !Number.isFinite(stripeBalance)) return null;
  return Math.max(0, -stripeBalance);
}

export function judgeDeepInfra(c: { credit: number | null; suspended: boolean; topupFailed: boolean; topup: boolean }): { level: Level; detail: string } {
  const examsLeft = c.credit === null ? null : Math.floor(c.credit / TTS_USD_PER_EXAM);
  const auto = c.topup ? "auto top-up ON" : "auto top-up OFF";
  if (c.suspended) return { level: "critical", detail: `DeepInfra account is SUSPENDED (${auto})` };
  if (c.topupFailed) return { level: "critical", detail: `DeepInfra automatic top-up FAILED — the card was declined (${auto})` };
  if (c.credit === null) return { level: "warning", detail: "DeepInfra balance could not be read" };
  const base = `DeepInfra credit $${c.credit.toFixed(2)} ≈ ${examsLeft} more exams of voice (${auto})`;
  if (c.credit < DEEPINFRA_CRIT_USD) return { level: "critical", detail: `${base} — below $${DEEPINFRA_CRIT_USD}: the AI examiner stops speaking at $0` };
  if (c.credit < DEEPINFRA_WARN_USD) return { level: "warning", detail: `${base} — below $${DEEPINFRA_WARN_USD}: top up soon` };
  return { level: "ok", detail: base };
}

export function judgeElevenLabsSubscription(used: number, limit: number): { level: Level; detail: string } {
  const left = Math.max(0, limit - used);
  const pct = limit > 0 ? (left / limit) * 100 : 0;
  const base = `ElevenLabs ${left.toLocaleString("en-US")} of ${limit.toLocaleString("en-US")} characters left (${pct.toFixed(0)}%)`;
  if (left === 0) return { level: "critical", detail: `${base} — the TTS backup/failover cannot work` };
  if (pct < 5) return { level: "critical", detail: `${base} — almost empty` };
  if (pct < 15) return { level: "warning", detail: `${base} — running low` };
  return { level: "ok", detail: base };
}

/** Maps an HTTP status + body of a provider call to a level (Anthropic/Groq/ElevenLabs probes). */
export function judgeProbe(provider: "anthropic" | "groq" | "elevenlabs", status: number, body: string): { level: Level; detail: string } {
  const b = body.slice(0, 220).replace(/\s+/g, " ");
  if (status >= 200 && status < 300) return { level: "ok", detail: provider === "elevenlabs" ? "ElevenLabs answers (balance unknown: the key lacks the user_read permission)" : `${provider} answers` };
  if (/credit balance is too low|quota_exceeded|insufficient|billing/i.test(b)) return { level: "critical", detail: `${provider}: out of credit — ${b}` };
  if (status === 401 || status === 403) return { level: "critical", detail: `${provider}: key rejected (HTTP ${status}) — ${b}` };
  if (status === 429 || status === 529 || status === 503) return { level: "warning", detail: `${provider}: busy/rate-limited (HTTP ${status})` };
  return { level: "warning", detail: `${provider}: HTTP ${status} — ${b}` };
}

export type Decision = "none" | "alert" | "recovered" | "reminder";

/** Remembers, per check, what level was last seen and when it was last announced; says whether to notify now. */
export class AlertState {
  private last = new Map<string, { level: Level; sentAt: number }>();
  constructor(private reminderMs = 6 * 3600_000) {}
  decide(id: string, level: Level, now: number): Decision {
    const prev = this.last.get(id);
    if (!prev) {
      this.last.set(id, { level, sentAt: level === "ok" ? 0 : now });
      return level === "ok" ? "none" : "alert";
    }
    if (prev.level === level) {
      if (level !== "ok" && now - prev.sentAt >= this.reminderMs) { prev.sentAt = now; return "reminder"; }
      return "none";
    }
    const was = prev.level;
    this.last.set(id, { level, sentAt: level === "ok" ? 0 : (RANK[level] > RANK[was] ? now : prev.sentAt) });
    if (level === "ok") return "recovered";
    return RANK[level] > RANK[was] ? "alert" : "none"; // critical -> warning is an improvement, not news
  }
}

/** A transient failure (network blip) only counts after `threshold` in a row; any real answer resets it. */
export class StreakFilter {
  private streak = new Map<string, number>();
  constructor(private threshold = 3) {}
  apply(s: ProviderStatus): ProviderStatus {
    if (!s.transient) { this.streak.set(s.id, 0); return s; }
    const n = (this.streak.get(s.id) ?? 0) + 1;
    this.streak.set(s.id, n);
    return n >= this.threshold ? s : { ...s, level: "ok", detail: `${s.detail} (transient ${n}/${this.threshold}, not reported yet)` };
  }
}

export function worst(levels: Level[]): Level { return levels.reduce<Level>((a, l) => (RANK[l] > RANK[a] ? l : a), "ok"); }

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------------------------------------------------------------------------

const now = () => new Date().toISOString();
const TIMEOUT = () => AbortSignal.timeout(15_000);
const status = (id: string, name: string, j: { level: Level; detail: string }, extra: Partial<ProviderStatus> = {}): ProviderStatus => ({ id, name, level: j.level, detail: j.detail, checkedAt: now(), ...extra });
const unreachable = (id: string, name: string, e: unknown): ProviderStatus => ({ id, name, level: "warning", detail: `${name} could not be reached: ${e instanceof Error ? e.message : String(e)}`.slice(0, 200), checkedAt: now(), transient: true });

async function probeDeepInfra(): Promise<ProviderStatus> {
  const key = process.env.DEEPINFRA_API_KEY;
  if (!key) return status("deepinfra", "DeepInfra (Qwen TTS)", { level: "critical", detail: "DEEPINFRA_API_KEY is not set" });
  try {
    const res = await fetch("https://api.deepinfra.com/payment/checklist", { headers: { Authorization: `Bearer ${key}` }, signal: TIMEOUT() });
    if (!res.ok) return status("deepinfra", "DeepInfra (Qwen TTS)", { level: res.status === 401 || res.status === 403 ? "critical" : "warning", detail: `DeepInfra account check failed (HTTP ${res.status})` }, res.status >= 500 ? { transient: true } : {});
    const j = (await res.json()) as { stripe_balance?: number; suspended?: boolean; topup?: boolean; topup_failed?: boolean };
    const credit = deepinfraCredit(j.stripe_balance);
    return status("deepinfra", "DeepInfra (Qwen TTS)", judgeDeepInfra({ credit, suspended: !!j.suspended, topupFailed: !!j.topup_failed, topup: !!j.topup }), { metrics: { credit_usd: credit, auto_topup: !!j.topup } });
  } catch (e) { return unreachable("deepinfra", "DeepInfra (Qwen TTS)", e); }
}

async function probeElevenLabs(): Promise<ProviderStatus> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return status("elevenlabs", "ElevenLabs (backup TTS)", { level: "warning", detail: "ELEVENLABS_API_KEY is not set — no TTS failover" });
  try {
    const sub = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": key }, signal: TIMEOUT() });
    if (sub.ok) {
      const j = (await sub.json()) as { character_count?: number; character_limit?: number };
      if (typeof j.character_count === "number" && typeof j.character_limit === "number") return status("elevenlabs", "ElevenLabs (backup TTS)", judgeElevenLabsSubscription(j.character_count, j.character_limit), { metrics: { used: j.character_count, limit: j.character_limit } });
    }
    // The key cannot read the subscription (needs the user_read permission): spend one word to find out whether it still works.
    const res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/KDqku3FJfbImX6HKQdWA?output_format=pcm_16000", {
      method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text: "Hallo.", model_id: "eleven_flash_v2_5", language_code: "de" }), signal: TIMEOUT(),
    });
    if (res.ok) { await res.arrayBuffer().catch(() => {}); return status("elevenlabs", "ElevenLabs (backup TTS)", judgeProbe("elevenlabs", 200, "")); }
    return status("elevenlabs", "ElevenLabs (backup TTS)", judgeProbe("elevenlabs", res.status, await res.text().catch(() => "")));
  } catch (e) { return unreachable("elevenlabs", "ElevenLabs (backup TTS)", e); }
}

async function probeAnthropic(): Promise<ProviderStatus> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return status("anthropic", "Anthropic (examiner, partner, correction)", { level: "critical", detail: "ANTHROPIC_API_KEY is not set" });
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "ok" }] }), signal: TIMEOUT(),
    });
    return status("anthropic", "Anthropic (examiner, partner, correction)", judgeProbe("anthropic", res.status, res.ok ? "" : await res.text().catch(() => "")), res.status >= 500 && res.status !== 529 ? { transient: true } : {});
  } catch (e) { return unreachable("anthropic", "Anthropic (examiner, partner, correction)", e); }
}

async function probeGroq(): Promise<ProviderStatus> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return status("groq", "Groq (speech-to-text)", { level: "warning", detail: "GROQ_API_KEY is not set — STT falls back to ElevenLabs Scribe" });
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: TIMEOUT() });
    return status("groq", "Groq (speech-to-text)", judgeProbe("groq", res.status, res.ok ? "" : await res.text().catch(() => "")), res.status >= 500 ? { transient: true } : {});
  } catch (e) { return unreachable("groq", "Groq (speech-to-text)", e); }
}

async function probeSupabase(): Promise<ProviderStatus> {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return status("supabase", "Supabase (database)", { level: "critical", detail: "SUPABASE_URL / SERVICE_ROLE_KEY not set" });
  try {
    const res = await fetch(`${url}/rest/v1/muendlich_rooms?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: TIMEOUT() });
    return status("supabase", "Supabase (database)", res.ok ? { level: "ok", detail: "database answers" } : { level: res.status === 401 || res.status === 403 ? "critical" : "warning", detail: `database check HTTP ${res.status}` }, res.status >= 500 ? { transient: true } : {});
  } catch (e) { return unreachable("supabase", "Supabase (database)", e); }
}

function relayStatus(): ProviderStatus {
  const f = getTtsFailoverStats();
  const rssMb = Math.round(process.memoryUsage().rss / 1048576);
  const bits = [`uptime ${Math.round(process.uptime() / 60)} min`, `memory ${rssMb} MB`, `TTS failover trips ${f.trips}`, `failover sentences ${f.failoverSentences}`];
  if (f.breakerOpen) return status("relay_tts", "Relay · TTS", { level: "warning", detail: `TTS FAILOVER ENGAGED (DeepInfra failing → ElevenLabs speaks): ${f.lastReason}` }, { metrics: { trips: f.trips, failover_chars: f.failoverChars } });
  if (rssMb > 1500) return status("relay_tts", "Relay · TTS", { level: "warning", detail: `relay memory high: ${bits.join(", ")}` }, { metrics: { rss_mb: rssMb } });
  return status("relay_tts", "Relay · TTS", { level: "ok", detail: bits.join(", ") }, { metrics: { rss_mb: rssMb, trips: f.trips } });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Loop, delivery, digest
// ---------------------------------------------------------------------------------------------------------------------------------------------

const ALERT_URL = process.env.OPS_ALERT_URL ?? "https://www.auralingoviatestdeutsch.academy/api/ops-alert";
const CHECK_EVERY_MS = Number(process.env.OPS_CHECK_EVERY_MS ?? 10 * 60_000);
const PAID_PROBE_EVERY = 3; // ElevenLabs/Anthropic probes spend (a tiny amount) — every 3rd round = every 30 min

export function opsSecret(): string { return process.env.OPS_ALERT_SECRET ?? ""; }

export async function postOpsAlert(a: { severity: "info" | "warning" | "critical"; key: string; title: string; message: string; details?: unknown }): Promise<boolean> {
  const secret = opsSecret();
  console.warn(`[ops-alert] ${a.severity.toUpperCase()} ${a.key}: ${a.title} — ${a.message}`);
  if (!secret) return false;
  try {
    const res = await fetch(ALERT_URL, { method: "POST", headers: { "content-type": "application/json", "x-ops-secret": secret }, body: JSON.stringify(a), signal: AbortSignal.timeout(20_000) });
    if (!res.ok) console.error(`[ops-alert] delivery endpoint answered HTTP ${res.status}`);
    return res.ok;
  } catch (e) { console.error("[ops-alert] delivery failed:", e instanceof Error ? e.message : e); return false; }
}

let snapshot: { generatedAt: string; overall: Level; providers: ProviderStatus[] } = { generatedAt: "", overall: "ok", providers: [] };
export function getOpsSnapshot() { return snapshot; }

const state = new AlertState();
const streaks = new StreakFilter(3);
let round = 0;
const cache = new Map<string, ProviderStatus>(); // the paid probes run every 3rd round; in between the last result stands

async function runChecks(): Promise<void> {
  const paid = round % PAID_PROBE_EVERY === 0;
  round++;
  const results = await Promise.all([
    probeDeepInfra(), probeGroq(), probeSupabase(),
    paid || !cache.has("elevenlabs") ? probeElevenLabs() : Promise.resolve(cache.get("elevenlabs")!),
    paid || !cache.has("anthropic") ? probeAnthropic() : Promise.resolve(cache.get("anthropic")!),
    Promise.resolve(relayStatus()),
  ]);
  const providers = results.map((r) => (paid || (r.id !== "elevenlabs" && r.id !== "anthropic") ? streaks.apply(r) : r));
  for (const p of providers) cache.set(p.id, p);
  snapshot = { generatedAt: now(), overall: worst(providers.map((p) => p.level)), providers };
  for (const p of providers) {
    const d = state.decide(p.id, p.level, Date.now());
    if (d === "none") continue;
    const sev = p.level === "critical" ? "critical" : p.level === "warning" ? "warning" : "info";
    const title = d === "recovered" ? `✅ ${p.name} is OK again` : d === "reminder" ? `⏰ ${p.name} still ${p.level.toUpperCase()}` : `${p.level === "critical" ? "🔴" : "🟠"} ${p.name}: ${p.level.toUpperCase()}`;
    await postOpsAlert({ severity: sev, key: p.id, title, message: p.detail, details: p.metrics });
  }
}

// --- TTS failover: say so the moment it engages (the checks above would only notice at the next round) ---
let lastFailoverAlertAt = 0;
function onFailoverTrip(info: { status: number | null; detail: string }) {
  if (Date.now() - lastFailoverAlertAt < 30 * 60_000) return;
  lastFailoverAlertAt = Date.now();
  const el = cache.get("elevenlabs");
  const backup = el ? (el.level === "critical" ? "ElevenLabs has NO credit either — students will hear silence!" : `ElevenLabs backup: ${el.level}`) : "ElevenLabs backup status unknown";
  void postOpsAlert({ severity: el?.level === "critical" ? "critical" : "warning", key: "tts_failover", title: "🟠 TTS failover engaged — DeepInfra is failing", message: `DeepInfra answered ${info.status ?? "network error"}: ${info.detail.slice(0, 160)}. ${backup}` });
}

// --- daily digest, 08:00 Tunis (UTC+1, no DST) = 07:00 UTC ---
let lastDigestDay = "";
async function maybeDigest(): Promise<void> {
  const d = new Date();
  const day = d.toISOString().slice(0, 10);
  if (d.getUTCHours() < 7 || lastDigestDay === day) return;
  lastDigestDay = day;
  let usage = "";
  try {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const q = async (table: string) => {
      const res = await fetch(`${url}/rest/v1/${table}?select=usd_total&created_at=gte.${since}`, { headers: { apikey: key!, Authorization: `Bearer ${key}` }, signal: TIMEOUT() });
      const rows = res.ok ? ((await res.json()) as { usd_total: number | string }[]) : [];
      return { n: rows.length, usd: rows.reduce((a, r) => a + Number(r.usd_total ?? 0), 0) };
    };
    const [t, r] = await Promise.all([q("voice_tutor_costs"), q("muendlich_exam_costs")]);
    usage = `Last 24 h: ${t.n} AI exams (1:1) cost $${t.usd.toFixed(2)}${t.n ? ` (avg $${(t.usd / t.n).toFixed(3)})` : ""}; ${r.n} room exams cost $${r.usd.toFixed(2)}.`;
  } catch { usage = "Usage of the last 24 h could not be read."; }
  const lines = snapshot.providers.map((p) => `${p.level === "ok" ? "✅" : p.level === "warning" ? "🟠" : "🔴"} ${p.name}: ${p.detail}`);
  await postOpsAlert({ severity: "info", key: "daily_digest", title: "📊 Daily report — AuraLingovia AI Mündlich", message: `${usage}\n${lines.join("\n")}` });
}

let started = false;
export function startOpsWatch(): void {
  if (started || process.env.OPS_WATCH === "off") return;
  started = true;
  setFailoverListener(onFailoverTrip);
  if (new Date().getUTCHours() >= 7) lastDigestDay = new Date().toISOString().slice(0, 10); // a restart after 08:00 must not resend today's digest
  const tick = () => { void runChecks().then(maybeDigest).catch((e) => console.error("[ops-watch] round failed:", e)); };
  setTimeout(tick, 20_000);                          // first round shortly after start
  setInterval(tick, CHECK_EVERY_MS).unref();
  console.log(`[ops-watch] started: checks every ${Math.round(CHECK_EVERY_MS / 60000)} min, alerts ${opsSecret() ? "-> " + ALERT_URL : "to the journal only (OPS_ALERT_SECRET not set)"}`);
}
