/**
 * Batch T1 #7: "Corinna ( Original )" + "Corinna (معدل)" + "Brauckmann
 * Versand". Reclassifications: "sich beschäftigen mit" -> verb_prep
 * (genuine Rektion, not a specific idiom); "insbesondere" -> adjective_adverb
 * (a specifying adverb, not a structural pattern); "Ihnen"/"meine" (formal
 * dative pronoun / possessive pronoun case) -> pronoun, not verb. All 30
 * gaps get a genuinely new Beispiel (previously null across the board here).
 *
 * Usage: node scripts/learning-aids/batch-t1-07.mjs [--apply]
 */
import { readFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const env = {};
for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
  if (m) env[m[1]] = m[2];
}
const REF = env.SUPABASE_PROJECT_REF, SBP = env.SUPABASE_ACCESS_TOKEN;

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return JSON.parse(t);
}

const CORINNA_SHARED = {
  "21": {
    explanation_correct: "\"es tut mir leid, dass...\" تعبير ثابت يتطلب حصراً أداة الربط \"dass\" لإدخال سبب الأسف.",
    explanation_wrong: "\"es tut mir leid, dass...\" تعبير ثابت يتطلب حصراً أداة الربط \"dass\" لإدخال سبب الأسف.",
    grammar_example: "Es tut mir leid, dass ich den Termin vergessen habe.",
  },
  "22": {
    item_type: "verb_prep",
    keyword: "sich beschäftigen mit + Dativ",
    explanation_correct: "الفعل الانعكاسي \"sich beschäftigen\" يحكم دائماً حرف الجر \"mit\" (ينشغل بشيء).",
    explanation_wrong: "الفعل الانعكاسي \"sich beschäftigen\" يحكم دائماً حرف الجر \"mit\" (ينشغل بشيء).",
    grammar_example: "Er beschäftigt sich viel mit seinem neuen Hobby.",
  },
  "23": {
    explanation_correct: "\"doch\" أداة تعزيز (Modalpartikel) تؤكد أمراً بديهياً؛ ترافق هنا التعبير المجازي الثابت \"wie Sand am Meer\" (كثيرون جداً).",
    explanation_wrong: "\"doch\" أداة تعزيز (Modalpartikel) تؤكد أمراً بديهياً؛ ترافق هنا التعبير المجازي الثابت \"wie Sand am Meer\" (كثيرون جداً).",
    grammar_example: "Handyhüllen gibt es doch wie Sand am Meer.",
  },
  "24": {
    item_type: "adjective_adverb",
    explanation_correct: "\"insbesondere\" ظرف تخصيص يقدّم فئة محددة من ضمن مجموعة عامة سبق ذكرها (خصوصاً/لا سيّما).",
    explanation_wrong: "\"insbesondere\" ظرف تخصيص يقدّم فئة محددة من ضمن مجموعة عامة سبق ذكرها (خصوصاً/لا سيّما).",
    grammar_example: "Wir suchen neue Mitarbeiter, insbesondere im Verkauf.",
  },
  "25": {
    explanation_correct: "\"überwiegend\" ظرف يصف الحالة الغالبة/المعتادة (العمل غالباً في الهواء الطلق)، لا حالة استثنائية.",
    explanation_wrong: "\"überwiegend\" ظرف يصف الحالة الغالبة/المعتادة (العمل غالباً في الهواء الطلق)، لا حالة استثنائية.",
    grammar_example: "Sie arbeitet überwiegend von zu Hause aus.",
  },
  "27": {
    explanation_correct: "\"Lust\" اسم مجرد غير معدود يقترن عادة بأداة الكم \"wenig\" (قليل من الرغبة).",
    explanation_wrong: "\"Lust\" اسم مجرد غير معدود يقترن عادة بأداة الكم \"wenig\" (قليل من الرغبة).",
    grammar_example: "Ich habe heute wenig Lust zu kochen.",
  },
  "28": {
    explanation_correct: "\"wiederkommen\" (هنا: kommt wieder) تعبير شائع لعودة شعور غاب مؤقتاً؛ الفاعل \"sie\" يعود على \"Lust\".",
    explanation_wrong: "\"wiederkommen\" (هنا: kommt wieder) تعبير شائع لعودة شعور غاب مؤقتاً؛ الفاعل \"sie\" يعود على \"Lust\".",
    grammar_example: "Die Motivation kommt bestimmt bald wieder.",
  },
  "29": {
    explanation_correct: "\"sich Zeit lassen (mit)\" تعبير ثابت يعني \"يتمهّل/لا يستعجل\"؛ الفعل \"lassen\" هنا مصرّف إلى \"lässt\".",
    explanation_wrong: "\"sich Zeit lassen (mit)\" تعبير ثابت يعني \"يتمهّل/لا يستعجل\"؛ الفعل \"lassen\" هنا مصرّف إلى \"lässt\".",
    grammar_example: "Lass dir ruhig Zeit mit der Entscheidung.",
  },
  "30": {
    explanation_correct: "\"so...wie möglich\" تركيب ثابت يعني \"في أقرب وقت/بأكبر قدر ممكن\"؛ \"möglich\" لا تُستبدل هنا.",
    explanation_wrong: "\"so...wie möglich\" تركيب ثابت يعني \"في أقرب وقت/بأكبر قدر ممكن\"؛ \"möglich\" لا تُستبدل هنا.",
    grammar_example: "Bitte antworten Sie so schnell wie möglich.",
  },
};
const CORINNA_VARIANT = {
  "Corinna ( Original )": {
    "26": {
      explanation_correct: "الظرف \"leider\" يشير إلى أمر مفروض غير مرغوب فيه، وهذا يستدعي فعل الإلزام \"müssen\".",
      explanation_wrong: "الظرف \"leider\" يشير إلى أمر مفروض غير مرغوب فيه، وهذا يستدعي فعل الإلزام \"müssen\".",
      grammar_example: "Ich muss leider schon um sechs Uhr aufstehen.",
    },
  },
  "Corinna (معدل)": {
    "26": {
      explanation_correct: "\"fast\" ظرف تقريب يسبق كمية عددية محددة (تقريباً 45 دقيقة، لا أكثر ولا أقل بالضبط).",
      explanation_wrong: "\"fast\" ظرف تقريب يسبق كمية عددية محددة (تقريباً 45 دقيقة، لا أكثر ولا أقل بالضبط).",
      grammar_example: "Ich habe fast zwei Stunden auf den Bus gewartet.",
    },
  },
};

const BRAUCKMANN = {
  "21": {
    explanation_correct: "حرف الجر الزمني \"vor\" يحكم حالة الجر دائماً، والاسم الجمع في حالة الجر يأخذ نهاية \"-n\" الإلزامية: \"Monaten\".",
    explanation_wrong: "حرف الجر الزمني \"vor\" يحكم حالة الجر دائماً، والاسم الجمع في حالة الجر يأخذ نهاية \"-n\" الإلزامية: \"Monaten\".",
    grammar_example: "Vor zwei Wochen habe ich das Paket bestellt.",
  },
  "22": {
    item_type: "pronoun",
    keyword: "jmdm. etwas mitteilen + Dativ → Ihnen",
    explanation_correct: "الفعل \"mitteilen\" يحكم مفعولاً به غير مباشر بحالة الجر (Dativ)؛ بصيغة المخاطبة الرسمية يُكتب \"Ihnen\" بحرف كبير.",
    explanation_wrong: "الفعل \"mitteilen\" يحكم مفعولاً به غير مباشر بحالة الجر (Dativ)؛ بصيغة المخاطبة الرسمية يُكتب \"Ihnen\" بحرف كبير.",
    grammar_example: "Wir müssen Ihnen leider eine Verspätung mitteilen.",
  },
  "23": {
    explanation_correct: "الرسالة الرسمية تُروى بصيغة الماضي البسيط (Präteritum)؛ \"musste\" يطابق \"funktionierte\" في نفس الجملة السردية.",
    explanation_wrong: "الرسالة الرسمية تُروى بصيغة الماضي البسيط (Präteritum)؛ \"musste\" يطابق \"funktionierte\" في نفس الجملة السردية.",
    grammar_example: "Ich klickte zweimal, dann öffnete sich das Programm.",
  },
  "24": {
    explanation_correct: "\"noch\" ظرف استمرارية يصف مدة ضمان لم تنتهِ بعد (متبقية).",
    explanation_wrong: "\"noch\" ظرف استمرارية يصف مدة ضمان لم تنتهِ بعد (متبقية).",
    grammar_example: "Auf meinem Laptop sind noch sechs Monate Garantie.",
  },
  "25": {
    explanation_correct: "\"deshalb\" في بداية الجملة يفرض قلب الترتيب (الفعل قبل الفاعل: schicke ich)؛ يربط سببياً بالجملة السابقة.",
    explanation_wrong: "\"deshalb\" في بداية الجملة يفرض قلب الترتيب (الفعل قبل الفاعل: schicke ich)؛ يربط سببياً بالجملة السابقة.",
    grammar_example: "Das Gerät war defekt, deshalb habe ich es zurückgeschickt.",
  },
  "26": {
    explanation_correct: "\"entweder\" يفرض نحوياً شريكها الثابت \"oder\" لعرض بديلين.",
    explanation_wrong: "\"entweder\" يفرض نحوياً شريكها الثابت \"oder\" لعرض بديلين.",
    grammar_example: "Sie können entweder anrufen oder eine E-Mail schreiben.",
  },
  "27": {
    explanation_correct: "الفعل \"bitten\" يحكم دائماً حرف الجر \"um\" (يطلب شيئاً).",
    explanation_wrong: "الفعل \"bitten\" يحكم دائماً حرف الجر \"um\" (يطلب شيئاً).",
    grammar_example: "Ich möchte Sie um eine schnelle Antwort bitten.",
  },
  "28": {
    item_type: "pronoun",
    keyword: "in + Possessivpronomen (Akkusativ feminin) → meine",
    explanation_correct: "فعل الحركة \"zurückkehren\" + \"in\" يستلزم حالة النصب (Akkusativ)؛ \"Heimat\" مؤنثة، فيصبح ضمير الملكية \"meine\".",
    explanation_wrong: "فعل الحركة \"zurückkehren\" + \"in\" يستلزم حالة النصب (Akkusativ)؛ \"Heimat\" مؤنثة، فيصبح ضمير الملكية \"meine\".",
    grammar_example: "Nächste Woche fliegt sie zurück in ihre Heimatstadt.",
  },
  "29": {
    explanation_correct: "الفعل الشرطي المصرّف \"möchte\" يفرض فعلاً ثانياً بصيغة المصدر في نهاية الجملة: \"mitnehmen\".",
    explanation_wrong: "الفعل الشرطي المصرّف \"möchte\" يفرض فعلاً ثانياً بصيغة المصدر في نهاية الجملة: \"mitnehmen\".",
    grammar_example: "Ich möchte das Buch gern noch einmal lesen.",
  },
  "30": {
    explanation_correct: "الفعل \"jemanden benachrichtigen\" يحكم مفعولاً به مباشراً بالنصب (Akkusativ)؛ للمتكلم: \"mich\".",
    explanation_wrong: "الفعل \"jemanden benachrichtigen\" يحكم مفعولاً به مباشراً بالنصب (Akkusativ)؛ للمتكلم: \"mich\".",
    grammar_example: "Bitte benachrichtigen Sie mich, sobald das Paket ankommt.",
  },
};

async function applyExercise(title, overrides) {
  const rows = await q(`select id, learning_aids from sb_exercises where title = '${title.replace(/'/g, "''")}' and teil = 1;`);
  const row = rows[0];
  const items = { ...row.learning_aids.items };
  for (const [gap, override] of Object.entries(overrides)) items[gap] = { ...items[gap], ...override };
  console.log(`\n#### ${title} ####`);
  for (const gap of Object.keys(overrides)) console.log(`  gap ${gap}: item_type=${items[gap].item_type}`);
  if (APPLY) {
    const newAids = { ...row.learning_aids, items };
    const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
    await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
    console.log("  -> written.");
  }
}

async function main() {
  await applyExercise("Corinna ( Original )", { ...CORINNA_SHARED, ...CORINNA_VARIANT["Corinna ( Original )"] });
  await applyExercise("Corinna (معدل)", { ...CORINNA_SHARED, ...CORINNA_VARIANT["Corinna (معدل)"] });
  await applyExercise("Brauckmann Versand", BRAUCKMANN);
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
