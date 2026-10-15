// Cuts the spoken teacher tag out of the audio files (snapping the cut points to the quietest moment next to each detected span) and re-encodes to AAC.
// usage: node tag-cut.mjs [only-path-substring]   reads tag-spans-valid.json, writes out/<teilN>/<file>.m4a and cuts.json (cut list + old->new time map for audio-based learning aids)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const spansAll = JSON.parse(fs.readFileSync(process.env.SPANS ?? "tag-spans-valid.json", "utf8"));
const only = process.argv[2];
fs.mkdirSync("out", { recursive: true });
const CUTS = process.env.CUTS ?? "cuts.json"; const cutsOut = fs.existsSync(CUTS) ? JSON.parse(fs.readFileSync(CUTS, "utf8")) : {};
const FR = 0.01; // 10 ms envelope frames

function envelope(file) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 29 });
  const x = new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)); const n = Math.floor(x.length / 160); const env = new Float64Array(n);
  for (let i = 0; i < n; i++) { let e = 0; for (let k = 0; k < 160; k++) e += x[i * 160 + k] * x[i * 160 + k]; env[i] = Math.sqrt(e / 160); }
  const sm = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -1; k <= 1; k++) if (env[i + k] !== undefined) { s += env[i + k]; c++; } sm[i] = s / c; }
  return { env: sm, dur: x.length / 16000 };
}
const quietest = (env, a, b) => { let bi = Math.max(0, Math.floor(a / FR)), bv = Infinity; for (let i = Math.max(0, Math.floor(a / FR)); i <= Math.min(env.length - 1, Math.floor(b / FR)); i++) if (env[i] < bv) { bv = env[i]; bi = i; } return bi * FR; };

for (const [p, v] of Object.entries(spansAll)) {
  if (only && !p.includes(only)) continue;
  const src = "../hoeren/" + p; const rel = p.replace(/^clean\//, "");
  const { env, dur } = envelope(src);
  const speechThr = (() => { const a = [...env].sort((x, y) => x - y); return Math.max(60, a[Math.floor(a.length * 0.5)] * 0.35); })();
  const cuts = [];
  for (const s of v.spans) {
    let cs = quietest(env, Math.max(s.prevEnd ?? 0, s.s - 0.4), s.s + 0.1);
    if (s.prevEnd != null) cs = Math.max(cs, s.prevEnd - 0.03);
    let ce = quietest(env, s.e - 0.1, s.e + 0.45);
    // anything audible after the tag? (>1 s above the speech threshold) -> keep it; otherwise the tag is the tail of the file: cut to the end
    let loud = 0; for (let i = Math.floor((s.e + 0.5) / FR); i < env.length; i++) if (env[i] > speechThr) loud++;
    const tail = loud * FR < 1.0;
    if (tail) ce = dur;
    cuts.push({ s: Math.max(0, cs), e: Math.min(dur, ce), text: s.text, tail });
  }
  cuts.sort((x, y) => x.s - y.s); const merged = []; for (const c of cuts) { const last = merged[merged.length - 1]; if (last && c.s <= last.e + 0.05) { last.e = Math.max(last.e, c.e); last.tail = last.tail || c.tail; last.text += " + " + c.text; } else merged.push({ ...c }); }
  // keep segments between cuts
  const keep = []; let pos = 0; for (const c of merged) { if (c.s - pos > 0.05) keep.push([pos, c.s]); pos = c.e; } if (dur - pos > 0.05) keep.push([pos, dur]);
  const parts = keep.map(([a, b], i) => `[0:a]atrim=start=${a.toFixed(3)}:end=${b.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${i === 0 ? 0 : 0.025},afade=t=out:st=${Math.max(0, b - a - 0.025).toFixed(3)}:d=${i === keep.length - 1 && !merged.some((c) => c.tail) ? 0 : 0.025}[k${i}]`);
  const filter = parts.join(";") + ";" + keep.map((_, i) => `[k${i}]`).join("") + `concat=n=${keep.length}:v=0:a=1[out]`;
  const outFile = "out/" + rel; fs.mkdirSync(outFile.replace(/\/[^/]*$/, ""), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", src, "-filter_complex", filter, "-map", "[out]", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outFile]);
  const ndur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", outFile]).toString());
  // old->new time map pieces: for every kept segment [a,b] -> new offset
  let off = 0; const map = keep.map(([a, b]) => { const m = { a, b, off }; off += b - a; return m; });
  cutsOut[p] = { id: v.id, title: v.title, dur, ndur, removed: +(dur - ndur).toFixed(2), cuts: merged.map((c) => ({ s: +c.s.toFixed(2), e: +c.e.toFixed(2), tail: c.tail, text: c.text })), map };
  console.log(`${rel.padEnd(44)} ${dur.toFixed(1)}s -> ${ndur.toFixed(1)}s  cuts: ` + merged.map((c) => `[${c.s.toFixed(2)}-${c.e.toFixed(2)}${c.tail ? " EOF" : ""}]`).join(" "));
  fs.writeFileSync(CUTS, JSON.stringify(cutsOut));
}
process.exit(0);
