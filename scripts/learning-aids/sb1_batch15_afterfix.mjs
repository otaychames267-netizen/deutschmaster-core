// SB Teil 1 restyle — batch 15: the gaps that were held back because of suspect answer keys (see sb_t1_key_fixes.sql).
// Apply ONLY after that SQL has been run (the validator compares `ok` with the DB, so it refuses to run before). Each entry also rewrites the
// old evidence_text, which was built on the wrong key. [58] gap 21 is not here: needs a source check first.
export default {
  5: {
    21: { ok: "Ihrer", type: "pronoun", keyword: "Ihrer (Genitiv, formell)", bed: "متاع (قسمكم)",
      text: `الرسالة موجّهة رسميًّا لـ Herr Martini (Sie)، و"Schulklasse" مؤنّث في Genitiv: "Ihrer Schulklasse".\n✓ "Ihrer" = Genitiv مؤنّث للصيغة الرسمية (Sie).\n✗ "Seiner" = لـ "er" (غائب)، والمخاطَب هنا هو Herr Martini.\n✗ "Deiner" = لـ "du" (صيغة غير رسمية)، والرسالة رسمية.`,
      rule: "Nomen + Genitiv: Possessiv feminin = Ihrer (formell: Sie)", ex: "Die Reise **Ihrer** Klasse beginnt im Mai.", exTr: "رحلة قسمكم تبدا في ماي.",
      evidence: "vielen Dank für Ihre Anfrage vom 16. Juni zu der Studienreise **Ihrer** Schulklasse nach Frankfurt am Main im kommenden Oktober." },
  },
  6: {
    21: { ok: "zu", type: "preposition", keyword: "Anfrage zu + Dativ", bed: "حول (الرحلة)",
      text: `الموضوع اللي يخصّو الطلب يتحدّد بـ "zu": "Anfrage zu der Studienreise".\n✓ "zu" = حول (Anfrage zu + Dativ، الموضوع).\n✗ "an" = إلى (Anfrage an jdn. = موجّهة لشخص)، موش الموضوع.\n✗ "von" = من، و"Anfrage von der Studienreise" تعني إنّو الطلب صادر من الرحلة.`,
      rule: "Anfrage / Frage zu + Dat. (Thema)  |  Anfrage an + Akk. (Adressat)", ex: "Ich habe eine Frage **zu** dem Kurs.", exTr: "عندي سؤال على الدورة.",
      evidence: "vielen Dank für Ihre Anfrage vom 16. Juni **zu** der Studienreise Ihrer Schulklasse nach Frankfurt am Main im kommenden Oktober." },
  },
  17: {
    23: { ok: "Zwecks", type: "preposition", keyword: "zwecks + Genitiv", bed: "بغرض",
      text: `"besserer Einschätzung" في Genitiv مؤنّث (الغرض من الاختبار): "Zwecks besserer Einschätzung".\n✓ "Zwecks" = بغرض (zwecks + Genitiv).\n✗ "Für" = لـ (+ Akkusativ): كان نحتاج "bessere" موش "besserer" (Genitiv).\n✗ "Zur" = zu + der (+ Dativ): كان نحتاج "zur besseren Einschätzung"، موش "besserer".`,
      rule: "zwecks + Genitiv = zum Zweck  |  zur + Dativ (zur besseren …)", ex: "**Zwecks** besserer Planung gibt es einen Test.", exTr: "بغرض تخطيط أفضل فما اختبار.",
      evidence: "**Zwecks** besserer Einschätzung Ihrer Vorkenntnisse haben wir einen Einstufungstest beigelegt." },
  },
  33: {
    26: { ok: "verschiedene", type: "grammar_structure", keyword: "durch + Akk. Plural ohne Artikel: -e", bed: "مختلفة (مواقع)",
      text: `"durch" + Akkusativ، و"Stellenbörsen" جمع بدون أداة: الصفة تاخذ -e.\n✓ "verschiedene" = -e (Akkusativ جمع بدون أداة).\n✗ "verschiedenen" = -en تجي بعد أداة معرّفة أو في Dativ، وهنا ما فماش أداة و"durch" تتبعها Akkusativ.\n✗ "verschiedener" = Genitiv جمع أو Nominativ مذكّر، موش Akkusativ جمع.`,
      rule: "Plural ohne Artikel: Nominativ / Akkusativ → Adjektiv + -e", ex: "Ich klicke durch **verschiedene** Seiten.", exTr: "نتنقّل بين صفحات مختلفة.",
      evidence: "…habe mich Tag für Tag durch **verschiedene** Stellenbörsen geklickt." },
  },
  34: {
    27: { ok: "lebende", type: "grammar_structure", keyword: "wild lebende Tiere", bed: "عايشة (برّية)",
      text: `"Tiere" جمع بدون أداة، والـ Partizip I يتصرّف كصفة بـ -e في Akkusativ: "wild lebende Tiere".\n✓ "lebende" = -e (Akkusativ جمع بدون أداة).\n✗ "lebenden" = -en تجي بعد أداة معرّفة أو في Dativ، وهنا ما فماش أداة.\n✗ "lebender" = Genitiv جمع أو Nominativ مذكّر، موش Akkusativ جمع.`,
      rule: "Plural ohne Artikel: Adjektiv / Partizip + -e (wild lebende Tiere)", ex: "Man kann dort **wild lebende** Tiere beobachten.", exTr: "تنجّم تشوف هنالك حيوانات برّية.",
      evidence: "…wo man wild **lebende** Tiere so gut aus der Nähe beobachten kann." },
  },
  46: {
    29: { ok: "totalen", type: "grammar_structure", keyword: "in einem totalen Chaos", bed: "تامّة (فوضى)",
      text: `"in einem ___ Chaos": Dativ محايد بعد "einem" ← الصفة تاخذ -en.\n✓ "totalen" = -en (بعد ein-Wort في Dativ).\n✗ "totalem" = نهاية قوية بدون أداة ("in totalem Chaos")، وبعد "einem" ما تتحطّش.\n✗ "totales" = Nominativ / Akkusativ محايد، و"in" هنا تتبعها Dativ.`,
      rule: "nach ein-Wort im Dativ: Adjektiv + -en (in einem totalen Chaos)", ex: "Es endete in einem **totalen** Durcheinander.", exTr: "انتهى في فوضى تامّة.",
      evidence: "Die Stunde endete in einem **totalen** Chaos." },
  },
  49: {
    30: { ok: "damit", type: "pronoun_adverb", keyword: "rechnen mit → damit, dass", bed: "بهذا (نتوقّع)",
      text: `"rechnen" يتبعو "mit"، والـ Pronominaladverb "damit" (= mit + das) يعلن على الـ dass-Satz: "Wir rechnen damit, dass …".\n✓ "damit" = بهذا (mit + das).\n✗ "dabei" = bei + das (dabei sein / dabei bleiben)، و"rechnen dabei" ما تتقالش.\n✗ "dafür" = für + das (dafür sorgen)، و"rechnen dafür" ما تتقالش.`,
      rule: "rechnen mit + Dat. → damit, dass", ex: "Wir rechnen **damit**, dass es regnet.", exTr: "نتوقّعو إنّو تشتي.",
      evidence: "Wir rechnen **damit**, dass unsere Veranstaltung von etwa 1000 Jugendlichen aus der gesamten Region besucht werden wird." },
  },
};
