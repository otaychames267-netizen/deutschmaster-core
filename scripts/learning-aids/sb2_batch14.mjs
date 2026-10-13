// SB Teil 2 restyle — batch 14 (last): the gaps held back for source defects, now that sb_t2_source_fixes.sql has corrected the passages / keys:
// [4] gap 38, [60] gap 39 (STATT), [63] gaps 31 + 35, [64] gap 36 (SOZIALE) + a rewritten gap 37 (the bank no longer contains "sozial").
// Each entry rewrites the old evidence_text, which showed the uncorrected sentence.
export default {
  4: {
    38: { ok: "VERFÜGUNG", type: "fixed_expression", keyword: "zur Verfügung stehen", bed: "على الذمّة",
      text: `"dass sie dem Unternehmen kürzer zur ___ stehen": تعبير ثابت: "zur Verfügung stehen" = يكون على الذمّة (المقصود: يخدمو مدّة أقصر).\n✓ "Verfügung" = ذمّة / تصرّف (zur Verfügung stehen).\n✗ "Auswahl" = اختيار: "zur Auswahl stehen" تعني يكون ضمن الاختيارات، موش على الذمّة، وما تعطيش معنى مدّة الخدمة.\n✗ "Chance" = فرصة، و"zur Chance stehen" ما تتقالش.`,
      rule: "zur Verfügung stehen = einsatzbereit / vorhanden sein  |  zur Auswahl stehen = wählbar sein", ex: "Das Auto **steht** uns heute **zur Verfügung**.", exTr: "الكرهبة على ذمّتنا اليوم.",
      evidence: "Gegen die Einstellung von Älteren spreche nur, dass sie dem Unternehmen kürzer zur **Verfügung** stehen." },
  },
  60: {
    39: { ok: "STATT", type: "preposition", keyword: "statt + Akk. (anstelle von)", bed: "عوض",
      text: `"in die Kranken- und Rentenversicherungen ___ in den Konsum stecken müssen": بدل ما يصرفو في الاستهلاك، يدفعو في التأمينات: "statt".\n✓ "statt" = عوض (statt + in den Konsum = بدل الاستهلاك).\n✗ "im" = in + dem (+ Dativ مكان)، و"Versicherungen im in den Konsum" ما تتقالش.\n✗ "an" = على / عند، و"Versicherungen an in den Konsum" ما تتقالش.`,
      rule: "statt + Nomen / Präpositionalgruppe = anstelle von", ex: "Er spart Geld **statt** in den Urlaub zu fahren.", exTr: "هو يوفّر فلوس عوض ما يمشي في عطلة.",
      evidence: "Die Produktivität der Wirtschaft wird abnehmen, da Arbeitnehmer den größten Teil ihres Einkommens in die Kranken- und Rentenversicherungen **statt** in den Konsum stecken müssen." },
  },
  63: {
    31: { ok: "ZUGLEICH", type: "adjective_adverb", keyword: "simpel und frustrierend zugleich", bed: "في نفس الوقت",
      text: `"Die Erklärung ist simpel und frustrierend ___!": خاصيّتين في نفس الوقت: "zugleich".\n✓ "zugleich" = في نفس الوقت.\n✗ "gleichzeitig" = نفس المعنى تقريبًا: ممكنة نحويًّا (مرادف)، بصح الإجابة المعتمدة في هذا التمرين "zugleich".\n✗ "dazu" = بالإضافة لهذا (ظرف)، و"simpel und frustrierend dazu" ما تتقالش.`,
      rule: "zugleich = gleichzeitig = im selben Moment (nachgestellt)", ex: "Das ist schön und traurig **zugleich**.", exTr: "هذا جميل وحزين في نفس الوقت.",
      evidence: "Die Erklärung ist simpel und frustrierend **zugleich**!" },
    35: { ok: "AN", type: "verb_prep", keyword: "sich anpassen an + Akk.", bed: "يتكيّف مع",
      text: `"passt sich unsere Sprache … immer mehr ___ dieses … Social-Media-Deutsch an": الفعل المنفصل "sich anpassen an": حرف الجر "an" قبل المفعول، والجزء المنفصل "an" في آخر الجملة.\n✓ "an" = حرف الجر (sich anpassen an + Akkusativ).\n✗ "auf" = على، و"sich auf … anpassen" ما تتقالش.\n✗ "zu" = إلى، و"sich zu … anpassen" ما تتقالش.`,
      rule: "trennbar: sich an etwas anpassen → passt sich an etwas an", ex: "Er **passt sich an** die Regeln **an**.", exTr: "هو يتكيّف مع القواعد.",
      evidence: "…passt sich unsere Sprache auch in den anderen Bereichen immer mehr **an** dieses sogenannte Social-Media-Deutsch an." },
  },
  64: {
    36: { ok: "SOZIALE", type: "adjective_adverb", keyword: "soziale Aktivitäten (Plural -e)", bed: "اجتماعية",
      text: `"eignen sich ___ Aktivitäten wie Konzerte oder Feste": صفة بنهاية -e قبل جمع بدون أداة (Nominativ).\n✓ "soziale" = اجتماعية (-e: Plural Nominativ بدون أداة).\n✗ "alleine" = وحدو (ظرف)، وتناقض "Konzerte oder Feste" (نشاطات جماعية).\n✗ "ehrenamtlich" = تطوّعيًّا (ظرف بدون نهاية)، و"ehrenamtlich Aktivitäten" تحتاج نهاية ("ehrenamtliche").`,
      rule: "Plural ohne Artikel: Adjektiv + -e (soziale Aktivitäten)", ex: "Für Kinder eignen sich **soziale** Spiele.", exTr: "للصغار تناسب ألعاب اجتماعية.",
      evidence: "Für extrovertierte Personen eignen sich **soziale** Aktivitäten wie Konzerte oder Feste." },
    37: { ok: "EHRENAMTLICH", type: "adjective_adverb", keyword: "ehrenamtlich engagiert", bed: "تطوّعيًّا",
      text: `"Verträgliche Menschen sind gern ___ engagiert": ظرف طريقة بدون نهاية: تطوّعيًّا.\n✓ "ehrenamtlich" = تطوّعيًّا (بدون أجر، ظرف).\n✗ "soziale" = صفة بنهاية -e، و"gern soziale engagiert" ما تتقالش (بعد "sind … engagiert" نحتاج ظرف بدون نهاية).\n✗ "alleine" = وحدو (ظرف)، وتناقض "verträgliche Menschen" (اللي يحبّو يخدمو مع غيرهم).`,
      rule: "ehrenamtlich engagiert = freiwillig / unbezahlt aktiv (Adverb ohne Endung)", ex: "Sie ist **ehrenamtlich** im Verein aktiv.", exTr: "هي تخدم تطوّعيًّا في الجمعية." },
  },
};
