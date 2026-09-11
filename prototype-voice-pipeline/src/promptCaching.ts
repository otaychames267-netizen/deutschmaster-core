/**
 * promptCaching.ts — Cartesia-independent. Tests whether splitting the
 * system prompt into a cached (session-stable: name/topic/level) block and
 * a dynamic (per-turn: remaining-follow-ups count) block actually triggers
 * Anthropic prompt caching, and if so, whether it measurably helps TTFT.
 *
 * Two things this deliberately does NOT assume, and checks for real:
 * 1. Whether caching activates at all — the cached block here is well
 *    under Anthropic's documented 1024-token minimum for Sonnet, so a
 *    negative result (cache_read_input_tokens always 0/undefined) is a
 *    real, expected-possible outcome, not a bug.
 * 2. Whether Claude's connection keep-alive (already applied, separately
 *    measured) is doing most of the work — this test also runs a matching
 *    "no session state changes" control isn't needed since keep-alive
 *    applies to both calls equally; this isolates the CACHING variable
 *    specifically via the usage.cache_read_input_tokens field.
 *
 * Realistic inter-turn gap (5-10s, matching real exam pacing) is used
 * rather than back-to-back calls, per the standing instruction to test
 * keep-alive/caching benefit under real-world timing, not an optimistic
 * best case.
 */
import "dotenv/config";
import { getExaminerReplyStreaming } from "./claudeExaminerBrain.js";
import { makeInitialExamState } from "./examState.js";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTurn(label: string, state: ReturnType<typeof makeInitialExamState>, candidateText: string) {
  const t0 = Date.now();
  let firstTokenAt = 0;
  const result = await getExaminerReplyStreaming(state, candidateText, {
    onFirstToken(atMs) { firstTokenAt = atMs; },
  });
  const ttft = firstTokenAt - t0;
  console.log(
    `${label}: TTFT=${ttft}ms  inputTokens=${result.inputTokens}  cacheCreate=${result.cacheCreationInputTokens ?? "n/a"}  cacheRead=${result.cacheReadInputTokens ?? "n/a"}  reply="${result.reply.slice(0, 60)}..."`,
  );
  state.history.push({ speaker: "candidate", text: candidateText });
  state.history.push({ speaker: "examiner", text: result.reply });
  state.followUpsAsked++;
  return { ttft, result };
}

async function main() {
  const state = makeInitialExamState();
  console.log(`Session: candidate=${state.candidateName} topic="${state.candidateTopic}" level=${state.level}`);
  console.log("--- Realistic multi-turn session, 6s gaps between turns (matches real exam pacing) ---\n");

  const candidateTexts = [
    "Ich habe über die Vorteile von Homeoffice gesprochen, besonders die Zeitersparnis beim Pendeln.",
    "Ein weiterer Punkt war die bessere Vereinbarkeit von Familie und Beruf, die viele Kollegen erwähnt haben.",
    "Zum Schluss habe ich noch die möglichen Nachteile wie soziale Isolation angesprochen.",
    "Ich denke, insgesamt überwiegen die Vorteile, wenn man die Arbeit gut strukturiert.",
  ];

  const turns: { ttft: number; cacheCreate?: number; cacheRead?: number }[] = [];
  for (let i = 0; i < candidateTexts.length; i++) {
    const { ttft, result } = await runTurn(`turn ${i}`, state, candidateTexts[i]);
    turns.push({ ttft, cacheCreate: result.cacheCreationInputTokens, cacheRead: result.cacheReadInputTokens });
    if (i < candidateTexts.length - 1) await sleep(6000);
  }

  console.log("\n--- Summary ---");
  const cacheEverActivated = turns.some((t) => (t.cacheRead ?? 0) > 0);
  console.log(`Cache read activated on any turn: ${cacheEverActivated}`);
  if (turns[0]) console.log(`Turn 0 (cache write) TTFT: ${turns[0].ttft}ms`);
  const laterTtfts = turns.slice(1).map((t) => t.ttft);
  if (laterTtfts.length) {
    const avg = laterTtfts.reduce((a, b) => a + b, 0) / laterTtfts.length;
    console.log(`Turns 1+ avg TTFT: ${avg.toFixed(0)}ms (range ${Math.min(...laterTtfts)}-${Math.max(...laterTtfts)}ms)`);
  }
}
main().catch((e) => console.log("ERR", String(e).slice(0, 500)));
