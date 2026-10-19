/** SB Teil 1 — NEW explanation style, pilot on the free B2 exercise "Leon" (10 gaps), 2026-10-05.
 * Style: Tunisian-dialect explanation, specific reason for EVERY wrong option (no recycled "…يستدعي X" formula), Bedeutung, rule line, translated example.
 * Safe by construction: only these fields of items 21–30 are replaced (item_type, keyword, answer_translation, explanation_correct/wrong, grammar_structure,
 * grammar_example, grammar_translation); evidence_text and everything else is kept. The correct option is checked against the DB and every one of the three
 * options must be named in the explanation. The ORIGINAL learning_aids is saved to _backup_sb_t1_leon_original.json first.
 * Usage: node scripts/learning-aids/restyle-sb-t1-leon.mjs   → writes sb_t1_leon_restyled.json (apply with apply-learning-aids.mjs sb_exercises … --apply) */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t);
}
const ID = "3468ff05-d28d-41fe-85e0-7275df0ebe67";

// n → { ok (the correct option text, checked vs DB), type, keyword, bedeutung, text (explanation), rule, ex, exTr }
const G = {
  21: { ok: "aus", type: "fixed_expression", keyword: "Grüße aus + Ort", bedeutung: "تحيّات من برلين (من المكان اللي نكتب منو)",
    text: `باش نبدّأو رسالة بتحيّة من مدينة، التعبير الثابت هو "Grüße aus + مكان".\n✓ "aus" = من مكان (التحية جاية من برلين).\n✗ "von" = من شخص: "Grüße von Fabian"، موش من مكان.\n✗ "ab" = اعتبارًا من، يتستعمل في الجداول والأسعار ("ab Montag"، "Zug ab Berlin")، موش في التحية.`,
    rule: "Grüße aus + Ort  |  Grüße von + Person", ex: "**Grüße aus** Tunis und liebe Grüße **von** meiner Familie!", exTr: "تحيّات من تونس وسلامات من عايلتي!" },
  22: { ok: "was", type: "pronoun", keyword: "was alles los war", bedeutung: "شنوّة صار (كلّ اللي صار)",
    text: `هنا نحكيو على حاجات صارت: "berichten, was los war" = نحكيلك شنوّة صار.\n✓ "was" = شنوّة، تسأل على الأحداث والأشياء، وهي اللي تتركّب مع التعبير "los sein" ("Was ist los?").\n✗ "wann" = إمتى؟ نسألو على الوقت، والجملة ما تحكيش إمتى صار الشي.\n✗ "wie" = كيفاش؟ نسألو على الطريقة أو الحالة، موش على الأحداث.`,
    rule: "berichten / erzählen, was (alles) passiert ist — Nebensatz, Verb am Ende", ex: "Erzähl mir, **was** gestern passiert ist!", exTr: "احكيلي شنوّة صار البارح!" },
  23: { ok: "da", type: "conjunction", keyword: "da = weil", bedeutung: "خاطر / بما أنّو",
    text: `الجملة تشرح علاش فما Stress في الخدمة: السبب معروف، 3 كولاغ في عطلة. والفعلين ("sind"، "ist") جاو في الآخر، يعني نحتاج رابط يفتح Nebensatz.\n✓ "da" = خاطر (سبب واضح ومعروف).\n✗ "obwohl" = رغم أنّ، تعطي تناقض. هنا العطلة هي سبب الضغط موش عكسو.\n✗ "indem" = بالطريقة اللي… (وسيلة). ما فماش حاجة تتعمل باش تصنع الضغط.`,
    rule: "da + Nebensatz (Verb am Ende) = Grund", ex: "**Da** es regnet, bleibe ich zu Hause.", exTr: "خاطر الشتا تنزل، نقعد في الدار." },
  24: { ok: "wird", type: "grammar_structure", keyword: "wird + Partizip II", bedeutung: "إن شاء الله يتنظّم أحسن في المستقبل",
    text: `الجملة تتمنّى حاجة تتحسّن في المستقبل ("Hoffentlich … in Zukunft")، و"organisiert" Partizip II، يعني نحتاج Passiv.\n✓ "wird organisiert" = يتنظّم، عملية تتحسّن (Vorgangspassiv).\n✗ "ist organisiert" = حالة جاهزة توّا (راهو منظّم)، والجملة تتمنّى تغيير جاي.\n✗ "würde organisiert" = ناقصة: "würde" تحتاج Infinitiv ("würde organisiert werden")، وبالـ Partizip وحدو ما تكملش.`,
    rule: "Vorgangspassiv: werden + Partizip II", ex: "Das Problem **wird** hoffentlich bald **gelöst**.", exTr: "إن شاء الله المشكل يتحلّ قريب." },
  25: { ok: "wäre", type: "tense", keyword: "wäre … geblieben", bedeutung: "كنت نحب نقعد (وما قعدتش)",
    text: `"Eigentlich" و"am liebsten" يخلّو الجملة أمنية موش حقيقة. والجملة اللي بعد تقول إنو مشى للحفلة عشان كارمن، يعني الأمنية ما تحققتش.\n✓ "wäre geblieben" = كنت نحب نقعد (وما قعدتش).\n✗ "bin geblieben" = Perfekt عادي، يقول قعدت فعلاً، وهذا يتناقض مع الحفلة.\n✗ "war geblieben" = Plusquamperfekt (ماضي بعيد)، يحكي حاجة صارت قبل حاجة أخرى، موش أمنية.`,
    rule: "Konjunktiv II der Vergangenheit: wäre / hätte + Partizip II", ex: "Ich **wäre** gern länger **geblieben**, aber mein Zug fuhr schon.", exTr: "كنت نحب نقعد أكثر، بصح القطار كان توّا يمشي." },
  26: { ok: "konnte", type: "verb", keyword: "konnte schlecht", bedeutung: "ما كنتش نجّم / ما كانش يصحّ",
    text: `الجملة تقول: خاطر هديت التذاكر لكارمن، ما كانش يصحّ نقعد في الدار. "schlecht können" = ما ينجّمش / ما يصحّش (نفي مخفّف).\n✓ "konnte" + "schlecht" = ما كنتش نجّم عملياً نقعد.\n✗ "musste" = كان لازم، فيه إلزام، و"musste schlecht … bleiben" ما يعطيش معنى.\n✗ "sollte" = كان مفروض (توقّع أو نصيحة)، وما يتركّبش مع "schlecht" هنا.`,
    rule: "schlecht + können = kaum / nicht gut möglich", ex: "Sie hatte mich eingeladen, also **konnte** ich **schlecht** absagen.", exTr: "هي عرضت عليّا، فما كانش يصحّ نرفض." },
  27: { ok: "denn", type: "conjunction", keyword: "denn + Hauptsatz", bedeutung: "خاطر (سبب)",
    text: `بعد الفاصلة جاي سبب الفرحة: "الحفلة كانت رائعة". والفعل "war" في بلاصتو العادية (الثاني)، موش في الآخر.\n✓ "denn" = خاطر، تربط بسبب وما تبدّل ترتيب الفعل.\n✗ "aber" = بصح، تعمل تعارض موش سبب.\n✗ "sondern" = بل، تجي بعد نفي ("nicht …, sondern …") وما فماش نفي هنا.`,
    rule: "denn + Hauptsatz (Verb an Position 2)  ≠  weil + Nebensatz", ex: "Ich bleibe zu Hause, **denn** ich bin müde.", exTr: "نقعد في الدار خاطر تعبان." },
  28: { ok: "Beides", type: "pronoun", keyword: "Beides → Singular", bedeutung: "الاثنين معًا كحاجة وحدة",
    text: `الفعل "war" مفرد، و"Beides" يلمّ الحاجتين (عيد ميلاد الأخت + زواج ابن العم) كحاجة وحدة.\n✓ "Beides" = الاثنين معًا، ضمير محايد مفرد.\n✗ "Beide" = جمع، يحتاج فعل جمع ("Beide waren schön").\n✗ "Beiden" = Dativ جمع ("mit den beiden")، ما ينجّمش يكون Subjekt.`,
    rule: "Beides + Verb im Singular  |  Beide + Verb im Plural", ex: "**Beides** war teuer: das Hotel und der Flug.", exTr: "الاثنين غالي: النزل والطيارة." },
  29: { ok: "noch", type: "adjective_adverb", keyword: "noch + kein-", bedeutung: "لسّا ما… / حتى توّا ما…",
    text: `"noch + keine" معناها الحاجة موش صايرة بعد.\n✓ "noch" = لسّا (حتى توّا ما عندناش مخططات).\n✗ "schon" = ديجا، تتخالف مع النفي "keine".\n✗ "erst" = للأرقام والتوقيت الإيجابي ("erst um 5 Uhr")، وما تتركّبش مع "keine".`,
    rule: "noch + kein- / nicht = (bis jetzt) noch nicht", ex: "Ich habe **noch keine** Antwort bekommen.", exTr: "لِسّا ما جاتنيش إجابة." },
  30: { ok: "auf", type: "verb_prep", keyword: "sich freuen auf", bedeutung: "فرحان بحاجة جايّة",
    text: `"deine nächste E-Mail" ما جاتش بعد، يعني فرح بحاجة في المستقبل.\n✓ "auf" = فرحان بحاجة جايّة ("sich freuen auf + Akk.").\n✗ "über" = فرحان بحاجة صارت أو وصلت ("Ich freue mich über deine Mail").\n✗ "für" = فرحان لأجل شخص ("Ich freue mich für dich")، موش بحاجة.`,
    rule: "sich freuen AUF (جاي)  |  ÜBER (صار)  |  FÜR (لأجل شخص)", ex: "Ich freue mich **auf** den Urlaub.", exTr: "فرحان بالعطلة اللي جايّة." },
};

const [row] = await q(`select learning_aids as aids from sb_exercises where id='${ID}'`);
const aids = row.aids;
const BACKUP = "scripts/learning-aids/_backup_sb_t1_leon_original.json";
if (!existsSync(BACKUP)) writeFileSync(BACKUP, JSON.stringify(aids, null, 1));
const gaps = await q(`select gap_number n, option_a a, option_b b, option_c c, correct from sb_t1_gaps where exercise_id='${ID}' order by gap_number`);
if (gaps.length !== Object.keys(G).length) throw new Error(`${gaps.length} gaps in DB vs ${Object.keys(G).length} written`);
for (const g of gaps) {
  const d = G[g.n]; if (!d) throw new Error(`gap ${g.n} missing`);
  const opts = { a: g.a, b: g.b, c: g.c };
  if (opts[g.correct].trim().toLowerCase() !== d.ok.toLowerCase()) throw new Error(`gap ${g.n}: DB correct is "${opts[g.correct]}", I wrote "${d.ok}"`);
  for (const [k, v] of Object.entries(opts)) if (!d.text.toLowerCase().includes(`"${v.toLowerCase()}`)) throw new Error(`gap ${g.n}: option ${k} "${v}" is not named in the explanation`);
  if (d.rule === d.keyword) throw new Error(`gap ${g.n}: rule equals keyword (UI would hide the rule)`);
  const old = aids.items[String(g.n)];
  if (!old) throw new Error(`gap ${g.n}: no existing item`);
  aids.items[String(g.n)] = { ...old, item_type: d.type, keyword: d.keyword, answer_translation: d.bedeutung, explanation_correct: d.text, explanation_wrong: d.text, grammar_structure: d.rule, grammar_example: d.ex, grammar_translation: d.exTr };
}
writeFileSync("scripts/learning-aids/sb_t1_leon_restyled.json", JSON.stringify({ [ID]: aids }, null, 1));
console.log("OK — 10 gaps restyled; original saved to", BACKUP);
