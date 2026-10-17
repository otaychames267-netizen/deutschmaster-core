/**
 * providers.server.ts — a pool of FREE-tier LLM endpoints (Google AI Studio models + Groq) with automatic hopping.
 *
 * Free tiers have a per-minute AND a per-day quota PER MODEL (measured 2026-10-17 on this project's key: gemini-3.1-flash-lite 15/min, gemini-3.5-flash-lite ~12/min,
 * gemini-3.8-flash 5/min, gemini-2.5-flash-lite 20 per DAY, Gemma-4 models 30/min but flaky with HTTP 500). Each model is its own bucket, so the pool simply tries the next one
 * when a model answers 429 / 5xx and remembers a cooldown (short for per-minute limits, hours for per-day limits) so a busy pool does not waste every request on a dead model.
 * Never throws for quota reasons except when EVERY model failed.
 */
export class FreePoolExhausted extends Error {
  constructor(public readonly attempts: string[]) {
    super(`free LLM pool exhausted (${attempts.join("; ").slice(0, 300)})`);
    this.name = "FreePoolExhausted";
  }
}

const cooldownUntil = new Map<string, number>();

export interface FreeJsonCall {
  prompt: string;
  /** Ordered model ids: "gemini-3.1-flash-lite", … or "groq:openai/gpt-oss-120b". */
  models: string[];
  maxOutputTokens?: number;
  temperature?: number;
  /** Wall-clock budget for the whole call (all hops). */
  budgetMs?: number;
}

function extractJson(text: string): unknown {
  const t = String(text).replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no JSON object in the answer");
  return JSON.parse(t.slice(a, b + 1));
}

async function fetchTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(timer); }
}

async function callGemini(model: string, c: FreeJsonCall, timeoutMs: number): Promise<{ text: string; status: number; body: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { text: "", status: 0, body: "GEMINI_API_KEY not set" };
  const res = await fetchTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ parts: [{ text: c.prompt }] }], generationConfig: { temperature: c.temperature ?? 0.1, maxOutputTokens: c.maxOutputTokens ?? 4000 } }),
  }, timeoutMs);
  const body = await res.text();
  if (!res.ok) return { text: "", status: res.status, body };
  try {
    const j = JSON.parse(body);
    const parts: { text?: string; thought?: boolean }[] = j.candidates?.[0]?.content?.parts ?? [];
    return { text: parts.filter((p) => !p.thought).map((p) => p.text ?? "").join(""), status: 200, body: "" };
  } catch { return { text: "", status: 502, body: "bad response body" }; }
}

async function callGroq(model: string, c: FreeJsonCall, timeoutMs: number): Promise<{ text: string; status: number; body: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { text: "", status: 0, body: "GROQ_API_KEY not set" };
  const res = await fetchTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model, temperature: c.temperature ?? 0.1, max_tokens: c.maxOutputTokens ?? 4000, response_format: { type: "json_object" },
      ...(/gpt-oss/i.test(model) ? { reasoning_effort: "low" } : {}),
      messages: [{ role: "user", content: c.prompt }],
    }),
  }, timeoutMs);
  const body = await res.text();
  if (!res.ok) return { text: "", status: res.status, body };
  try { return { text: JSON.parse(body).choices?.[0]?.message?.content ?? "", status: 200, body: "" }; } catch { return { text: "", status: 502, body: "bad response body" }; }
}

/** Calls the first model in the list that answers with parseable JSON. `validate` may throw to reject a (parseable but unusable) answer and hop on. */
export async function callFreeJson<T>(c: FreeJsonCall, validate: (raw: unknown) => T): Promise<{ data: T; model: string }> {
  const started = Date.now();
  const budget = c.budgetMs ?? 50_000;
  const attempts: string[] = [];
  for (const model of c.models) {
    const left = budget - (Date.now() - started);
    if (left < 6_000) { attempts.push("time budget used up"); break; }
    if ((cooldownUntil.get(model) ?? 0) > Date.now()) { attempts.push(`${model}: cooling down`); continue; }
    try {
      const r = model.startsWith("groq:") ? await callGroq(model.slice(5), c, Math.min(left, 40_000)) : await callGemini(model, c, Math.min(left, 40_000));
      if (r.status === 429) {
        const perDay = /PerDay/i.test(r.body);
        cooldownUntil.set(model, Date.now() + (perDay ? 3 * 3600_000 : 30_000));
        attempts.push(`${model}: quota${perDay ? " (day)" : ""}`);
        continue;
      }
      if (r.status !== 200) {
        if (r.status === 0 || r.status === 401 || r.status === 403) cooldownUntil.set(model, Date.now() + 10 * 60_000);
        else if (r.status >= 500) cooldownUntil.set(model, Date.now() + 20_000);
        attempts.push(`${model}: HTTP ${r.status}`);
        continue;
      }
      return { data: validate(extractJson(r.text)), model };
    } catch (e) {
      attempts.push(`${model}: ${String((e as Error)?.message ?? e).slice(0, 80)}`);
    }
  }
  throw new FreePoolExhausted(attempts);
}
