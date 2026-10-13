// Unit test (no network, fetch mocked): the tutor answers through the DeepInfra backup when Claude has no credit.   node --import tsx src/voice/tutorBackup.test.mjs
process.env.ANTHROPIC_API_KEY = "claude-key"; process.env.DEEPINFRA_API_KEY = "di-key"; delete process.env.TUTOR_FALLBACK;
const { generateTutorReply } = await import("./tutorBrain.ts");
let failed = 0; const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };
const realFetch = globalThis.fetch;
const sse = (pieces, usage) => new Response(new ReadableStream({ start(c) { const enc = new TextEncoder(); for (const p of pieces) c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`)); if (usage) c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [], usage })}\n\n`)); c.enqueue(enc.encode("data: [DONE]\n\n")); c.close(); } }), { status: 200 });
function mock(deepinfra) { const calls = []; globalThis.fetch = async (url, init) => { calls.push({ url: String(url), body: init?.body ? JSON.parse(init.body) : null, headers: init?.headers }); if (String(url).includes("anthropic")) return new Response(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } }), { status: 400 }); return deepinfra(String(url), calls.length); }; return calls; }
const ctx = { studentName: "Amal", level: "B2", teil1Topic: "Reise", stage: 1, counts: { teil1: 3, teil2: 4, teil3: 4 } };
const hist = [{ speaker: "examiner", text: "Bitte beginnen Sie." }, { speaker: "student", text: "Ich war letzten Sommer in Venedig." }];

// 1) Claude 400 "credit balance is too low" -> DeepInfra stream, same chunks reach the callback, usage is reported
{
  const chunks = []; let usage = null;
  const calls = mock(() => sse(["Amal, was hat Ihnen ", "in Venedig am besten gefallen?"], { prompt_tokens: 1200, completion_tokens: 14 }));
  const reply = await generateTutorReply(ctx, hist, { type: "system", text: "[SYSTEM] Stellen Sie die erste Frage." }, { onChunk: (c) => chunks.push(c), onUsage: (u) => { usage = u; } });
  const di = calls.find((c) => c.url.includes("deepinfra"));
  ok("Claude refused (credit) -> the reply comes from DeepInfra", /Venedig am besten gefallen/.test(reply), JSON.stringify(reply));
  ok("DeepInfra call: Mistral Small, streaming, own key, system prompt + the history in the user message", !!di && di.body.model === "mistralai/Mistral-Small-3.2-24B-Instruct-2506" && di.body.stream === true && di.headers.Authorization === "Bearer di-key" && di.body.messages[0].role === "system" && /Venedig/.test(di.body.messages[1].content) && /siezen Sie Amal/.test(di.body.messages[1].content));
  ok("chunks were handed to TTS and the usage was reported", chunks.join(" ").includes("Venedig") && usage?.inputTokens > 300 && usage?.outputTokens > 5);
}
// 2) after a "credit balance is too low" Claude is skipped for a while (no failing round trip per turn)
{
  const calls = mock(() => sse(["Wie lange waren Sie dort?"]));
  const reply = await generateTutorReply(ctx, hist, { type: "system", text: "[SYSTEM] Nächste Frage." }, {});
  ok("second turn goes straight to DeepInfra (Anthropic not called again)", /Wie lange/.test(reply) && calls.filter((c) => c.url.includes("anthropic")).length === 0 && calls.length === 1);
}
// 3) a backup reply that is not German / informal is rejected by the same guards and retried
{
  let n = 0; const calls = mock(() => (++n === 1 ? sse(["Hey, tell me more about your trip please."]) : sse(["Amal, wie war das Wetter dort?"])));
  const reply = await generateTutorReply(ctx, hist, { type: "system", text: "[SYSTEM] Nächste Frage." }, {});
  ok("English first reply is discarded, the retry (with the correction note) is spoken", /Wetter/.test(reply) && calls.length === 2 && /unzulässig/.test(calls[1].body.messages[1].content), JSON.stringify(reply));
}
// 4) TUTOR_FALLBACK=off -> the Claude error surfaces as before
{
  process.env.TUTOR_FALLBACK = "off"; const calls = mock(() => sse(["x"]));
  let err = null; try { await generateTutorReply(ctx, hist, { type: "system", text: "[SYSTEM] x" }, {}); } catch (e) { err = e; }
  ok("fallback off -> ExaminerBrainError about the credit balance", err && /credit balance/.test(err.message) && calls.every((c) => c.url.includes("anthropic")), String(err?.message).slice(0, 60));
  delete process.env.TUTOR_FALLBACK;
}
globalThis.fetch = realFetch;
console.log(failed ? `\n${failed} FAILED` : "\nall passed"); process.exit(failed ? 1 : 0);
