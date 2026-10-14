// usage: node encode.mjs <name> <kbps>  -> two-pass loudnorm to exactly -18 LUFS, AAC mono 44.1 kHz -> <name>.final.m4a
import { spawnSync } from "node:child_process";
const [name, kbps = "64"] = process.argv.slice(2);
const src = ["-f", "s16le", "-ar", "24000", "-ac", "1", "-i", `${name}.new.pcm`];
const p1 = spawnSync("ffmpeg", ["-hide_banner", "-y", ...src, "-af", "loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
const m = JSON.parse(p1.stderr.slice(p1.stderr.lastIndexOf("{"), p1.stderr.lastIndexOf("}") + 1));
const af = `loudnorm=I=-18:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_LRA=${m.input_lra}:measured_TP=${m.input_tp}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=44100`;
const p2 = spawnSync("ffmpeg", ["-hide_banner", "-y", ...src, "-af", af, "-c:a", "aac", "-b:a", `${kbps}k`, "-movflags", "+faststart", `${name}.final.m4a`], { encoding: "utf8" });
if (p2.status !== 0) { console.log(p2.stderr.slice(-400)); process.exit(1); }
const p3 = spawnSync("ffmpeg", ["-hide_banner", "-i", `${name}.final.m4a`, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
console.log(name, "measured in:", m.input_i, "LUFS ->", p3.stderr.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop(), p3.stderr.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop(), p3.stderr.match(/Duration: (\d+:\d+:[\d.]+)/)?.[1]);
