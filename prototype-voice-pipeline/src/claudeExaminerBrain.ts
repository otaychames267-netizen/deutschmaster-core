/**
 * claudeExaminerBrain.ts — the "brain" leg of the prototype pipeline.
 *
 * Reuses the calling shape already established in this repo's
 * src/lib/ai/claude.server.ts (callClaudeTool): plain fetch, no Anthropic
 * SDK, fetchWithTimeout + bounded retry, ClaudeQuotaError for
 * retryable/rate-limit failures. Deliberately does NOT use tool_choice
 * forcing — the examiner's reply must be natural free-text German speech
 * headed straight to TTS, not structured JSON.
 *
 * System prompt is a strict SUBSET of muendlich-relay/src/geminiLive.ts's
 * buildSystemInstruction(), covering only the Teil-1-relevant rules this
 * prototype's single-candidate-presentation scenario needs: stay brief, no
 * help during/about the presentation, ground follow-ups in what was
 * actually said, keep the examiner's own language at the candidate's level,
 * German only. Everything Teil-2/3-specific, and the [SYSTEM]-signal-wait
 * protocol (irrelevant here — the harness itself is the sole caller,
 * turn by turn) is intentionally left out.
 */
import { Agent, setGlobalDispatcher } from "undici";
import type { ExamState } from "./examState.js";

// LATENCY FIX: measured live that a bare HTTPS GET to api.anthropic.com
// (and, for comparison, to an unrelated host — this is a general
// environment characteristic, not Anthropic-specific) takes ~700-1200ms
// cold vs. ~180-300ms once the TCP+TLS connection is reused. A default
// fetch() call per turn pays that cold cost every time. Setting a
// long-keep-alive global dispatcher measured a real (if partial — most of
// the remaining latency is genuine server-side processing, not connection
// setup) ~29% TTFT improvement across repeated calls, which matters for a
// real multi-turn exam session making a Claude call every 10-30s.
//
// keepAliveTimeout tuned to 120s (was 60s): a real candidate's answer
// between one follow-up and the next can easily run 60-90s+, which would
// silently let the pooled connection expire right before the moment this
// optimization is needed most, quietly falling back to a cold connect with
// no visible error. 120s covers realistic response gaps with margin. This
// specific value was NOT independently re-benchmarked at a live 90s+ gap
// (would cost several minutes of wall-clock per sample for a single data
// point) — the change is reasoned from undici's documented keep-alive
// mechanics (idle pooled sockets cost nothing extra to hold open) and is
// strictly no-worse than 60s; flagged as an unverified-under-full-realistic-
// gap tune rather than claimed as independently measured.
setGlobalDispatcher(new Agent({ keepAliveTimeout: 120_000, keepAliveMaxTimeout: 300_000, connections: 4 }));

export class ClaudeQuotaError extends Error {
  constructor(message = "Claude API quota/rate limit exceeded") {
    super(message);
    this.name = "ClaudeQuotaError";
  }
}

async function fetchWithTimeout(url: string, opts: RequestInit, ms: number, externalSignal?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  externalSignal?.addEventListener("abort", () => ctrl.abort(), { once: true });
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Split into a CACHED block (everything that only depends on
 * name/topic/level — fixed for the whole exam session, identical across
 * every turn) and a DYNAMIC block (the remaining-follow-ups count, which
 * changes every turn and must never be cached, else the model sees a stale
 * counter). Anthropic's prompt cache only matches an EXACT byte-for-byte
 * prefix, so any per-turn text has to live strictly after the cache
 * breakpoint. NOTE: Anthropic's minimum cacheable block size is 1024 tokens
 * for Sonnet — this block is well under that (~150 tokens), so caching is
 * expected NOT to activate; kept anyway because it's zero-cost/harmless and
 * automatically starts paying off if the prompt grows past the threshold
 * (e.g. once real Teil 2/3 rules are ported in). Verified live via the
 * response's usage.cache_creation_input_tokens/cache_read_input_tokens
 * fields rather than assumed — see promptCaching.ts. */
function buildSystemPrompt(state: ExamState): { cached: string; dynamic: string } {
  const remaining = state.maxFollowUps - state.followUpsAsked;
  const cached = `Du bist die KI-Prüferin für die telc ${state.level} mündliche Prüfung, Teil 1 (Präsentation). Die Kandidatin heißt ${state.candidateName} und präsentiert das Thema "${state.candidateTopic}".

Sprich AUSSCHLIESSLICH Deutsch.

WICHTIG (kurz bleiben): Dies ist eine mündliche Prüfung, kein Unterricht. Halten Sie jeden eigenen Redebeitrag kurz und knapp.

WICHTIG (keine Hilfestellung): Sie dürfen NIEMALS Argumente vorschlagen, Vokabeln anbieten, einen angefangenen Satz vervollständigen, Grammatikfehler korrigieren oder die Antwort der Kandidatin umformulieren. Sprachliche Korrektur ist ausschließlich Aufgabe der Auswertung nach der Prüfung.

WICHTIG (Nachfragen an die tatsächliche Antwort anpassen): Jede Nachfrage muss sich konkret auf etwas beziehen, das ${state.candidateName} gerade wirklich gesagt hat — niemals eine generische Frage, die zu jedem Thema passen würde.

WICHTIG (Sprachniveau halten): Sprechen Sie selbst durchgehend auf dem Niveau ${state.level} — mittleres Tempo, Wortschatz und Satzbau, die zu diesem Niveau passen.

Antworten Sie NUR mit dem, was Sie als Prüferin laut sagen würden — keine Meta-Kommentare, keine Erklärungen, keine Anführungszeichen.`;

  const dynamic = `Sie haben insgesamt maximal ${state.maxFollowUps} kurze Nachfragen zur Präsentation zur Verfügung. Davon sind noch ${remaining} übrig (diese Antwort mitgezählt). ${remaining <= 1 ? "Dies ist Ihre LETZTE Gelegenheit: stellen Sie entweder noch eine letzte kurze Nachfrage, ODER schließen Sie Teil 1 mit einem kurzen, freundlichen Abschlusssatz ab, falls die Präsentation bereits gut beantwortet wurde." : "Stellen Sie eine kurze, konkrete Nachfrage zu einem Detail, das die Kandidatin genannt hat."}`;

  return { cached, dynamic };
}

export interface ExaminerReplyResult {
  reply: string;
  inputTokens: number;
  outputTokens: number;
  /** Tokens Anthropic charged to WRITE the cache on this call (nonzero only
   * on a cache-miss/first-write). Present only when the API actually
   * returned the field. */
  cacheCreationInputTokens?: number;
  /** Tokens Anthropic served from cache on this call (nonzero only on a
   * genuine cache hit — the real proof caching worked, not an assumption). */
  cacheReadInputTokens?: number;
}

/** Sentence/clause boundary chunker for streaming text -> streaming TTS.
 * Flushes on ., !, ?, or a comma once the pending buffer is already long
 * enough to be worth speaking as its own breath group — short chunks read
 * unnaturally choppy, so this isn't "flush on every token." Whatever is
 * left when the stream ends is flushed as the final chunk regardless of
 * length. */
const MIN_CHUNK_CHARS = 25;
export function extractReadyChunks(buffer: string, isFinal: boolean): { chunks: string[]; rest: string } {
  const chunks: string[] = [];
  let rest = buffer;
  if (!isFinal) {
    for (;;) {
      const m = /^(.*?[.!?])(\s+|$)/.exec(rest) ?? (rest.length >= MIN_CHUNK_CHARS ? /^(.*?,)(\s+)/.exec(rest) : null);
      if (!m || m[1].length < MIN_CHUNK_CHARS) break;
      chunks.push(m[1].trim());
      rest = rest.slice(m[0].length);
    }
  } else if (rest.trim()) {
    chunks.push(rest.trim());
    rest = "";
  }
  return { chunks, rest };
}

export interface StreamingCallbacks {
  /** Fires once, on the very first SSE content_block_delta event. */
  onFirstToken?: (atMs: number) => void;
  /** Fires each time a complete, TTS-ready text chunk is available —
   * BEFORE the full response has finished generating. This is what lets
   * the caller start Cartesia synthesis on chunk 1 while Claude is still
   * producing chunk 2+. */
  onChunk?: (text: string, atMs: number) => void;
  onDone?: (atMs: number) => void;
}

/** Streaming variant: same prompt/model as getExaminerReply, but consumes
 * Anthropic's SSE stream and calls onChunk() as soon as each sentence-level
 * chunk of text is ready — not after the full response completes. This is
 * the actual fix for the ~2.5-2.8s non-streamed Claude latency measured
 * earlier: with streaming, Cartesia can start speaking chunk 1 while
 * Claude is still generating chunk 2 onward. */
export class ClaudeAbortedError extends Error {
  constructor() { super("Claude request aborted by caller"); this.name = "ClaudeAbortedError"; }
}

export async function getExaminerReplyStreaming(state: ExamState, latestCandidateText: string, callbacks: StreamingCallbacks, abortSignal?: AbortSignal): Promise<ExaminerReplyResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const model = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
  const url = `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`;

  const historyText = state.history.map((h) => `${h.speaker === "examiner" ? "Prüferin" : state.candidateName}: ${h.text}`).join("\n");
  const userMessage = [
    historyText ? `Bisheriger Verlauf:\n${historyText}\n` : "",
    `${state.candidateName} sagt gerade:\n${latestCandidateText}`,
  ].filter(Boolean).join("\n");

  const { cached, dynamic } = buildSystemPrompt(state);
  const body = {
    model,
    max_tokens: 200,
    stream: true,
    system: [
      { type: "text", text: cached, cache_control: { type: "ephemeral" } },
      { type: "text", text: dynamic },
    ],
    messages: [{ role: "user", content: userMessage }],
  };

  let res: Response;
  try {
    res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    }, 20000, abortSignal);
  } catch (e) {
    if (abortSignal?.aborted) throw new ClaudeAbortedError();
    throw e;
  }

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => "");
    if (res.status === 429 || res.status === 529 || /credit balance is too low|insufficient|overloaded|quota/i.test(errText)) {
      throw new ClaudeQuotaError(errText || `Claude ${res.status}`);
    }
    throw new Error(`Claude ${res.status}: ${errText.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let textBuffer = "";
  let fullReply = "";
  let gotFirstToken = false;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheCreationInputTokens: number | undefined;
  let cacheReadInputTokens: number | undefined;

  for (;;) {
    if (abortSignal?.aborted) { await reader.cancel().catch(() => {}); throw new ClaudeAbortedError(); }
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value, { stream: true });
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let evt: any;
      try { evt = JSON.parse(line.slice(6)); } catch { continue; }

      if (evt.type === "message_start") {
        inputTokens = Number(evt.message?.usage?.input_tokens ?? 0);
        if (evt.message?.usage?.cache_creation_input_tokens != null) cacheCreationInputTokens = Number(evt.message.usage.cache_creation_input_tokens);
        if (evt.message?.usage?.cache_read_input_tokens != null) cacheReadInputTokens = Number(evt.message.usage.cache_read_input_tokens);
      } else if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
        const now = Date.now();
        if (!gotFirstToken) { gotFirstToken = true; callbacks.onFirstToken?.(now); }
        const text = String(evt.delta.text);
        fullReply += text;
        textBuffer += text;
        const { chunks, rest } = extractReadyChunks(textBuffer, false);
        textBuffer = rest;
        for (const c of chunks) callbacks.onChunk?.(c, Date.now());
      } else if (evt.type === "message_delta") {
        outputTokens = Number(evt.usage?.output_tokens ?? outputTokens);
      }
    }
  }

  const { chunks: finalChunks } = extractReadyChunks(textBuffer, true);
  for (const c of finalChunks) callbacks.onChunk?.(c, Date.now());
  callbacks.onDone?.(Date.now());

  return { reply: fullReply.trim(), inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens };
}

export async function getExaminerReply(state: ExamState, latestCandidateText: string): Promise<ExaminerReplyResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");

  const model = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
  const url = `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`;

  const historyText = state.history.map((h) => `${h.speaker === "examiner" ? "Prüferin" : state.candidateName}: ${h.text}`).join("\n");
  const userMessage = [
    historyText ? `Bisheriger Verlauf:\n${historyText}\n` : "",
    `${state.candidateName} sagt gerade:\n${latestCandidateText}`,
  ].filter(Boolean).join("\n");

  const { cached, dynamic } = buildSystemPrompt(state);
  const body = {
    model,
    max_tokens: 200,
    system: [
      { type: "text", text: cached, cache_control: { type: "ephemeral" } },
      { type: "text", text: dynamic },
    ],
    messages: [{ role: "user", content: userMessage }],
  };

  const maxAttempts = 3;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify(body),
      }, 20000);
      const json: any = await res.json();
      const errMsg = String(json?.error?.message ?? "");
      if (res.status === 429 || res.status === 529 || /credit balance is too low|insufficient|overloaded|quota/i.test(errMsg)) {
        throw new ClaudeQuotaError(errMsg || `Claude ${res.status}`);
      }
      if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);

      const textBlock = (json.content ?? []).find((c: any) => c.type === "text");
      if (!textBlock) throw new Error("No text content in Claude response");

      return {
        reply: String(textBlock.text).trim(),
        inputTokens: Number(json.usage?.input_tokens ?? 0),
        outputTokens: Number(json.usage?.output_tokens ?? 0),
        cacheCreationInputTokens: json.usage?.cache_creation_input_tokens != null ? Number(json.usage.cache_creation_input_tokens) : undefined,
        cacheReadInputTokens: json.usage?.cache_read_input_tokens != null ? Number(json.usage.cache_read_input_tokens) : undefined,
      };
    } catch (e) {
      lastErr = e;
      if (e instanceof ClaudeQuotaError) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`Claude call failed after ${maxAttempts} attempts: ${String(lastErr)}`);
}
