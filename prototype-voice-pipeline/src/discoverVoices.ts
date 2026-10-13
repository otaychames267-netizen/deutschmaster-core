/**
 * discoverVoices.ts — maintenance utility. Calls Cartesia's real /voices API
 * (X-API-Key + Cartesia-Version headers, confirmed working live) and lists
 * every voice with language==="de" in this account's library.
 *
 * Re-run this if the account's voice library changes, and copy its output
 * into voicePool.ts's GERMAN_VOICE_POOL by hand — never hand-type or guess
 * voice IDs, they must come from this live API response.
 */
import "dotenv/config";

interface CartesiaVoice {
  id: string;
  name: string;
  language: string;
  gender?: string;
}

async function fetchAllVoices(key: string): Promise<CartesiaVoice[]> {
  const version = "2026-01-01";
  const all: CartesiaVoice[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 30; page++) {
    const url = new URL("https://api.cartesia.ai/voices");
    if (cursor) url.searchParams.set("starting_after", cursor);
    const res = await fetch(url, { headers: { "X-API-Key": key, "Cartesia-Version": version } });
    if (!res.ok) throw new Error(`Cartesia /voices ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json: any = await res.json();
    all.push(...(json.data ?? []));
    if (!json.has_more || !json.next_page) break;
    cursor = json.next_page;
  }
  return all;
}

async function main() {
  const key = process.env.CARTESIA_API_KEY;
  if (!key) { console.log("FAIL: CARTESIA_API_KEY not set"); process.exit(1); }

  const all = await fetchAllVoices(key);
  const german = all.filter((v) => v.language === "de");
  console.log(`${all.length} total voices in account, ${german.length} with language==="de":\n`);
  for (const v of german) {
    console.log(`  { id: "${v.id}", name: "${v.name}", gender: "${v.gender ?? "unknown"}" },`);
  }
}
main().catch((e) => { console.log("ERR", String(e).slice(0, 300)); process.exit(1); });
