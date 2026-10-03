/**
 * Operational alerting via Telegram's Bot API (plain REST, no SDK). Same
 * build-ahead pattern as email.server.ts: no-ops and logs when
 * TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID are unset. Returns whether the push
 * actually succeeded so callers (src/lib/d17/alerting.server.ts) can record
 * an honest telegram_sent flag on their own audit row — this module has no
 * DB dependency itself, keeping it reusable outside the D17 alert context.
 */
export async function notifyTelegram(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.log(`[telegram] (TELEGRAM_BOT_TOKEN/CHAT_ID not set, not sent): ${message}`);
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[telegram] send failed (${res.status}): ${errText.slice(0, 500)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] send threw:", err);
    return false;
  }
}
