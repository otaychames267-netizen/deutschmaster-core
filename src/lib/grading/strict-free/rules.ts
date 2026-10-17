import type { ObservationSheet } from "./features";

/**
 * Hard examiner rules applied AFTER the regression. Measured on 271 Claude gradings: when the observer reports that the text does not address the task
 * (task_misread or on_topic = "no"; 27 essays) Claude gave TA 1.7 on average and NEVER more than 5 — the linear model alone predicted ≈ 5.5 because fluent form features pull it up, so TA is capped.
 * CD / FA are left to the regression (capping them made the total error worse: Claude still rewards good form in an off-topic text, up to 23/45). Texts that address
 * only part of the task (on_topic "partly" or ≥ 3 missing points; 26 essays, Claude TA mean 3.4) get TA ≤ 4: total MAE on those rows 3.15 → 2.81.
 */
export interface Scores { ta: number; cd: number; fa: number }

export function applyExaminerRules(s: Scores, obs: ObservationSheet): { scores: Scores; rule: string | null } {
  const missing = (obs.points ?? []).filter((p) => p.status === "missing").length;
  const offTopic = obs.task_misread === true || obs.on_topic === "no";
  if (offTopic) return { scores: { ta: Math.min(s.ta, 4), cd: s.cd, fa: s.fa }, rule: "off_topic" };
  if (obs.on_topic === "partly" || missing >= 3) return { scores: { ta: Math.min(s.ta, 4), cd: s.cd, fa: s.fa }, rule: "task_largely_missed" };
  if (missing >= 2) return { scores: { ta: Math.min(s.ta, 4), cd: s.cd, fa: s.fa }, rule: "two_points_missing" };
  return { scores: s, rule: null };
}
