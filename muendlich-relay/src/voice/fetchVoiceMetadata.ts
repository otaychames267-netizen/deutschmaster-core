/**
 * One-shot utility: fetches real metadata for every voice in voices.config.ts
 * from ElevenLabs' GET /v1/voices/{id} API and prints an updated
 * voices.config.ts body to stdout, ready to review and commit.
 *
 * Requires an ELEVENLABS_API_KEY with the `voices_read` permission — the
 * dev key this system was originally built against does NOT have that
 * permission (verified live: every call returned 401 "missing_permissions
 * ... voices_read"), which is why voices.config.ts ships with every
 * descriptive field unset. Re-run this the moment a properly-scoped key is
 * available:
 *
 *   npx tsx src/voice/fetchVoiceMetadata.ts > src/voice/voices.config.ts
 *
 * then diff/review before committing — this OVERWRITES voices.config.ts,
 * it doesn't merge, so any manually-added `pools` tags would need
 * re-applying (or extend this script to preserve them if that becomes a
 * real workflow).
 */
import { VOICES } from "./voices.config.js";

interface RawVoiceLabels {
  gender?: string;
  age?: string;
  accent?: string;
  description?: string;
  use_case?: string;
  [key: string]: string | undefined;
}

async function fetchOne(voiceId: string, key: string) {
  const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, { headers: { "xi-api-key": key } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { voiceId, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
  }
  const json: any = await res.json();
  const labels: RawVoiceLabels = json.labels ?? {};
  return {
    voiceId,
    name: json.name as string | undefined,
    gender: labels.gender as "male" | "female" | undefined,
    ageRange: labels.age,
    accent: labels.accent,
    description: json.description ?? labels.description,
    language: labels.language ?? undefined,
  };
}

async function main() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY not set");

  const results = await Promise.all(VOICES.map((v) => fetchOne(v.voiceId, key)));
  const failures = results.filter((r) => "error" in r);
  if (failures.length > 0) {
    console.error(`${failures.length}/${VOICES.length} voices failed to fetch — printing what succeeded, review stderr for the rest:`);
    for (const f of failures) console.error(`  ${f.voiceId}: ${(f as any).error}`);
  }

  const entries = results.map((r) => {
    if ("error" in r) {
      const original = VOICES.find((v) => v.voiceId === r.voiceId)!;
      return `  { voiceId: "${r.voiceId}", enabled: ${original.enabled} }, // fetch failed, kept as-is`;
    }
    const fields = [`voiceId: "${r.voiceId}"`];
    if (r.name) fields.push(`name: ${JSON.stringify(r.name)}`);
    if (r.gender === "male" || r.gender === "female") fields.push(`gender: "${r.gender}"`);
    if (r.ageRange) fields.push(`ageRange: ${JSON.stringify(r.ageRange)}`);
    if (r.accent) fields.push(`accent: ${JSON.stringify(r.accent)}`);
    if (r.description) fields.push(`description: ${JSON.stringify(r.description)}`);
    if (r.language) fields.push(`language: ${JSON.stringify(r.language)}`);
    fields.push("enabled: true");
    return `  { ${fields.join(", ")} },`;
  });

  console.log(`import type { VoiceProfile } from "./voiceProfiles.js";\n\nexport const VOICES: VoiceProfile[] = [\n${entries.join("\n")}\n];\n`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
