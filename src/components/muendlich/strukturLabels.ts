/**
 * Emoji + label per Teil 3 Struktur section key — purely cosmetic labeling
 * for the topic-specific demo Q&A shown on each card (see
 * MuendlichDualDisplay's TopicTextCard). Keys must stay in sync with
 * scripts/teil3-redemittel-library.mjs, the source of truth for the
 * section keys actually used in authored `struktur` arrays.
 */
export const STRUKTUR_LABELS: Record<string, string> = {
  start: "🟢 Start",
  ziel: "🎯 Ziel / Zweck",
  zeit: "⏰ Zeitpunkt",
  ort: "📍 Ort",
  verkehrsmittel: "🚌 Verkehrsmittel",
  unterkunft: "🏨 Unterkunft",
  anlass: "🎉 Anlass",
  gaeste: "🙋 Gäste",
  essen: "🍽️ Essen & Getränke",
  programm: "🎶 Programm / Musik",
  inhalte: "📚 Inhalte",
  aktivitaeten: "🏞️ Aktivitäten",
  vorschlaege: "💡 Vorschläge",
  material: "🛠️ Material",
  werbung: "📢 Werbung",
  teilnehmer: "🙋 Teilnehmer",
  aufgabenverteilung: "👥 Aufgabenverteilung",
  kosten: "💰 Kosten",
  ablauf: "🔄 Ablauf / Durchführung",
  abschluss: "✅ Abschluss",
};
