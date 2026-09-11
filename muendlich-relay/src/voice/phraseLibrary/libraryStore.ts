/**
 * Runtime lookup for the pre-generated fixed-phrase audio library —
 * separate from generateLibrary.ts (which WRITES the library, offline,
 * once) so the live exam path only ever needs a cheap manifest read, never
 * touches ElevenLabs for these categories. See generateLibrary.ts's header
 * for why this is currently unpopulated (account-tier block) and how
 * muendlichVoiceSession.ts falls back safely when it is.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PhraseAudioAsset, LibraryCategory } from "./phraseTypes.js";
import { assignPhraseStyle } from "./voiceStyle.js";
import { pickVariant } from "./phraseSelection.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_ROOT = path.resolve(__dirname, "../../../audio-library");

let cachedManifest: PhraseAudioAsset[] | null = null;

async function loadManifest(): Promise<PhraseAudioAsset[]> {
  if (cachedManifest) return cachedManifest;
  try {
    const raw = await readFile(path.join(LIBRARY_ROOT, "manifest.json"), "utf8");
    cachedManifest = JSON.parse(raw) as PhraseAudioAsset[];
  } catch {
    // No manifest yet (library never generated, or wrong working directory)
    // — treated as "library empty," not a fatal error. Cached as [] so a
    // missing file doesn't mean re-reading disk on every single call.
    cachedManifest = [];
  }
  return cachedManifest;
}

/** Invalidate the in-memory cache — used by library-related tests so they
 * can point at a fixture manifest without restarting the process. */
export function _resetManifestCacheForTests(): void {
  cachedManifest = null;
}

export async function pickLibraryAsset(
  category: LibraryCategory,
  voiceId: string,
  topic?: string,
): Promise<{ asset: PhraseAudioAsset; absolutePath: string } | null> {
  const manifest = await loadManifest();
  const forVoice = manifest.filter((a) => a.category === category && a.voiceId === voiceId && (topic === undefined || a.topic === topic));
  if (forVoice.length === 0) return null;

  const chosen = pickVariant(
    `library_${category}_${voiceId}_${topic ?? ""}`,
    forVoice.map((a) => ({ id: a.phraseId, style: a.style, asset: a })),
    assignPhraseStyle(voiceId),
  );
  return { asset: chosen.asset, absolutePath: path.join(LIBRARY_ROOT, chosen.asset.pcmPath) };
}
