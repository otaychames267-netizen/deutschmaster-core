/**
 * regression.test.ts — permanent regression protection for the production rules.
 *
 * Run: npx tsx scripts/regression.test.ts   (exit code 1 on any failure → CI-friendly)
 *
 * Locks the invariants the user requires:
 *  - Exercise identity is INSTANCE-based (article+questions+key+pages).
 *  - The TITLE never determines identity.
 *  - Only EXACT instance copies are merged.
 *  - Every genuine version (any intentional difference) is preserved.
 */
import { instanceSignature, resolveDuplicates, isComplete, type ExerciseLike } from "../src/lib/import/validate.js";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ FAIL: ${name}`); } }

function ex(idx: number, o: Partial<ExerciseLike> & { title?: string | null }): ExerciseLike {
  return {
    idx, title: o.title ?? "T", article: o.article ?? ("Artikeltext ".repeat(20)),
    pages: o.pages ?? [idx * 2 - 1, idx * 2],
    questions: o.questions ?? [1, 2, 3, 4, 5].map((n) => ({ number: n + 5, text: `Frage ${n}`, option_a: "a", option_b: "b", option_c: "c" })),
    answerKey: o.answerKey ?? [6, 7, 8, 9, 10].map((n) => ({ number: n, answer: "a" })),
  };
}

console.log("REGRESSION: production rules");

// 1) Title is NOT identity: same content+pages, different titles → same instance signature
{
  const a = ex(1, { title: "Parking" });
  const b = ex(1, { title: "COMPLETELY DIFFERENT TITLE" });
  check("title does not affect instance signature", instanceSignature(a) === instanceSignature(b));
}

// 2) Different page group → different instance (even identical content)
{
  const a = ex(1, { pages: [1, 2] });
  const b = ex(1, { pages: [3, 4] });
  check("different page group → different instance", instanceSignature(a) !== instanceSignature(b));
}

// 3) One different answer → different instance (genuine version)
{
  const a = ex(1, {});
  const b = ex(1, { answerKey: [{ number: 6, answer: "b" }, { number: 7, answer: "a" }, { number: 8, answer: "a" }, { number: 9, answer: "a" }, { number: 10, answer: "a" }] });
  check("one different answer → different instance", instanceSignature(a) !== instanceSignature(b));
}

// 4) One different question word → different instance
{
  const a = ex(1, {});
  const qs = a.questions.map((q) => ({ ...q }));
  qs[0] = { ...qs[0], text: "Frage 1 geändert" };
  const b = ex(1, { questions: qs });
  check("one changed question → different instance", instanceSignature(a) !== instanceSignature(b));
}

// 5) Reordered questions → different instance (order is significant)
{
  const a = ex(1, {});
  const b = ex(1, { questions: [...a.questions].reverse() });
  check("reordered questions → different instance", instanceSignature(a) !== instanceSignature(b));
}

// 6) Only OCR-irrelevant formatting (case/whitespace) differs → SAME instance
{
  const a = ex(1, { article: "Der  Text." });
  const b = ex(1, { article: "der text." });
  check("case/whitespace-only difference → same instance", instanceSignature(a) === instanceSignature(b));
}

// 7) resolveDuplicates merges ONLY exact instance copies
{
  const a = ex(1, { title: "Parking" });
  const b = ex(2, { title: "Parking", pages: [1, 2] }); // same content + same pages as a (idx differs only)
  // make b identical instance to a
  const bSame: ExerciseLike = { ...b, pages: a.pages };
  const distinct = ex(3, { title: "Parking", answerKey: [{ number: 6, answer: "c" }, { number: 7, answer: "a" }, { number: 8, answer: "a" }, { number: 9, answer: "a" }, { number: 10, answer: "a" }] });
  const { drop } = resolveDuplicates([a, bSame, distinct]);
  check("exact instance copy is dropped", drop.includes(bSame.idx));
  check("distinct version (diff key) is preserved", !drop.includes(distinct.idx));
}

// 8) Two same-title genuine versions are BOTH kept
{
  const v1 = ex(1, { title: "Parkuhren" });
  const v2 = ex(2, { title: "Parkuhren", questions: ex(2, {}).questions.map((q, i) => i === 0 ? { ...q, text: "Andere Frage" } : q) });
  const { drop } = resolveDuplicates([v1, v2]);
  check("two genuine same-title versions both kept", drop.length === 0);
}

// 9) isComplete requires article + 5 questions + full key
{
  check("complete exercise passes", isComplete(ex(1, {})));
  check("no-article exercise is NOT complete", !isComplete(ex(1, { article: "" })));
  check("missing-key exercise is NOT complete", !isComplete(ex(1, { answerKey: [{ number: 6, answer: "a" }] })));
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
