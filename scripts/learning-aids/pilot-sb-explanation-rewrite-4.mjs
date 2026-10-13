/**
 * Fourth pilot round: fixes "erkrankt" (Liebe Agnieszka gap 22) per the
 * user's more precise requirement (name the Partizip II form + sein
 * construction, not just the dictionary meaning), and fully completes
 * "Frau Goronsksa" (10 gaps) at the refined bar -- including a "wenn" that
 * is CONDITIONAL here, deliberately explained differently from the
 * TEMPORAL "wenn" already done in Liebe Agnieszka (same word, different
 * grammatical function, per the user's explicit "every gap needs its own
 * analysis" rule).
 *
 * Usage: node scripts/learning-aids/pilot-sb-explanation-rewrite-4.mjs [--apply]
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

const EXERCISES = [
  {
    title: "Liebe Agnieszka", teil: 1,
    overrides: {
      "21": {
        explanation_correct: "\"es ist ... her, dass...\" تعبير ثابت يعني \"مضى وقت منذ أن...\"؛ \"her\" يدل هنا على مدة زمنية منقضية منذ آخر رسالة.",
        explanation_wrong: "\"es ist ... her, dass...\" تعبير ثابت يعني \"مضى وقت منذ أن...\"؛ \"her\" يدل هنا على مدة زمنية منقضية منذ آخر رسالة.",
      },
      "22": {
        keyword: "erkranken → Partizip II: erkrankt (+ sein)",
        explanation_correct: "\"erkrankt\" هو Partizip II من الفعل \"erkranken\"، ومع \"sein\" (ist erkrankt) يصف حالة نتيجة: الشخص أصبح مريضاً فجأة.",
        explanation_wrong: "\"erkrankt\" هو Partizip II من الفعل \"erkranken\"، ومع \"sein\" (ist erkrankt) يصف حالة نتيجة: الشخص أصبح مريضاً فجأة.",
        grammar_example: "Meine Mutter ist plötzlich erkrankt.",
      },
    },
  },
  {
    title: "Frau Goronsksa", teil: 1,
    overrides: {
      "21": {
        keyword: "von den zehn Schulen → davon (Teilmenge)",
        explanation_correct: "\"davon\" يشير هنا إلى جزء من عدد كلي ذُكر قبل قليل (10 مدارس)؛ 8 منها في ألمانيا. تُستخدم مع \"acht davon\" بمعنى \"8 من بينها\".",
        explanation_wrong: "\"davon\" يشير هنا إلى جزء من عدد كلي ذُكر قبل قليل (10 مدارس)؛ 8 منها في ألمانيا. تُستخدم مع \"acht davon\" بمعنى \"8 من بينها\".",
        grammar_example: "Ich habe fünf Bücher gekauft, drei davon auf Deutsch.",
      },
      "22": {
        keyword: "an + denen (Relativpronomen, Dativ Plural)",
        explanation_correct: "\"denen\" ضمير وصل يعود على \"Schulen\" (جمع)؛ وحرف الجر \"an\" قبله يفرض حالة الجر (Dativ)، فيصبح \"denen\" لا \"die\"/\"den\".",
        explanation_wrong: "\"denen\" ضمير وصل يعود على \"Schulen\" (جمع)؛ وحرف الجر \"an\" قبله يفرض حالة الجر (Dativ)، فيصبح \"denen\" لا \"die\"/\"den\".",
        grammar_example: "Das sind die Kollegen, mit denen ich zusammenarbeite.",
      },
      "23": {
        item_type: "preposition",
        keyword: "an + Wochentage/Zeitangabe → Dativ",
        explanation_correct: "حرف الجر \"an\" يُستخدم مع أيام محددة أو مدة أسبوعية (an fünf Tagen، am Montag)، ويأخذ دائماً حالة الجر (Dativ).",
        explanation_wrong: "حرف الجر \"an\" يُستخدم مع أيام محددة أو مدة أسبوعية (an fünf Tagen، am Montag)، ويأخذ دائماً حالة الجر (Dativ).",
        grammar_example: "Der Kurs findet an zwei Tagen pro Woche statt.",
      },
      "24": {
        keyword: "Wochentag + s → mittwochs (wiederholt)",
        explanation_correct: "\"mittwochs\" (اسم اليوم + s) ظرف يعني \"في كل يوم أربعاء\"، أي تكرار أسبوعي منتظم لا يوماً محدداً واحداً.",
        explanation_wrong: "\"mittwochs\" (اسم اليوم + s) ظرف يعني \"في كل يوم أربعاء\"، أي تكرار أسبوعي منتظم لا يوماً محدداً واحداً.",
        grammar_example: "Sonntags schlafe ich immer etwas länger.",
      },
      "25": {
        keyword: "zu Beginn + Genitiv",
        explanation_correct: "التعبير \"zu Beginn\" + اسم آخر يتطلب حالة الملكية (Genitiv)، فيصبح \"jedes Kurses\" وليس \"jeder Kurs\".",
        explanation_wrong: "التعبير \"zu Beginn\" + اسم آخر يتطلب حالة الملكية (Genitiv)، فيصبح \"jedes Kurses\" وليس \"jeder Kurs\".",
        grammar_example: "Am Ende des Kurses gibt es eine Abschlussprüfung.",
      },
      "26": {
        keyword: "mit dessen Hilfe (Relativpronomen, Genitiv)",
        explanation_correct: "\"dessen\" ضمير وصل بحالة الملكية (Genitiv) يعود على \"Einstufungstest\" (مذكر مفرد)؛ \"mit dessen Hilfe\" = بواسطته.",
        explanation_wrong: "\"dessen\" ضمير وصل بحالة الملكية (Genitiv) يعود على \"Einstufungstest\" (مذكر مفرد)؛ \"mit dessen Hilfe\" = بواسطته.",
        grammar_example: "Das ist der Test, dessen Ergebnis über den Kurs entscheidet.",
      },
      "27": {
        // Same word "wenn" as Liebe Agnieszka gap 23, but a DIFFERENT
        // function here (conditional, not temporal) -- deliberately a
        // distinct explanation, not a reused template.
        keyword: "wenn (Bedingung) → Bedingung, Hauptsatz",
        explanation_correct: "\"wenn\" هنا شرطية لا زمنية: تصف نتيجة مشروطة بتحقق شرط (إذا اجتزت الاختبار، تحصل على شهادة).",
        explanation_wrong: "\"wenn\" هنا شرطية لا زمنية: تصف نتيجة مشروطة بتحقق شرط (إذا اجتزت الاختبار، تحصل على شهادة).",
        grammar_example: "Wenn Sie Fragen haben, können Sie mich jederzeit anrufen.",
      },
      "28": {
        item_type: "pronoun",
        keyword: "jemandem etwas anbieten + Dativ → Ihnen",
        explanation_correct: "الفعل \"anbieten\" يحكم مفعولاً به غير مباشر بحالة الجر (Dativ)؛ وبصيغة المخاطبة الرسمية (Sie) يُكتب \"Ihnen\" بحرف كبير.",
        explanation_wrong: "الفعل \"anbieten\" يحكم مفعولاً به غير مباشر بحالة الجر (Dativ)؛ وبصيغة المخاطبة الرسمية (Sie) يُكتب \"Ihnen\" بحرف كبير.",
        grammar_example: "Wir haben Ihnen die Unterlagen bereits geschickt.",
      },
      "29": {
        keyword: "sein + Partizip II (Zustandspassiv)",
        explanation_correct: "\"ist ... eingeschlossen\" مبني للمجهول الحالي (Zustandspassiv: sein+Partizip II) يصف نتيجة قائمة بالفعل (شيء متضمَّن)، بخلاف \"wird eingeschlossen\" (Vorgangspassiv) الذي يصف عملية جارية الآن.",
        explanation_wrong: "\"ist ... eingeschlossen\" مبني للمجهول الحالي (Zustandspassiv: sein+Partizip II) يصف نتيجة قائمة بالفعل (شيء متضمَّن)، بخلاف \"wird eingeschlossen\" (Vorgangspassiv) الذي يصف عملية جارية الآن.",
        grammar_example: "Das Fenster ist schon geöffnet.",
      },
      "30": {
        keyword: "Verbletztstellung (paralleler Nebensatz)",
        explanation_correct: "بعد \"oder\" يجب أن يحافظ الجزء الثاني على نفس ترتيب الجملة الثانوية (الفعل في النهاية) مثل \"vegetarisch essen\"، فيصبح \"eine Diät halten müssen\".",
        explanation_wrong: "بعد \"oder\" يجب أن يحافظ الجزء الثاني على نفس ترتيب الجملة الثانوية (الفعل في النهاية) مثل \"vegetarisch essen\"، فيصبح \"eine Diät halten müssen\".",
        grammar_example: "Er sagte, dass er kommen oder anrufen werde.",
      },
    },
  },
];

async function main() {
  for (const ex of EXERCISES) {
    const rows = await q(`select id, learning_aids from sb_exercises where title = '${ex.title.replace(/'/g, "''")}' and teil = ${ex.teil};`);
    if (rows.length !== 1) { console.error(`SKIP: expected 1 row for "${ex.title}", got ${rows.length}`); continue; }
    const row = rows[0];
    const items = { ...row.learning_aids.items };
    console.log(`\n#### ${ex.title} ####`);
    for (const [gap, override] of Object.entries(ex.overrides)) {
      items[gap] = { ...items[gap], ...override };
      console.log(`  gap ${gap} -> item_type=${items[gap].item_type}, keyword="${items[gap].keyword}"`);
    }

    if (APPLY) {
      const newAids = { ...row.learning_aids, items };
      const b64 = Buffer.from(JSON.stringify(newAids), "utf8").toString("base64");
      await q(`update sb_exercises set learning_aids = convert_from(decode('${b64}','base64'),'UTF8')::jsonb where id = '${row.id}';`);
      console.log("  -> written.");
    }
  }
  if (!APPLY) console.log("\n(dry run — pass --apply to write to the DB)");
}

main().catch((e) => { console.error("FATAL", e); process.exitCode = 1; });
