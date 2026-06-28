/**
 * vision-provider.ts — provider-independent vision abstraction.
 *
 * The pipeline calls getVisionProvider().generateJSON(prompt, images) and never
 * hardcodes a vendor. Gemini is the default implementation today; OpenAI/Claude/
 * a local VLM can be added as new implementations with no changes to the
 * extraction or validation layers. Selection is via VISION_PROVIDER env.
 *
 * Contract: generateJSON returns parsed JSON, throws Error("QUOTA_429") on quota
 * exhaustion (so the pipeline fails fast), and honors an AbortSignal.
 */

export interface VisionProvider {
  readonly name: string;
  /** Send a prompt + base64 PNG images, get back parsed JSON. */
  generateJSON(prompt: string, imagesB64: string[], signal?: AbortSignal): Promise<any>;
}

async function fetchT(url: string, opts: any, ms = 28000, ext?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (ext) { if (ext.aborted) ctrl.abort(); else ext.addEventListener("abort", onAbort); }
  const timer = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(timer); if (ext) ext.removeEventListener("abort", onAbort); }
}

class GeminiProvider implements VisionProvider {
  readonly name = "gemini";
  private model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  async generateJSON(prompt: string, imagesB64: string[], signal?: AbortSignal): Promise<any> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not set");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${key}`;
    const parts: any[] = [{ text: prompt }];
    for (const b64 of imagesB64) parts.push({ inline_data: { mime_type: "image/png", data: b64 } });
    const body = { contents: [{ parts }], generationConfig: { temperature: 0, response_mime_type: "application/json", thinkingConfig: { thinkingBudget: 0 } } };

    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal?.aborted) throw new Error("aborted");
      try {
        const res = await fetchT(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }, 28000, signal);
        const json: any = await res.json();
        if (res.status === 429) throw new Error("QUOTA_429");
        if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
        return JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
      } catch (e) {
        lastErr = e;
        if (String(e).includes("QUOTA_429")) throw e;
        if (signal?.aborted || String(e).includes("abort")) throw new Error("aborted");
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    throw new Error(`vision(${this.name}) failed: ${String(lastErr)}`);
  }
}

class ClaudeProvider implements VisionProvider {
  readonly name = "claude";
  private model = process.env.CLAUDE_MODEL ?? "claude-opus-4-8";
  async generateJSON(prompt: string, imagesB64: string[], signal?: AbortSignal): Promise<any> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY not set");
    const url = `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`;
    const content: any[] = [{ type: "text", text: prompt + "\n\nReturn ONLY valid JSON, no prose, no markdown fences." }];
    for (const b64 of imagesB64) content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: b64 } });
    const body = { model: this.model, max_tokens: 8192, temperature: 0, messages: [{ role: "user", content }] };
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal?.aborted) throw new Error("aborted");
      try {
        const res = await fetchT(url, { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify(body) }, 45000, signal);
        const json: any = await res.json();
        // Treat rate-limit, overload, AND insufficient-credit as a quota signal so
        // the pipeline fails fast and the caller falls back to the local workflow.
        const msg = String(json?.error?.message ?? "");
        if (res.status === 429 || res.status === 529 || /credit balance is too low|insufficient|quota/i.test(msg)) throw new Error("QUOTA_429");
        if (!res.ok) throw new Error(`Claude ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
        let text = json.content?.[0]?.text ?? "{}";
        text = text.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
        return JSON.parse(text);
      } catch (e) {
        lastErr = e;
        if (String(e).includes("QUOTA_429")) throw e;
        if (signal?.aborted || String(e).includes("abort")) throw new Error("aborted");
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    throw new Error(`vision(${this.name}) failed: ${String(lastErr)}`);
  }
}

// Provider selection — fully swappable, no pipeline changes required.
let _provider: VisionProvider | null = null;
export function getVisionProvider(): VisionProvider {
  if (_provider) return _provider;
  const choice = (process.env.VISION_PROVIDER ?? (process.env.ANTHROPIC_API_KEY ? "claude" : "gemini")).toLowerCase();
  switch (choice) {
    case "claude": _provider = new ClaudeProvider(); break;
    // case "openai": _provider = new OpenAIProvider(); break;
    default: _provider = new GeminiProvider();
  }
  return _provider;
}
