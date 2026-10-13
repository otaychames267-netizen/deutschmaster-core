/**
 * claude.server.ts — the single Claude Sonnet 5 entry point for every
 * server-side AI feature on the platform (Schreiben grading, Mündlich
 * evaluation, and any future text-grading feature). Centralizing this one
 * call means every caller gets the same timeout, retry/backoff, and
 * rate-limit classification for free, and a model bump only ever happens
 * in one place.
 *
 * Uses Claude's tool-forced JSON output (`tool_choice: {type:"tool", ...}`)
 * rather than "please respond with only JSON" prompting + markdown-fence
 * stripping — the model literally cannot return anything except an object
 * matching the given input_schema, which is materially more reliable than
 * text-parsing a free-form response (the pattern both prior graders used).
 */

export interface ClaudeToolCallParams {
  model?: string;
  system: string;
  userMessage: string;
  toolName: string;
  toolDescription: string;
  /** JSON Schema (draft-07-ish subset Anthropic's API accepts) for the tool's input. */
  inputSchema: Record<string, unknown>;
  maxTokens?: number;
  timeoutMs?: number;
  maxAttempts?: number;
}

export interface ClaudeToolCallResult<T> {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

const DEFAULT_MODEL = process.env.GRADING_MODEL ?? "claude-sonnet-5";

async function fetchWithTimeout(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Thrown for retryable transport/rate-limit failures — callers may retry the
 * whole operation (e.g. refund-and-let-the-student-resubmit); never retried
 * silently past maxAttempts inside this module without the caller knowing. */
export class ClaudeQuotaError extends Error {
  constructor(message = "Claude API quota/rate limit exceeded") {
    super(message);
    this.name = "ClaudeQuotaError";
  }
}

/** Thrown when the model's tool call arguments don't match what the caller's
 * own post-hoc validation expects — never retried, since retrying the exact
 * same deterministic-ish prompt won't fix a schema mismatch. */
export class ClaudeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeValidationError";
  }
}

async function callClaudeToolDirect<T = unknown>(params: ClaudeToolCallParams): Promise<ClaudeToolCallResult<T>> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const model = params.model ?? DEFAULT_MODEL;
  const maxAttempts = params.maxAttempts ?? 3;
  const timeoutMs = params.timeoutMs ?? 45000;
  const url = `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`;

  const body = {
    model,
    max_tokens: params.maxTokens ?? 1500,
    system: params.system,
    messages: [{ role: "user", content: params.userMessage }],
    tools: [{ name: params.toolName, description: params.toolDescription, input_schema: params.inputSchema }],
    tool_choice: { type: "tool", name: params.toolName },
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      }, timeoutMs);
      const json: any = await res.json();
      const errMsg = String(json?.error?.message ?? "");
      if (res.status === 429 || res.status === 529 || /credit balance is too low|insufficient|overloaded|quota/i.test(errMsg)) {
        throw new ClaudeQuotaError(errMsg || `Claude ${res.status}`);
      }
      if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);

      const toolUse = (json.content ?? []).find((c: any) => c.type === "tool_use" && c.name === params.toolName);
      if (!toolUse) throw new ClaudeValidationError("model did not call the required tool — no structured output returned");

      return {
        data: toolUse.input as T,
        model,
        inputTokens: Number(json.usage?.input_tokens ?? 0),
        outputTokens: Number(json.usage?.output_tokens ?? 0),
      };
    } catch (e) {
      lastErr = e;
      if (e instanceof ClaudeQuotaError || e instanceof ClaudeValidationError) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error(`Claude call failed after ${maxAttempts} attempts: ${String(lastErr)}`);
}

// ───────────────────────────── Backup LLM (DeepInfra) ─────────────────────────────
// Owner 2026-10-13: the Anthropic API balance hit $0 while the owner had no money to top it up ("ekhdem bdeepinfra tawa lin nzid flous fi claude").
// callClaudeTool() therefore falls back to open models on DeepInfra when Claude is unavailable (credit used up, rate limit / overloaded, transport failure) — Schreiben grading,
// the Prüfungssimulation and the tutor correction all go through here, so one place covers them. Claude is ALWAYS tried first (unless it reported "credit balance is too low" in the last
// 5 minutes); validation failures of Claude itself never fall back. The result's `model` is "deepinfra:<model>" so every stored grading says who graded it.
//
// Measured against Claude Sonnet 5 on 9 real graded essays (2026-10-13): Qwen3.8-Max ranks the essays exactly like Claude (Spearman 1.00) in ~16 s but is more generous (+5.6 points of 45 on
// average); gpt-oss-120b (reasoning_effort low, ~30 s) is noisier. Both are far cheaper (≈1 cent / <0.1 cent per essay vs ≈3.7 cents). Disable with LLM_FALLBACK=off.
const FALLBACK_MODELS = (process.env.LLM_FALLBACK_MODELS ?? "Qwen/Qwen3.8-Max,openai/gpt-oss-120b").split(",").map((m) => m.trim()).filter(Boolean);
const FALLBACK_BUDGET_MS = 52_000; // total wall time for all fallback attempts (the platform function limit is the real ceiling)
let claudeDownUntil = 0;

function fallbackEnabled(): boolean {
  return !!process.env.DEEPINFRA_API_KEY && (process.env.LLM_FALLBACK ?? "on").toLowerCase() !== "off" && FALLBACK_MODELS.length > 0;
}

/** Minimal JSON-Schema "required" check (objects/arrays/strings) — open models sometimes drop a nested required field, and a silent hole must not reach the student. */
function missingRequired(schema: any, value: any, path = ""): string | null {
  if (!schema || typeof schema !== "object") return null;
  if (schema.type === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return `${path || "root"} is not an object`;
    for (const k of schema.required ?? []) {
      const v = value[k];
      if (v === undefined || v === null || (typeof v === "string" && !v.trim())) return `${path}${k} missing or empty`;
    }
    for (const [k, sub] of Object.entries<any>(schema.properties ?? {})) {
      if (value[k] !== undefined) { const m = missingRequired(sub, value[k], `${path}${k}.`); if (m) return m; }
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) return `${path || "root"} is not an array`;
    for (let i = 0; i < value.length; i++) { const m = missingRequired(schema.items, value[i], `${path}[${i}].`); if (m) return m; }
  }
  return null;
}

async function callFallbackTool<T>(params: ClaudeToolCallParams): Promise<ClaudeToolCallResult<T>> {
  const key = process.env.DEEPINFRA_API_KEY;
  if (!key) throw new Error("DEEPINFRA_API_KEY not set");
  const started = Date.now();
  const errors: string[] = [];
  for (const model of FALLBACK_MODELS) {
    const reasoning = /gpt-oss/i.test(model);
    for (let attempt = 1; attempt <= 2; attempt++) {
      const left = FALLBACK_BUDGET_MS - (Date.now() - started);
      if (left < 8_000) { errors.push("time budget used up"); break; }
      try {
        const res = await fetchWithTimeout("https://api.deepinfra.com/v1/openai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({
            model, temperature: 0.2,
            max_tokens: Math.min(12_000, (params.maxTokens ?? 1500) * (reasoning ? 2 : 1)),
            ...(reasoning ? { reasoning_effort: "low" } : {}),
            messages: [{ role: "system", content: params.system }, { role: "user", content: params.userMessage }],
            tools: [{ type: "function", function: { name: params.toolName, description: params.toolDescription, parameters: params.inputSchema } }],
            tool_choice: { type: "function", function: { name: params.toolName } },
          }),
        }, Math.min(left, 45_000));
        const json: any = await res.json().catch(() => ({}));
        if (res.status === 402 || /balance|insufficient|payment/i.test(String(json?.error?.message ?? ""))) throw new ClaudeQuotaError(`DeepInfra balance: ${String(json?.error?.message ?? res.status)}`);
        if (!res.ok) { errors.push(`${model}: HTTP ${res.status}`); if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; } break; }
        const call = json.choices?.[0]?.message?.tool_calls?.[0];
        if (!call) { errors.push(`${model}: no tool call`); continue; }
        let data: any;
        try { data = JSON.parse(call.function.arguments); } catch { errors.push(`${model}: tool arguments are not JSON`); continue; }
        const hole = missingRequired(params.inputSchema, data);
        if (hole) { errors.push(`${model}: ${hole}`); continue; }
        return { data: data as T, model: `deepinfra:${model}`, inputTokens: Number(json.usage?.prompt_tokens ?? 0), outputTokens: Number(json.usage?.completion_tokens ?? 0) };
      } catch (e) {
        if (e instanceof ClaudeQuotaError) throw e;
        errors.push(`${model}: ${String((e as Error)?.message ?? e).slice(0, 80)}`);
      }
    }
  }
  throw new ClaudeQuotaError(`backup LLM unavailable (${errors.join("; ").slice(0, 300)})`);
}

/** Claude first; DeepInfra open models only when Claude is unavailable (see the block comment above). */
export async function callClaudeTool<T = unknown>(params: ClaudeToolCallParams): Promise<ClaudeToolCallResult<T>> {
  const canFallback = fallbackEnabled();
  if (!process.env.ANTHROPIC_API_KEY || (canFallback && Date.now() < claudeDownUntil)) {
    if (canFallback) return callFallbackTool<T>(params);
    return callClaudeToolDirect<T>(params); // throws "ANTHROPIC_API_KEY not set"
  }
  try {
    return await callClaudeToolDirect<T>(params);
  } catch (e) {
    const unavailable = e instanceof ClaudeQuotaError || (!(e instanceof ClaudeValidationError) && /Claude call failed after/.test(String((e as Error)?.message ?? e)));
    if (!unavailable || !canFallback) throw e;
    if (e instanceof ClaudeQuotaError && /credit balance is too low/i.test(e.message)) claudeDownUntil = Date.now() + 5 * 60_000; // don't pay a failing round trip to Anthropic on every request
    console.warn(`[llm] Claude unavailable (${String((e as Error)?.message ?? e).slice(0, 100)}) — using the DeepInfra backup (${FALLBACK_MODELS[0]})`);
    return callFallbackTool<T>(params);
  }
}
