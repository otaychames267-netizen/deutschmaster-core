// Shared Teil 3 group-level content: STRUKTUR (universal 6-step discussion frame,
// lightly group-flavored) + REDEMITTEL (a strong topic-agnostic B2 base set, since
// TELC Teil 3 discourse connectors like "Ich schlage vor..." genuinely work across
// any planning topic — PLUS group-specific additions so no two groups are literally
// identical) + TIPPS (mostly universal exam tactics, with 1-2 group-flavored ones).
//
// Mirrored (duplicated, kept in sync via this same comment convention as Teil2's
// GROUP_ORDER) into MuendlichTeil3Themen.tsx for the student-facing UI.

export const GROUP_ORDER = [
  "Freizeit", "Bildung", "Gesellschaft", "Reisen", "Familie",
  "Beruf", "Gesundheit", "Technologie", "Soziales Engagement", "Medien",
];

// Topic-agnostic B2 base Redemittel — the backbone every Teil-3 dialogue draws on.
const BASE_REDEMITTEL = {
  einstieg: [
    "Also, wir sollen ja gemeinsam … planen. Wo fangen wir an?",
    "Schön, dass wir das zusammen besprechen können. Hast du schon eine erste Idee?",
    "Fangen wir doch damit an, dass wir überlegen, was uns wichtig ist.",
  ],
  idee_einbringen: [
    "Ich hätte da eine Idee: Wir könnten …",
    "Mir würde spontan einfallen, dass wir …",
    "Was hältst du davon, wenn wir …",
  ],
  vorschlag_machen: [
    "Ich schlage vor, dass wir …",
    "Wie wäre es, wenn wir …",
    "Ich würde vorschlagen, zuerst … zu klären.",
  ],
  meinung_erfragen: [
    "Was denkst du darüber?",
    "Wie siehst du das?",
    "Bist du damit einverstanden, oder hättest du einen anderen Vorschlag?",
  ],
  zustimmen: [
    "Da stimme ich dir voll und ganz zu.",
    "Das ist ein guter Punkt, das sehe ich genauso.",
    "Einverstanden, das klingt vernünftig.",
  ],
  hoeflich_widersprechen: [
    "Das verstehe ich, aber ich sehe das etwas anders.",
    "Da bin ich mir nicht so sicher, denn …",
    "Ich hätte da Bedenken, weil …",
  ],
  begruenden: [
    "Das schlage ich vor, weil …",
    "Der Grund dafür ist, dass …",
    "Das wäre sinnvoll, denn …",
  ],
  vergleichen: [
    "Im Vergleich zu … finde ich … besser, weil …",
    "Auf der einen Seite …, auf der anderen Seite …",
    "Beide Möglichkeiten haben Vor- und Nachteile, aber …",
  ],
  vor_nachteile: [
    "Ein Vorteil davon wäre, dass …",
    "Ein Nachteil könnte allerdings sein, dass …",
    "Man muss auch bedenken, dass …",
  ],
  reagieren: [
    "Das ist ein interessanter Punkt, daran habe ich noch gar nicht gedacht.",
    "Gute Idee, das könnten wir wirklich so machen.",
    "Hm, verstehe, aber wie stellst du dir das genau vor?",
  ],
  themenwechsel: [
    "Gut, dann wären wir uns da einig. Kommen wir zum nächsten Punkt.",
    "Lass uns jetzt noch über … sprechen.",
    "Ein weiterer wichtiger Punkt wäre …",
  ],
  entscheidung: [
    "Dann einigen wir uns also darauf, dass …",
    "Ich denke, wir sind uns einig: Wir machen es so, dass …",
    "Fassen wir zusammen: Wir entscheiden uns für …",
  ],
  abschluss: [
    "Ich finde, wir haben einen guten Plan zusammengestellt.",
    "Dann halten wir das so fest. Vielen Dank für die gute Zusammenarbeit.",
    "Ich denke, damit haben wir alles Wichtige besprochen.",
  ],
};

// Group-specific ADDITIONAL Redemittel (appended to the base set per category,
// so every group's final list is genuinely distinct, not a pure copy).
const GROUP_EXTRA_REDEMITTEL = {
  Freizeit: {
    idee_einbringen: ["Wir könnten das Ganze auch mit einem kleinen Rahmenprogramm verbinden."],
    vor_nachteile: ["Bei so einer Veranstaltung müssen wir auch ans Wetter bzw. eine Alternative drinnen denken."],
  },
  Bildung: {
    idee_einbringen: ["Wir sollten die Lehrkraft bzw. die Schule frühzeitig mit einbeziehen."],
    vor_nachteile: ["Wir müssen bedenken, dass nicht alle Teilnehmer den gleichen Lernstand haben."],
  },
  Gesellschaft: {
    idee_einbringen: ["Wir könnten lokale Vereine oder Organisationen als Partner gewinnen."],
    vor_nachteile: ["Bei einer öffentlichen Aktion müssen wir auch an Genehmigungen denken."],
  },
  Reisen: {
    idee_einbringen: ["Wir sollten zuerst klären, wie wir anreisen und wo wir übernachten."],
    vor_nachteile: ["Wir müssen das Budget im Blick behalten, besonders bei Anreise und Unterkunft."],
  },
  Familie: {
    idee_einbringen: ["Wir sollten auch an die persönliche Situation der betroffenen Person denken."],
    vor_nachteile: ["Wichtig ist, dass wir niemanden überfordern, weder zeitlich noch finanziell."],
  },
  Beruf: {
    idee_einbringen: ["Wir sollten das Ganze mit den Kolleginnen und Kollegen bzw. dem Chef abstimmen."],
    vor_nachteile: ["Wir dürfen den normalen Arbeitsablauf dabei nicht zu sehr stören."],
  },
  Gesundheit: {
    idee_einbringen: ["Wir könnten eine Fachperson oder Institution mit ins Boot holen."],
    vor_nachteile: ["Bei Gesundheitsthemen müssen wir besonders sensibel und seriös vorgehen."],
  },
  Technologie: {
    idee_einbringen: ["Wir sollten überlegen, welche technische Ausstattung wir tatsächlich brauchen."],
    vor_nachteile: ["Nicht alle Teilnehmer sind technisch gleich versiert, das müssen wir einplanen."],
  },
  "Soziales Engagement": {
    idee_einbringen: ["Wir könnten Spenden sammeln oder eine kleine Aktion vor Ort organisieren."],
    vor_nachteile: ["Wir sollten realistisch bleiben, was wir mit unseren Mitteln erreichen können."],
  },
  Medien: {
    idee_einbringen: ["Wir sollten uns vorher gut informieren, damit unsere Fragen wirklich interessant sind."],
    vor_nachteile: ["Wir müssen den zeitlichen Rahmen im Blick behalten, den wir zur Verfügung haben."],
  },
};

export function buildRedemittelForGroup(group) {
  const extra = GROUP_EXTRA_REDEMITTEL[group] ?? {};
  const out = {};
  for (const [cat, phrases] of Object.entries(BASE_REDEMITTEL)) {
    out[cat] = [...phrases, ...(extra[cat] ?? [])];
  }
  return out;
}

// Universal 6-step STRUKTUR, with a group-flavored example note per step.
const STRUKTUR_STEPS = [
  { schritt: "1. Begrüßung & Einstieg", beschreibung: "Kurz das Thema benennen und den Gesprächspartner miteinbeziehen." },
  { schritt: "2. Ideen sammeln", beschreibung: "Beide Seiten bringen erste Vorschläge und Ideen ein, ohne sie sofort zu bewerten." },
  { schritt: "3. Vor- und Nachteile abwägen", beschreibung: "Die gesammelten Ideen gemeinsam durchsprechen: Was spricht dafür, was dagegen?" },
  { schritt: "4. Auf Details einigen", beschreibung: "Konkrete Punkte klären (Zeit, Ort, Kosten, Organisation, Aufgabenverteilung)." },
  { schritt: "5. Gemeinsame Entscheidung treffen", beschreibung: "Sich auf eine gemeinsame Lösung einigen, auch bei unterschiedlichen Meinungen." },
  { schritt: "6. Zusammenfassung & Abschluss", beschreibung: "Das Ergebnis kurz zusammenfassen und das Gespräch höflich beenden." },
];

export function buildStrukturForGroup() {
  // Universal by design — TELC Teil 3 always follows this planning-dialogue shape;
  // the group-specific flavor lives in Redemittel/Tipps/Erklärung instead, so the
  // STRUKTUR itself stays instantly recognizable and reusable across every topic.
  return STRUKTUR_STEPS;
}

const BASE_TIPPS = [
  "Beginnen Sie aktiv mit einem eigenen Vorschlag — warten Sie nicht nur ab.",
  "Stellen Sie Ihrem Partner / Ihrer Partnerin echte Fragen und hören Sie aktiv zu.",
  "Wenn Sie unsicher sind, sagen Sie das offen: „Ich bin mir nicht sicher, aber vielleicht …“",
  "Widersprechen Sie höflich, nicht abweisend — bestätigen Sie erst, was gut ist, bevor Sie Einwände nennen.",
  "Nutzen Sie Themenwechsel-Redemittel, um strukturiert von einem Punkt zum nächsten zu kommen.",
  "Achten Sie darauf, wirklich zu einer gemeinsamen Entscheidung zu kommen — das wird explizit bewertet.",
  "Vermeiden Sie lange Monologe; ein Gespräch lebt vom Hin und Her.",
];

const GROUP_EXTRA_TIPPS = {
  Freizeit: "Denken Sie an praktische Details wie Wetter, Ort und Alternativprogramm.",
  Bildung: "Beziehen Sie die Rolle der Lehrkraft bzw. Institution mit ein, wenn relevant.",
  Gesellschaft: "Denken Sie an mögliche Partner (Vereine, Nachbarn, Institutionen).",
  Reisen: "Sprechen Sie konkret über Anreise, Unterkunft und Budget.",
  Familie: "Bleiben Sie einfühlsam — es geht oft um persönliche, emotionale Situationen.",
  Beruf: "Denken Sie an die Abstimmung mit Kolleg:innen oder Vorgesetzten.",
  Gesundheit: "Bleiben Sie sachlich und seriös, auch bei sensiblen Gesundheitsthemen.",
  Technologie: "Berücksichtigen Sie unterschiedliche technische Kenntnisse der Beteiligten.",
  "Soziales Engagement": "Bleiben Sie realistisch bei dem, was mit begrenzten Mitteln machbar ist.",
  Medien: "Bereiten Sie konkrete, interessante Fragen statt allgemeiner Floskeln vor.",
};

export function buildTippsForGroup(group) {
  const extra = GROUP_EXTRA_TIPPS[group];
  return extra ? [...BASE_TIPPS, extra] : BASE_TIPPS;
}
