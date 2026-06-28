/**
 * Proof-of-method: group 30 extracted WITHOUT any external API — article + questions
 * via Claude vision (Read on upscaled page crops), checkbox answer key read directly.
 * Written into the extraction cache, then validated by the standard pipeline.
 */
import { readFileSync, writeFileSync } from "fs";
const f = "scripts/.extract-cache/t2_pdf1.exercises.json";
const c = JSON.parse(readFileSync(f, "utf8"));

c["30"] = {
  title: "Geschichte des Hauspersonals",
  article: `Dienstmädchen war um 1900 der am weitesten verbreitete Beruf für Frauen. Aus heutiger Perspektive ist das verwunderlich, denn der Alltag eines Dienstmädchens war hart. Was trieb also Frauen in diesen Beruf?
Es waren vor allem Mädchen vom Land, die von ihren Eltern in die Stadt geschickt wurden, um dort zu arbeiten. Auf dem Land gab es kaum Stellen für Mädchen. Als Dienstmädchen, so dachten die Eltern, würden ihre Töchter wenigstens das Hauswirtschaften lernen – eine wichtige Fertigkeit als spätere Haus- und Ehefrau. Dabei war das enge Leben eines Dienstmädchens ohne viel Zeit genau das, was Eltern als Vorbild sahen. Mädchen waren oft erst 14 oder 15 Jahre alt, wenn sie in einem Stellungsdienst vermittelt wurden.
Allerdings kam es nicht selten vor, dass die Hoffnung auf eine Ausbildung enttäuscht wurde. Viele Mädchen wurden nicht eingelernt, sondern mussten selber zusehen, wie sie das Arbeitsleben bewältigen. Die Eltern verfügten meist nicht über Kontakte in der Stadt. So machten sich auch dubiose Stellenvermittler an den Bahnhöfen zu Nutze und verschafften den Mädchen Stellen als Kellnerinnen – damals eine Arbeit mit sehr schlechtem Ruf. Um diesen Missstand zu beenden, gründeten sich übrigens die Bahnhofsmissionen.
Etwas später hielt die Hausarbeit auch in großbürgerliche und kleinbürgerliche Haushalte Einzug. Die unteren Schichten, also Handwerkerfamilien, leisteten den gehobeneren nach. Nach außen hatte ein solch schmerzte: bei der Unterbringung und Ernährung der Dienstmädchen. In gehobenen Schichten gab es gerne auch mehr Personal – ein Vorteil und Nachteil zugleich. Einerseits hatte das Dienstmädchen so mehr Gesellschaft und war weniger isoliert, andererseits gab es auch eine Dienstboten-Hierarchie und das Dienstmädchen war das unterste Glied. Anders als Fabrikarbeiter hatten Dienstmädchen keine geregelten Arbeitszeiten. Sie mussten, wenn nötig, ihren Dienstherrn rund um die Uhr zur Verfügung stehen. Das Dienstmädchen stand als Erste auf und befeuerte den Ofen, machte das Wasser zum Waschen und für Frühstück warm, servierte die Mahlzeiten, räumte wieder ab, spülte und putzte. Das Einkaufen gehörte zu den beliebten Tätigkeiten, denn das erlaubte es dem Mädchen, einmal außer Haus unterwegs zu sein, andere Dienstmädchen zu treffen und sich auszutauschen. Fließendes Wasser gehörte um die Jahrhundertwende nicht zum Standard, so musste das Dienstmädchen auch Wasser schleppen. Erst wenn alle Arbeit erledigt war, konnte das Dienstmädchen schlafen gehen. Die vorherige freie Zeit am Abend reichte oft nur, um die eigene Kleidung auszubessern. Alle vierzehn Tage durften die Mädchen ihre zwei Stunden das Haus verlassen, das war der einzige Ausgang, den sie hatten. Der Lohn bestand im Wesentlichen aus Kost und Unterkunft. Etwas zurücklegen für später konnten kaum ein Mädchen. Auch die Unterbringung hielt zu wünschen übrig. Von Berliner Dienstmädchen weiß man, dass sie oft noch nicht einmal ein eigenes Kammer hatten, sondern auf so genannten Hängebetten schliefen, eine kleine Holzplattform bei wenigen Quadratmetern bei etwa 1,50 Meter. Wenig Schlaf, und dann auch noch schlechter Schlaf: Viele Mädchen waren die Strapazen trotz ihres jungen Alters anzusehen. Für die meisten war es nur eine Zwischenstation. Erst freuten sich viele auf das Ende der jungen Mädchen dieses Arbeitsverhältnis und stattdessen war die junge Frau selbst Hausfrau und Herrin eines eigenen Haushalts.`,
  questions: [
    { number: 6, text: "Die Eltern ließen ihre Töchter als Dienstmädchen arbeiten,", option_a: "damit sie die Jahre bis zur Arbeit in der Fabrik überbrücken konnten.", option_b: "damit sie lernen, einen Haushalt zu führen.", option_c: "damit sie besser beaufsichtigt werden als zu Hause." },
    { number: 7, text: "Die Stellen fanden die Mädchen zumeist", option_a: "durch Vermittler, die ins Dorf kamen.", option_b: "alleine.", option_c: "mit Hilfe ihrer Eltern." },
    { number: 8, text: "Dienstmädchen gab es", option_a: "bei den reicheren Leuten.", option_b: "auch bei den weniger reichen Leuten.", option_c: "in jedem Haus in der Stadt." },
    { number: 9, text: "Dienstmädchen", option_a: "mussten länger arbeiten als Fabrikarbeiter.", option_b: "konnten sich am Sonntag zwei Stunden mit anderen Dienstmädchen treffen.", option_c: "durften nicht alleine einkaufen gehen." },
    { number: 10, text: "Dienstmädchen bekamen", option_a: "kein Geld.", option_b: "ein eigenes Zimmer.", option_c: "Geld, um für später zu sparen." },
  ],
  answer_key: [ { number: 6, answer: "b" }, { number: 7, answer: "b" }, { number: 8, answer: "b" }, { number: 9, answer: "a" }, { number: 10, answer: "a" } ],
  _pages: [59, 60],
  _article_source: "claude-vision(read+crop)",
  notes: "extracted via Claude vision on upscaled crops; checkbox key read directly; OCR cross-check pending",
};
writeFileSync(f, JSON.stringify(c, null, 2));
console.log("wrote group 30 (Geschichte des Hauspersonals) via credential-free Claude-vision extraction");
