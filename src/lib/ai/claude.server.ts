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

export async function callClaudeTool<T = unknown>(params: ClaudeToolCallParams): Promise<ClaudeToolCallResult<T>> {
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
