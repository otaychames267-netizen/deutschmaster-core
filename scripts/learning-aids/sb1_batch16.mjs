// SB Teil 1 restyle — batch 16 (very last): [58] Eltern und Erziehungsberechtigte, gap 21.
// The source booklet (sprachbausteine teil 1 (2).pdf, page 42) itself prints "(21) mehr Internetsicherheit …" with key A) Anlässlich — so the DB matches the source
// and the key is NOT changed. The passage looks like it lost words in the booklet ("Anlässlich [des Tages für] mehr Internetsicherheit"?), so the wrong
// option "zwecks" is explained with an honest hedge instead of being declared impossible.
export default {
  58: {
    21: { ok: "Anlässlich", type: "preposition", keyword: "anlässlich + Genitiv", bed: "بمناسبة",
      text: `الجملة تفتتح الرسالة بسبب / مناسبة المعالجة: الموضوع يتعالج في يوم مخصّص (المناسبة)، فحرف الجر الرسمي هو "anlässlich" (+ Genitiv).\n✓ "Anlässlich" = بمناسبة (حدث أو يوم خاصّ نربطو بيه الموضوع).\n✗ "mithilfe" = بمساعدة (وسيلة أو أداة)، موش مناسبة.\n✗ "zwecks" = بغرض (+ Genitiv): ممكنة نحويًّا، بصح تعبّر على هدف، والجملة هنا تفتح بمناسبة (الإجابة المعتمدة "Anlässlich").`,
      rule: "anlässlich + Genitiv = bei Gelegenheit / zu einem Anlass  |  zwecks + Genitiv = zum Zweck", ex: "**Anlässlich** des Weltspartags bieten wir Sonderkonditionen an.", exTr: "بمناسبة اليوم العالمي للادخار نقدّم شروط خاصة." },
  },
};
