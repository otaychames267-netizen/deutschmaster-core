/** Tiny ridge regression (standardised features, closed form) + the calibrated scorer built on it. No dependencies. */

export interface RidgeModel { w: number[]; mu: number[]; sd: number[]; ym: number }
export interface Calibration { version: number; keys: string[]; lambda: number; trainedOn: string; models: { ta: RidgeModel; cd: RidgeModel; fa: RidgeModel } }

function solve(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    const d = M[i][i] || 1e-12;
    for (let j = i; j <= n; j++) M[i][j] /= d;
    for (let k = 0; k < n; k++) if (k !== i) { const m = M[k][i]; if (m) for (let j = i; j <= n; j++) M[k][j] -= m * M[i][j]; }
  }
  return M.map((r) => r[n]);
}

export function fitRidge(X: number[][], y: number[], lambda = 12): RidgeModel {
  const d = X[0].length;
  const mu = Array<number>(d).fill(0);
  const sd = Array<number>(d).fill(0);
  for (const r of X) r.forEach((v, j) => (mu[j] += v / X.length));
  for (const r of X) r.forEach((v, j) => (sd[j] += (v - mu[j]) ** 2 / X.length));
  sd.forEach((v, j) => (sd[j] = Math.sqrt(v) || 1));
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]));
  const ym = y.reduce((a, b) => a + b, 0) / y.length;
  const A = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => Z.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? lambda : 0)));
  const b = Array.from({ length: d }, (_, i) => Z.reduce((s, r, k) => s + r[i] * (y[k] - ym), 0));
  return { w: solve(A, b), mu, sd, ym };
}

export const predictRidge = (m: RidgeModel, x: number[]): number => m.ym + x.reduce((s, v, j) => s + ((v - m.mu[j]) / m.sd[j]) * m.w[j], 0);

/** Calibrated 0-15 scores for the three telc criteria. Rounded to whole points (the platform stores integers) and clamped. */
export function scoreWithCalibration(cal: Calibration, f: Record<string, number>): { ta: number; cd: number; fa: number; raw: { ta: number; cd: number; fa: number } } {
  const x = cal.keys.map((k) => f[k] ?? 0);
  const raw = {
    ta: predictRidge(cal.models.ta, x),
    cd: predictRidge(cal.models.cd, x),
    fa: predictRidge(cal.models.fa, x),
  };
  const clamp = (v: number) => Math.max(0, Math.min(15, Math.round(v)));
  return { ta: clamp(raw.ta), cd: clamp(raw.cd), fa: clamp(raw.fa), raw };
}
