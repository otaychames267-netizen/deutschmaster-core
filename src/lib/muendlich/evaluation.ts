/**
 * Shape of a Mündlich exam evaluation as the UI consumes it. Numbers only
 * (owner decision 2026-10-04, to cut per-exam Claude cost): the relay's
 * evaluator (muendlich-relay/src/muendlich-evaluator.ts, the real production
 * path) returns three 0-25 Teil scores + a CEFR level, nothing else. Rows
 * written before that date still have a verbose `feedback` JSON in the
 * database; the UI deliberately ignores it so old and new results look the
 * same.
 */
export interface MuendlichEvaluationResult {
  teil1_score: number;
  teil2_score: number;
  teil3_score: number;
  overall_score: number;
  passed: boolean;
  cefr_level: "A1" | "A2" | "B1" | "B2" | "C1";
  model: string;
}
