/**
 * spelling-explain.ts — turns a dictionary-detected misspelling (word → fix) into a correction card with a specific Arabic explanation, no LLM needed.
 * Pure; shared by the strict free grader and the owner-policy wrapper (essay-grader.ts), so every spelling error the dictionary finds is also SHOWN to the student, with the reason.
 */
export interface SpellingCard { original: string; corrected: string; category: string; explanation_ar: string; tip_ar: string }

const UMLAUT: Record<string, string> = { a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" };

export function spellingCard(word: string, fix: string | null): SpellingCard {
  const category = "Rechtschreibung";
  if (!fix || fix === word) {
    return {
      original: word, corrected: word, category,
      explanation_ar: `الكلمة «${word}» غير موجودة في اللغة الألمانية بهذه الكتابة (خطأ إملائي). راجع حروفها واحداً واحداً أو ابحث عنها في قاموس.`,
      tip_ar: "قبل التسليم، اقرأ نصك كلمة بكلمة وتأكد من كل كلمة لست متأكداً من كتابتها في قاموس (مثل dict.cc).",
    };
  }
  const w = word, f = fix;
  const base = { original: w, corrected: f, category };

  // only the capitalisation differs (nouns, sentence starts)
  if (w.toLowerCase() === f.toLowerCase()) {
    return { ...base, explanation_ar: `كل الأسماء في اللغة الألمانية تُكتب بحرف كبير في بدايتها، والصواب «${f}» وليس «${w}».`, tip_ar: "اجعل عادتك: كل اسم (شخص، شيء، فكرة) يبدأ بحرف كبير — راجع نصك لهذه النقطة قبل التسليم." };
  }
  // common prefix / suffix → the differing middle parts
  let i = 0;
  while (i < w.length && i < f.length && w[i] === f[i]) i++;
  let j = 0;
  while (j < w.length - i && j < f.length - i && w[w.length - 1 - j] === f[f.length - 1 - j]) j++;
  const a = w.slice(i, w.length - j);
  const b = f.slice(i, f.length - j);

  if (a.length === 1 && b.length === 1 && UMLAUT[a] === b) {
    return { ...base, explanation_ar: `الحرف «${a}» يجب أن يُكتب «${b}» (Umlaut — حرف بنقطتين). كتابته بدون النقطتين تغيّر الكلمة أو تجعلها خاطئة: الصواب «${f}».`, tip_ar: "لا تتجاهل حروف ä ö ü ß عند الكتابة؛ إن لم تجدها في لوحة المفاتيح فاكتبها ae / oe / ue ثم صحّحها، أو فعّل لوحة المفاتيح الألمانية." };
  }
  if (a.toLowerCase() === "ss" && b === "ß") {
    return { ...base, explanation_ar: `يُكتب «ß» (Eszett) بدل «ss» بعد حرف علة طويل أو مزدوج: الصواب «${f}». لا تُستعمل «ss» هنا (هذه كتابة سويسرية وليست الكتابة المعيارية).`, tip_ar: "قاعدة: ß بعد حرف علة طويل (Straße، heißen، außerdem)، و ss بعد حرف علة قصير (muss، dass، Fluss)." };
  }
  if (a === "" && b.length === 1) {
    const doubled = f[i - 1]?.toLowerCase() === b.toLowerCase() || f[i + 1]?.toLowerCase() === b.toLowerCase();
    return { ...base, explanation_ar: doubled
      ? `ينقص حرف مكرَّر في الكلمة: الصواب «${f}» (الحرف «${b}» يُكتب مرتين — Doppelkonsonant)، وكتابتها «${w}» خطأ إملائي.`
      : `ينقص حرف «${b}» في الكلمة: الصواب «${f}» وليس «${w}».`,
      tip_ar: doubled ? "الحرف الساكن بعد حرف علة قصير يُضاعَف غالباً (enttäuscht، Wetter، kommen) — احفظ الكلمات الشائعة بشكلها الكامل." : "بعد الانتهاء من الكتابة، راجع الكلمات الطويلة حرفاً حرفاً لتتأكد أنه لم يسقط منها حرف." };
  }
  if (b === "" && a.length === 1) {
    return { ...base, explanation_ar: `في الكلمة حرف زائد «${a}»: الصواب «${f}» وليس «${w}».`, tip_ar: "لا تكرّر الحروف بلا قاعدة؛ إن شككت في كلمة ابحث عنها في قاموس وانسخ شكلها الصحيح لتحفظه." };
  }
  if (a.length === 1 && b.length === 1) {
    return { ...base, explanation_ar: `الحرف «${a}» خاطئ هنا، والصواب «${b}»: الكلمة تُكتب «${f}» وليس «${w}».`, tip_ar: "كلمة واحدة بحرف خاطئ تُحسب خطأ إملائياً كاملاً في التصحيح — راجع نصك كلمة كلمة قبل التسليم." };
  }
  return { ...base, explanation_ar: `الكتابة الصحيحة هي «${f}» وليس «${w}» (خطأ إملائي).`, tip_ar: "احفظ الكلمة بشكلها الصحيح واكتبها مرتين أو ثلاثاً في جملة من عندك حتى تثبت في ذاكرتك." };
}
