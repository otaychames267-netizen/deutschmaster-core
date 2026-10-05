/** SB Teil 2 — NEW explanation style, pilot on the free B2 exercise "Theater für Kinder und Jugendliche" (gaps 31–40), 2026-10-05.
 * Same style as the approved Teil 1 restyle: Tunisian dialect, a ✓ line + ✗ lines that name the most TEMPTING wrong words of the shared word list with a specific
 * reason each (a Teil 2 bank has 15 words for 10 gaps, so we don't walk through all 14 — we pick the 2–3 a student would really hesitate over), Bedeutung, rule
 * line, translated example. Only item_type / keyword / answer_translation / explanation_correct / explanation_wrong / grammar_structure / grammar_example /
 * grammar_translation of items 31–40 are replaced; evidence_text and everything else stay. Safeguards: the correct word is checked against the DB, every ✗ word
 * must be in this exercise's word bank and differ from the answer. The ORIGINAL learning_aids is saved to _backup_sb_t2_pilot_original.json first.
 * Usage: node scripts/learning-aids/restyle-sb-t2-pilot.mjs → writes sb_t2_pilot_restyled.json (apply with apply-learning-aids.mjs sb_exercises … --apply) */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const env = {}; for (const l of readFileSync("C:/Users/asus/AuraLingovia/.env", "utf8").split(/\r?\n/)) { const m = l.match(/^([A-Z0-9_]+)="?([^"]*)"?$/); if (m) env[m[1]] = m[2]; }
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: sql }) });
  const t = await r.text(); if (!r.ok) throw new Error(t); return JSON.parse(t);
}
const ID = "184aef82-0069-400c-afec-5363d06a19eb";
const TYPES = new Set(["fixed_expression", "verb", "verb_prep", "noun", "preposition", "conjunction", "adjective_adverb", "tense", "pronoun", "pronoun_adverb", "grammar_structure"]);

const G = {
  31: { ok: "SONDERN", type: "conjunction", keyword: "nicht nur … sondern auch", bed: "بل (وزيد)",
    text: `بنية "nicht nur … sondern auch": الجزء الأول "nicht nur" ينادي على "sondern auch".\n✓ "sondern" = بل (يكمّل "nicht nur" ويزيد عنصر ثاني).\n✗ "aber" = لكن (تعارض عادي)، تتقال أحيانًا في الكلام، بصح الزوج المعتمد هو "nicht nur … sondern auch".\n✗ "trotz" = رغم (حرف جر + اسم)، موش رابط عطف بين جزئين.`,
    rule: "nicht nur A, sondern auch B  |  aber = einfacher Gegensatz", ex: "Sie ist nicht nur klug, **sondern** auch freundlich.", exTr: "هي موش بس ذكية، بل زادا لطيفة." },
  32: { ok: "SEIT", type: "preposition", keyword: "seit + Dativ (Dauer)", bed: "منذ",
    text: `"arbeitet ___ vielen Jahren": نشاط بدا في الماضي ومازال مستمر لين توّا (الفعل في الحاضر).\n✓ "seit" = منذ (+ Dativ، بداية في الماضي ومازال).\n✗ "vor" = قبل ("vor vielen Jahren" = حدث فات وخلص)، وتحتاج فعل ماضي، وهنا "arbeitet" حاضر.\n✗ "ab" = اعتبارًا من (بداية من وقت جاي: "ab nächstem Jahr")، موش مدّة فاتت.`,
    rule: "seit = Beginn in der Vergangenheit + Präsens  |  vor = abgeschlossen + Präteritum  |  ab = Beginn ab einem Zeitpunkt", ex: "Ich lerne **seit** drei Jahren Deutsch.", exTr: "نقرا ألماني منذ ثلاث سنوات." },
  33: { ok: "WEGEN", type: "preposition", keyword: "wegen + Genitiv", bed: "بسبب",
    text: `"wegen familiärer … Probleme" = السبب اللي علاه يحتاجو مساعدة (+ Genitiv).\n✓ "wegen" = بسبب (+ Genitiv، يعطي السبب).\n✗ "trotz" = رغم (+ Genitiv زادا)، بصح المعنى عكسي: ما فماش منطق يحتاجو مساعدة "رغم" مشاكلهم.\n✗ "ohne" = بدون (+ Akkusativ)، وما تتماشاش مع Genitiv "familiärer Probleme" ولا مع معنى السبب.`,
    rule: "wegen + Genitiv = Grund  |  trotz + Genitiv = Gegengrund  |  ohne + Akk. = Fehlen", ex: "**Wegen** einer Krankheit fehlt er heute.", exTr: "بسبب مرض هو غايب اليوم." },
  34: { ok: "AB", type: "preposition", keyword: "ab + Dativ (Beginn)", bed: "اعتبارًا من",
    text: `"ab dem kommenden Jahr" = اعتبارًا من العام القادم: بداية تبدا من نقطة في المستقبل.\n✓ "ab" = اعتبارًا من (+ Dativ، بداية من نقطة زمنية).\n✗ "seit" = منذ (ماضي ومازال)، والمشروع باش يبدا العام القادم (مستقبل).\n✗ "vor" = قبل ("vor dem kommenden Jahr" = قبل العام القادم)، والجملة تتكلّم على بداية موش على حاجة سابقة.`,
    rule: "ab = Beginn ab einem Zeitpunkt  |  seit = Beginn in der Vergangenheit bis jetzt", ex: "**Ab** nächster Woche gilt der neue Plan.", exTr: "اعتبارًا من الجمعة الجاية يتطبّق البرنامج الجديد." },
  35: { ok: "AM", type: "fixed_expression", keyword: "am Ende (+ Genitiv)", bed: "في الآخر",
    text: `"am Ende des Projekts" = في آخر المشروع: تعبير ثابت.\n✓ "am" = في (an + dem: am Ende = في الآخر).\n✗ "auf" = على، و"auf Ende" ما تتقالش.\n✗ "vor" = قبل: "Vor Ende des Projekts" ممكنة نحويًّا، بصح معناها قبل النهاية، والعرض يصير في النهاية.`,
    rule: "am Ende = zum Schluss  |  vor Ende = bevor es endet", ex: "**Am** Ende des Monats bekomme ich mein Gehalt.", exTr: "في آخر الشهر ناخذ مرتّبي." },
  36: { ok: "ES", type: "pronoun", keyword: "es ist wichtig, dass", bed: "(شكلي) هو",
    text: `"Allen Mitarbeitern ist ___ wichtig, dass …": الصفة "wichtig" تحتاج فاعل، والفاعل الحقيقي هو جملة "dass" اللي جاية.\n✓ "es" = فاعل شكلي ينوب على "dass-Satz" (es ist wichtig, dass …).\n✗ "da" = ظرف (هنا / بما إنّو)، موش ضمير فاعل: "ist da wichtig" ما تعطيش فاعل.\n✗ "darum" = Pronominaladverb (um + das)، وبعد "ist … wichtig" ما يعوّضش الفاعل الشكلي.`,
    rule: "es = Platzhalter für einen dass- / zu-Satz; Dativ der Person: Allen ist es wichtig", ex: "Mir ist **es** wichtig, dass du pünktlich bist.", exTr: "يهمّني إنّك تكون في الوقت." },
  37: { ok: "DA", type: "conjunction", keyword: "da + Nebensatz (Grund)", bed: "بما إنّو",
    text: `"unmöglich, ___ bei der Stadt keine Gelder vorhanden wären": سبب في جملة فرعية، والفعل "wären" في الآخر.\n✓ "da" = بما إنّو / خاطر (+ فعل في الآخر).\n✗ "darum" = لهذا السبب (ظرف نتيجة، الفعل في المرتبة الثانية)، وهنا "wären" في الآخر.\n✗ "aber" = لكن (تعارض، Position 0)، موش سبب.\n✗ "wegen" = بسبب + اسم، موش جملة كاملة بفعل.`,
    rule: "da / weil + Nebensatz (Verb am Ende)  |  darum / deshalb + Hauptsatz (Verb Position 2)", ex: "Ich bleibe zu Hause, **da** ich krank bin.", exTr: "نقعد في الدار بما إنّي مريض." },
  38: { ok: "DARUM", type: "pronoun_adverb", keyword: "sich kümmern um → darum", bed: "بهذا (يهتمّ)",
    text: `"sich kümmern um" + Infinitivsatz ← "sich darum kümmern, … zu + Infinitiv": الـ Pronominaladverb = um + das = "darum".\n✓ "darum" = (um + das) — sich kümmern um → darum.\n✗ "dazu" = (zu + das)، و"sich kümmern dazu" ما تتقالش، "dazu" تتركّب مع "beitragen / führen".\n✗ "es" = ضمير شخصي: "sich kümmern es" ما تتركّبش، والحرف "um" لازم يظهر.`,
    rule: "sich kümmern um + Akk. → darum, … zu + Infinitiv", ex: "Sie kümmert sich **darum**, die Gäste abzuholen.", exTr: "هي تهتمّ باش تجيب الضيوف من المحطة." },
  39: { ok: "AUF", type: "fixed_expression", keyword: "auf diese Weise", bed: "بهذه الطريقة",
    text: `تعبير ثابت: "auf diese Weise" = بهذه الطريقة.\n✓ "auf" = (auf + Akk. + Weise).\n✗ "am" = an + dem (أداة مدمجة)، و"am diese Weise" فيها أداة مرتين.\n✗ "um" = تجي في "um … zu" أو "um Mitternacht"، و"um diese Weise" ما تتقالش.`,
    rule: "auf + Akk. + Weise / Art: auf diese Weise, auf eigene Weise  |  in dieser Weise ≈ gleiche Bedeutung", ex: "Er löst das Problem **auf** seine Weise.", exTr: "يحلّ المشكلة بطريقتو." },
  40: { ok: "UM", type: "conjunction", keyword: "um … zu + Infinitiv", bed: "باش (لغرض)",
    text: `"Spenden, ___ weitere Projekte finanzieren zu können": الهدف من جمع التبرعات، والجملة تنتهي بـ Infinitiv.\n✓ "um" = باش (um … zu + Infinitiv = غرض).\n✗ "ohne" = بدون ("ohne … zu" = بدون ما)، تبني نفس الشكل (Infinitiv) بصح المعنى عكسي (نفي).\n✗ "da" = بما إنّو (سبب)، وتحتاج جملة بفعل مصرّف في الآخر، موش "zu können" Infinitiv.`,
    rule: "um … zu = Zweck (gleiches Subjekt)  |  ohne … zu = ohne dass", ex: "Er spart, **um** ein Auto zu kaufen.", exTr: "يوفّر باش يشري كرهبة." },
};

const [row] = await q(`select learning_aids as aids from sb_exercises where id='${ID}'`);
const aids = row.aids;
const BACKUP = "scripts/learning-aids/_backup_sb_t2_pilot_original.json";
if (!existsSync(BACKUP)) writeFileSync(BACKUP, JSON.stringify(aids, null, 1));
const gaps = await q(`select gap_number n, correct_word w from sb_t2_gaps where exercise_id='${ID}' order by gap_number`);
const words = (await q(`select word from sb_t2_words where exercise_id='${ID}'`)).map((r) => r.word.toLowerCase());
if (gaps.length !== Object.keys(G).length) throw new Error(`${gaps.length} gaps in DB vs ${Object.keys(G).length} written`);
for (const g of gaps) {
  const d = G[g.n]; if (!d) throw new Error(`gap ${g.n} missing`);
  const where = `gap ${g.n}`; const need = (c, m) => { if (!c) throw new Error(`${where}: ${m}`); };
  need(g.w.trim().toLowerCase() === d.ok.toLowerCase(), `DB correct is "${g.w}", I wrote "${d.ok}"`);
  need(TYPES.has(d.type), `bad type ${d.type}`);
  need(d.rule !== d.keyword, "rule equals keyword (UI hides the rule)");
  need(d.ex.includes("**"), "example needs a **bold** target");
  const lines = d.text.split("\n");
  const ok = lines.filter((l) => l.startsWith("✓")), no = lines.filter((l) => l.startsWith("✗"));
  need(ok.length === 1 && no.length >= 2, "needs one ✓ line and at least two ✗ lines");
  need(ok[0].toLowerCase().includes(`"${d.ok.toLowerCase()}"`), "the ✓ line must name the correct word in quotes");
  for (const l of no) {
    const w = (l.match(/^✗ "([^"]+)"/) ?? [])[1];
    need(w && words.includes(w.toLowerCase()), `✗ line names "${w}", which is not in this exercise's word list`);
    need(w.toLowerCase() !== d.ok.toLowerCase(), "a ✗ line names the correct word");
  }
  need(!/يستدعي|يستلزم|يستوجب|يحدد/.test(d.text), "recycled formula verb");
  const old = aids.items[String(g.n)];
  aids.items[String(g.n)] = { ...old, item_type: d.type, keyword: d.keyword, answer_translation: d.bed, explanation_correct: d.text, explanation_wrong: d.text, grammar_structure: d.rule, grammar_example: d.ex, grammar_translation: d.exTr };
}
aids.restyle_v2 = true;
writeFileSync("scripts/learning-aids/sb_t2_pilot_restyled.json", JSON.stringify({ [ID]: aids }));
console.log("built pilot for", ID);
