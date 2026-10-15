// MFCC + subsequence-DTW helpers for finding a known (re-used) spoken tag inside a longer audio file without any ASR.
import { execFileSync } from "node:child_process";
export const SR = 16000;
export function loadClip(file, a = 0, b = null, af = "") { const args = ["-v", "error"]; if (a) args.push("-ss", String(a)); if (b != null) args.push("-to", String(b)); args.push("-i", file, "-ac", "1", "-ar", String(SR)); if (af) args.push("-af", af); args.push("-f", "s16le", "-"); const raw = execFileSync("ffmpeg", args, { maxBuffer: 1 << 29 }); return new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length)); }
const NF = 26, NC = 13, N = 512, W = 400, H = 160;
const mel = (f) => 2595 * Math.log10(1 + f / 700), imel = (m) => 700 * (10 ** (m / 2595) - 1);
const pts = Array.from({ length: NF + 2 }, (_, i) => imel(mel(0) + (mel(SR / 2) - mel(0)) * i / (NF + 1))); const bins = pts.map((f) => Math.floor((N + 1) * f / SR));
const fb = Array.from({ length: NF }, (_, m) => { const row = new Float64Array(N / 2 + 1); for (let k = bins[m]; k < bins[m + 1]; k++) row[k] = (k - bins[m]) / (bins[m + 1] - bins[m]); for (let k = bins[m + 1]; k < bins[m + 2]; k++) row[k] = (bins[m + 2] - k) / (bins[m + 2] - bins[m + 1]); return row; });
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } } for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2; const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const nc = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nc; } } } }
// frames x 12 coefficients, 10 ms hop, per-clip mean removed only when `cmn` is true (a long file gets a LOCAL mean via sliding window in the matcher instead)
export function mfcc(x, cmn = true) { const out = []; for (let o = 0; o + W <= x.length; o += H) { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < W; i++) { const pe = i ? x[o + i] - 0.97 * x[o + i - 1] : x[o + i]; re[i] = pe * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (W - 1))); } fft(re, im); const ps = new Float64Array(N / 2 + 1); for (let k = 0; k <= N / 2; k++) ps[k] = re[k] * re[k] + im[k] * im[k]; const le = fb.map((r) => { let s = 0; for (let k = 0; k < r.length; k++) s += r[k] * ps[k]; return Math.log(1e-3 + s); }); const c = new Float64Array(NC - 1); for (let n = 1; n <= NC - 1; n++) { let s = 0; for (let m = 0; m < NF; m++) s += le[m] * Math.cos(Math.PI * n * (m + 0.5) / NF); c[n - 1] = s; } out.push(c); }
  if (cmn && out.length) { const d = out[0].length, mean = new Float64Array(d); for (const v of out) for (let i = 0; i < d; i++) mean[i] += v[i] / out.length; for (const v of out) for (let i = 0; i < d; i++) v[i] -= mean[i]; } return out; }
// subsequence DTW: best alignment of the whole reference `r` (m frames) against any stretch of the long sequence `t`; returns per-end-frame cost normalised by path length (approx m)
export function subseqDTW(r, t) { const m = r.length, n = t.length; const d = r[0].length; let prev = new Float64Array(m + 1).fill(Infinity), cur = new Float64Array(m + 1); let lenPrev = new Float64Array(m + 1), lenCur = new Float64Array(m + 1); const cost = new Float64Array(n); const start = new Int32Array(n);
  let stPrev = new Int32Array(m + 1), stCur = new Int32Array(m + 1); prev[0] = 0;
  for (let j = 1; j <= n; j++) { cur[0] = 0; lenCur[0] = 0; stCur[0] = j; // free start
    const tv = t[j - 1];
    for (let i = 1; i <= m; i++) { const rv = r[i - 1]; let s = 0; for (let k = 0; k < d; k++) { const q = rv[k] - tv[k]; s += q * q; } const c = Math.sqrt(s);
      let best = prev[i - 1], bl = lenPrev[i - 1], bs = stPrev[i - 1]; if (prev[i] < best) { best = prev[i]; bl = lenPrev[i]; bs = stPrev[i]; } if (cur[i - 1] < best) { best = cur[i - 1]; bl = lenCur[i - 1]; bs = stCur[i - 1]; }
      cur[i] = c + best; lenCur[i] = bl + 1; stCur[i] = bs; }
    cost[j - 1] = cur[m] / lenCur[m]; start[j - 1] = stCur[m] - 1 + 1; // start frame index (1-based j of first matched frame)
    [prev, cur] = [cur, prev]; [lenPrev, lenCur] = [lenCur, lenPrev]; [stPrev, stCur] = [stCur, stPrev]; prev[0] = 0; }
  return { cost, start }; }
