// Pure grading helpers (no React, no DB) — usable from server fn or tests.

export type ExerciseKind = "multiple_choice" | "true_false" | "matching" | "cloze" | "open_text" | "passage_mcq";

function normalize(s: string): string {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ");
}

export type GradeResult = {
  /** 0-100 integer */
  score: number;
  isCorrect: boolean;
  needsReview: boolean;
  detail?: unknown;
};

/**
 * answer shape by kind:
 *  - multiple_choice / true_false: string (selected option text) OR string[] (if multi)
 *  - matching: Record<string,string>  left → right
 *  - cloze: string[] (per-gap answer)
 *  - open_text: string
 * correct shape: jsonb array from the exercises table.
 */
export function gradeAnswer(kind: ExerciseKind, answer: unknown, correct: unknown[], options?: unknown): GradeResult {
  switch (kind) {
    case "passage_mcq": {
      // options = { questions: [{ n, correct, ... }] }
      const qs = (options && typeof options === "object" && !Array.isArray(options) && Array.isArray((options as any).questions))
        ? ((options as any).questions as Array<{ n: string; correct: string | null }>)
        : [];
      const given = (answer ?? {}) as Record<string, string>;
      if (qs.length === 0) return { score: 0, isCorrect: false, needsReview: false };
      let hit = 0;
      for (const q of qs) {
        const want = normalize(String(q.correct ?? ""));
        const got = normalize(String(given?.[String(q.n)] ?? ""));
        if (want && want === got) hit++;
      }
      const score = Math.round((hit / qs.length) * 100);
      return { score, isCorrect: hit === qs.length, needsReview: false };
    }
    case "multiple_choice":
    case "true_false": {
      const got = Array.isArray(answer) ? answer.map(String) : [String(answer ?? "")];
      const want = (correct ?? []).map((c) => normalize(String(c)));
      const gotN = got.map(normalize).filter(Boolean);
      if (gotN.length === 0) return { score: 0, isCorrect: false, needsReview: false };
      const allMatch = want.length === gotN.length && want.every((w) => gotN.includes(w));
      return { score: allMatch ? 100 : 0, isCorrect: allMatch, needsReview: false };
    }
    case "matching": {
      const a = (answer ?? {}) as Record<string, string>;
      // correct: array of {left,right} objects OR pairs ["left|right"]
      const pairs: Array<{ left: string; right: string }> = (correct ?? []).map((c) => {
        if (typeof c === "string") {
          const [l, r] = c.split("|");
          return { left: l ?? "", right: r ?? "" };
        }
        const obj = c as { left?: string; right?: string };
        return { left: obj.left ?? "", right: obj.right ?? "" };
      });
      if (pairs.length === 0) return { score: 0, isCorrect: false, needsReview: false };
      const hit = pairs.filter((p) => normalize(a[p.left] ?? "") === normalize(p.right)).length;
      const score = Math.round((hit / pairs.length) * 100);
      return { score, isCorrect: hit === pairs.length, needsReview: false };
    }
    case "cloze": {
      const got = Array.isArray(answer) ? answer.map((x) => String(x ?? "")) : [];
      const want = (correct ?? []).map((c) => String(c ?? ""));
      if (want.length === 0) return { score: 0, isCorrect: false, needsReview: false };
      const hit = want.filter((w, i) => {
        // allow "a|b|c" for alternatives
        const alts = w.split("|").map(normalize);
        return alts.includes(normalize(got[i] ?? ""));
      }).length;
      const score = Math.round((hit / want.length) * 100);
      return { score, isCorrect: hit === want.length, needsReview: false };
    }
    case "open_text": {
      const text = String(answer ?? "").trim();
      return { score: 0, isCorrect: false, needsReview: text.length > 0 };
    }
    default:
      return { score: 0, isCorrect: false, needsReview: true };
  }
}