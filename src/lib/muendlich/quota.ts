/**
 * Friendly text for the AI-Mündlich usage limits enforced in the database
 * (migration 20261008100000_muendlich_ai_quota.sql): per calendar month, per day,
 * and a monthly spend budget. The DB raises these as exception messages; this maps
 * them for both the 1:1 tutor and the 2:1 exam room. Returns null for any other error.
 */
export function muendlichQuotaMessage(message: string | null | undefined): string | null {
  if (!message) return null;
  if (message.includes("MUENDLICH_AI_QUOTA_DAY")) {
    return "Du hast heute schon deine KI-Sitzungen in diesem Modus geübt — pro Tag sind zwei möglich. Morgen geht es weiter. · استعملت حصّتك اليوم في هذا الوضع (جلستين في النهار). ترجع غدوة.";
  }
  if (message.includes("MUENDLICH_AI_QUOTA_MONTH")) {
    return "Du hast die Monatsgrenze deiner KI-Sitzungen erreicht. Sie startet zu Beginn des nächsten Monats neu. · وصلت للحدّ الشهري متاع حصص الذكاء الاصطناعي. يتجدّد مع بداية الشهر الجاي.";
  }
  if (message.includes("NO_AI_ACCESS")) {
    return "Der KI-Sprachtrainer ist Teil des Plans „Komplett“. · المدرّب الصوتي بالذكاء الاصطناعي موجود في باقة «Komplett».";
  }
  if (message.includes("MUENDLICH_AI_QUOTA_BUDGET")) {
    return "Dein monatliches KI-Kontingent ist aufgebraucht. Es wird zu Beginn des nächsten Monats erneuert. · خلصت حصّتك الشهرية من الذكاء الاصطناعي. تتجدّد مع بداية الشهر الجاي.";
  }
  return null;
}
