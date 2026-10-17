/**
 * spelling.server.ts — deterministic, zero-tolerance spelling check (owner 2026-10-17: "stricter, forgive not even a single letter").
 *
 * Full Hunspell (hunspell-asm, pure JS) with the igerman98 German dictionary — NOT nspell, which mis-reads the German affix rules and flags perfectly valid forms like "meinen", "würde".
 * A model can overlook "fur" for "für" or "Entäuschung" for "Enttäuschung"; a dictionary cannot. Only server-side (the dictionary is GPL data and is never shipped to the browser).
 *
 * What counts as a spelling error: a lowercase-initial word the dictionary does not know (that also covers lowercase nouns = capitalisation errors, missing umlauts, swapped/missing letters,
 * "ss" for "ß"). Capitalised unknown words are NOT counted here (names, places, brands — the LLM observer still flags real misspelled nouns). Ignored: words that occur in the task text,
 * e-mail addresses / URLs, and the signature block (last two non-empty lines, where learners write their own — often lowercase — names).
 */
import affRaw from "./dict/de.aff?raw";
import dicRaw from "./dict/de.dic?raw";
// the CommonJS build on purpose: the ESM build does `import * as runtime` of an Emscripten CJS module, which a bundler turns into a namespace object ("runtimeModule is not a function")
// @ts-expect-error — the CJS entry has no type declarations of its own; the types are the package's
import { loadModule } from "hunspell-asm/dist/cjs/index.js";

interface Speller { spell(word: string): boolean; suggest(word: string): string[] }

let spellerPromise: Promise<Speller | null> | null = null;

function getSpeller(): Promise<Speller | null> {
  spellerPromise ??= (async () => {
    try {
      // the Emscripten glue (WASM is embedded as a data URI) reads a free `__dirname`, which does not exist in the bundled ESM server build
      (globalThis as { __dirname?: string }).__dirname ??= "/";
      const factory = await loadModule();
      const aff = factory.mountBuffer(Buffer.from(affRaw, "utf8"), "de.aff");
      const dic = factory.mountBuffer(Buffer.from(dicRaw, "utf8"), "de.dic");
      return factory.create(aff, dic) as unknown as Speller;
    } catch (e) {
      console.warn("[spelling] dictionary could not be loaded — spelling penalty skipped:", String((e as Error)?.message ?? e).slice(0, 160));
      return null;
    }
  })();
  return spellerPromise;
}

export interface SpellingError { word: string; fix: string | null }

export async function findSpellingErrors(essay: string, task: string): Promise<SpellingError[]> {
  const sp = await getSpeller();
  if (!sp) return [];
  const taskLower = task.toLowerCase();
  // character ranges to ignore: e-mail addresses, URLs, the signature block
  const skip: [number, number][] = [];
  for (const m of essay.matchAll(/\S+@\S+|(?:https?:\/\/|www\.)\S+/gi)) skip.push([m.index!, m.index! + m[0].length]);
  const lines = [...essay.matchAll(/[^\n]*\S[^\n]*/g)];
  for (const m of lines.slice(-2)) skip.push([m.index!, m.index! + m[0].length]);
  const inSkip = (i: number) => skip.some(([a, b]) => i >= a && i < b);

  const out: SpellingError[] = [];
  for (const m of essay.matchAll(/[A-Za-zÄÖÜäöüß]{3,}/g)) {
    const w = m[0];
    if (taskLower.includes(w.toLowerCase()) || inSkip(m.index!) || sp.spell(w)) continue;
    if (/^[a-zäöüß]/.test(w)) { out.push({ word: w, fix: null }); continue; }
    // capitalised unknown word: a name/place/brand — EXCEPT at the start of a sentence, where every word is capitalised anyway; there the lower-case form decides ("Ausserdem")
    const before = essay.slice(0, m.index!).trimEnd();
    const sentenceStart = before === "" || /[.!?:]$/.test(before) || /\n\s*$/.test(essay.slice(0, m.index!));
    if (sentenceStart && w !== w.toUpperCase() && !sp.spell(w[0].toLowerCase() + w.slice(1))) out.push({ word: w, fix: null });
  }
  // corrections only for the first few (they are only shown to the student)
  for (const e of out.slice(0, 8)) e.fix = bestFix(sp, e.word);
  return out;
}

const plain = (s: string) => s.toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss");

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** First try the typical learner slips (missing umlaut / ß: "fur" → "für", "ausserdem" → "außerdem"), then the closest dictionary suggestion. */
function bestFix(sp: Speller, word: string): string | null {
  const variants = new Set<string>();
  const swaps: [RegExp, string][] = [[/a/g, "ä"], [/o/g, "ö"], [/u/g, "ü"], [/ss/g, "ß"], [/A/g, "Ä"], [/O/g, "Ö"], [/U/g, "Ü"]];
  for (const [re, rep] of swaps) for (const m of word.matchAll(re)) variants.add(word.slice(0, m.index!) + rep + word.slice(m.index! + m[0].length));
  const valid = [...variants].filter((v) => sp.spell(v));
  if (valid.length) return valid[0];
  try {
    const sug = sp.suggest(word).filter((s) => !s.startsWith("-"));
    if (!sug.length) return null;
    return [...sug].sort((x, y) => distance(plain(word), plain(x)) - distance(plain(word), plain(y)))[0];
  } catch { return null; }
}
