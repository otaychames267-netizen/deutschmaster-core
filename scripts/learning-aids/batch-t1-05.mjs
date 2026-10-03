/**
 * Batch T1 #5: "Andrea ( Original )" + "Andrea (معدل)" -- two near-identical
 * letter variants sharing 8 of 10 gaps verbatim (21,22,23,25,26,27,29,30),
 * differing only at 24 and 28. Each gap individually analyzed from its real
 * sentence; existing grammar_example content (from an earlier authoring
 * layer) reused where it genuinely matches the tested rule, replaced where
 * it didn't (gap 25's example tested plural declension, not the singular-
 * feminine pattern the actual gap tests).
 *
 * Usage: node scripts/learning-aids/batch-t1-05.mjs [--apply]
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

const SHARED = {
  "21": {
    keyword: "erst jetzt = nicht früher (Verspätung)",
    explanation_correct: "\"erst jetzt\" تعني \"الآن فقط\"، وتؤكد التأخر في الرد (لم أرد إلا الآن).",
    explanation_wrong: "\"erst jetzt\" تعني \"الآن فقط\"، وتؤكد التأخر في الرد (لم أرد إلا الآن).",
  },
  "22": {
    item_type: "fixed_expression",
    keyword: "bestens funktionieren",
    explanation_correct: "\"bestens funktionieren\" تعبير ثابت يعني \"يعمل على أكمل وجه\"؛ لا يُقال هذا التلازم بكلمة أخرى مثل \"gut\".",
    explanation_wrong: "\"bestens funktionieren\" تعبير ثابت يعني \"يعمل على أكمل وجه\"؛ لا يُقال هذا التلازم بكلمة أخرى مثل \"gut\".",
  },
  "23": {
    item_type: "verb_prep",
    keyword: "kommen zu + Dativ (Bewegung zu jmdm.)",
    explanation_correct: "فعل الحركة \"kommen\" + \"zu\" يدل على التوجه نحو شخص؛ أما \"bei\" فتصف التواجد الثابت لا الحركة.",
    explanation_wrong: "فعل الحركة \"kommen\" + \"zu\" يدل على التوجه نحو شخص؛ أما \"bei\" فتصف التواجد الثابت لا الحركة.",
  },
  "25": {
    keyword: "keine + Adjektiv-e (Akkusativ Singular feminin)",
    explanation_correct: "الصفة \"besondere\" (نهاية -e، نصب مفرد مؤنث بعد \"keine\") تصف \"Berufserfahrung\" الاستثنائية غير المطلوبة هنا.",
    explanation_wrong: "الصفة \"besondere\" (نهاية -e، نصب مفرد مؤنث بعد \"keine\") تصف \"Berufserfahrung\" الاستثنائية غير المطلوبة هنا.",
    // Replaces the earlier example, which tested PLURAL declension
    // (Vorkenntnisse, -en ending) -- a different pattern from the actual
    // gap (singular feminine, -e ending). A transfer example must match
    // the same rule, not just reuse "keine besondere/n X" loosely.
    grammar_example: "Sie braucht keine besondere Erlaubnis, um hier zu parken.",
  },
  "26": {
    keyword: "weitere + Nomen (zusätzlich, gleiche Art)",
    explanation_correct: "\"weitere\" تعني \"إضافية من نفس النوع\" — هنا لغة أخرى إلى جانب الإنجليزية المذكورة.",
    explanation_wrong: "\"weitere\" تعني \"إضافية من نفس النوع\" — هنا لغة أخرى إلى جانب الإنجليزية المذكورة.",
  },
  "27": {
    keyword: "sich bewerben (bei + Dativ)",
    explanation_correct: "الضمير الانعكاسي \"dich\" قبل الفعل يستدعي \"sich bewerben\" (يتقدم بطلب) لا \"bewerben\" وحدها.",
    explanation_wrong: "الضمير الانعكاسي \"dich\" قبل الفعل يستدعي \"sich bewerben\" (يتقدم بطلب) لا \"bewerben\" وحدها.",
  },
  "29": {
    keyword: "übrigens (beiläufiger Themenwechsel)",
    explanation_correct: "\"übrigens\" أداة انتقال إلى فكرة جديدة غير مرتبطة سببياً بما سبق (بالمناسبة...).",
    explanation_wrong: "\"übrigens\" أداة انتقال إلى فكرة جديدة غير مرتبطة سببياً بما سبق (بالمناسبة...).",
  },
  "30": {
    // Control-verb + zu-Infinitiv (like "es ist + Adj + zu + Infinitiv") is
    // a productive pattern (versuchen/beginnen/hoffen/sich entschließen +
    // zu...), not one fixed lexical chunk -- grammar_structure, not
    // fixed_expression, for the same reason established earlier.
    item_type: "grammar_structure",
    keyword: "sich entscheiden, zu + Infinitiv",
    explanation_correct: "\"sich entscheiden, zu + Infinitiv\" تركيب يعني \"يقرر أن يفعل شيئاً\" — هنا: قرر البقاء هنا.",
    explanation_wrong: "\"sich entscheiden, zu + Infinitiv\" تركيب يعني \"يقرر أن يفعل شيئاً\" — هنا: قرر البقاء هنا.",
  },
};

const VARIANTS = {
  "Andrea ( Original )": {
    "24": {
      keyword: "aber (Gegensatz zwischen Hauptsätzen)",
      explanation_correct: "\"aber\" أداة عطف تصف تضاداً بين جملتين رئيسيتين: بحثتُ، لكنك متأخر في بحثك.",
      explanation_wrong: "\"aber\" أداة عطف تصف تضاداً بين جملتين رئيسيتين: بحثتُ، لكنك متأخر في بحثك.",
    },
    "28": {
      keyword: "Satzadverb + Inversion (Verb-Subjekt)",
      explanation_correct: "\"Leider\" في بداية الجملة يفرض قلب الترتيب (الفعل ثم الفاعل: kenne ich)، ويعبّر عن أسف.",
      explanation_wrong: "\"Leider\" في بداية الجملة يفرض قلب الترتيب (الفعل ثم الفاعل: kenne ich)، ويعبّر عن أسف.",
    },
  },
  "Andrea (معدل)": {
    "24": {
      keyword: "ziemlich + Adjektiv (Verstärkung)",
      explanation_correct: "\"ziemlich\" ظرف تدرّج يكثّف الصفة \"spät\" (متأخر جداً نوعاً ما).",
      explanation_wrong: "\"ziemlich\" ظرف تدرّج يكثّف الصفة \"spät\" (متأخر جداً نوعاً ما).",
    },
    "28": {
      keyword: "sonst + Konjunktiv II (Gegenteil wäre passiert)",
      explanation_correct: "\"sonst\" + Konjunktiv II (hätte...eingesetzt) يصف ما كان سيحدث لو اختلف الوضع.",
      explanation_wrong: "\"sonst\" + Konjunktiv II (hätte...eingesetzt) يصف ما كان سيحدث لو اختلف الوضع.",
    },
  },
};

async function main() {
  const rows = await q("select id, title, learning_aids from sb_exercises where title in ('Andrea ( Original )','Andrea (معدل)') and teil = 1;");
  for (const row of rows) {
    const items = { ...row.learning_aids.items };
    for (const [gap, override] of Object.entries(SHARED)) items[gap] = { ...items[gap], ...override };
    for (const [gap, override] of Object.entries(VARIANTS[row.title] || {})) items[gap] = { ...items[gap], ...override };
    console.log(`\n#### ${row.title} ####`);
    for (const gap of Object.keys(items)) console.log(`  gap ${gap}: item_type=${items[gap].item_type}, keyword="${items[gap].keyword}"`);

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
