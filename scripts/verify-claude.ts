import "dotenv/config";
async function main() {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
  if (!key) { console.log("FAIL: no key"); process.exit(1); }
  const t = Date.now();
  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: "user", content: "Reply with exactly: OK" }] }),
  });
  const j: any = await res.json();
  const dt = ((Date.now() - t) / 1000).toFixed(1);
  if (res.ok) console.log(`SUCCESS (${dt}s) model=${model} reply=${JSON.stringify(j.content?.[0]?.text)}`);
  else console.log(`FAIL ${res.status} (${dt}s): ${JSON.stringify(j).slice(0, 300)}`);
}
main().catch((e) => { console.log("ERR", String(e).slice(0, 200)); process.exit(1); });
