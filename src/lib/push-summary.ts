/**
 * The text of a push notification. The in-app card shows the whole message; a push is read in one glance on a lock
 * screen, so it carries only the essence:
 *   - theme messages  -> "🎧 Hören Teil 2 — Matthias"   (module/Teil + theme names, no greeting / notes / wishes)
 *   - urgent notices  -> the warning paragraph itself    (without its heading line)
 *   - anything else   -> the first paragraph after the greeting
 * Pure and dependency-free: used by /api/push-dispatch, safe to import anywhere.
 */
const THEME_START = /^(🎧|📖|📝|🗣️)/u;
const NUMBERING = /^(?:\d️?⃣|🔟|\d+\.)\s*/u;
const NOTE_LINE = /^\s*↳/u;
const THEME_PREFIX = /تزادو? (?:موضوع|مواضيع) جدي[دة]|تزادو? (?:موضوع|مواضيع) جداد/u;
const MAX = 200;

function clip(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= MAX ? t : t.slice(0, MAX - 1).trimEnd() + "…";
}

export function pushSummary(body: string, alert: boolean): string {
  const paras = body.split(/\n{2,}/).map((p) => p.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== "")).filter((l) => l.length > 0);

  if (alert) {
    const warn = paras.find((p) => p[0].trim().startsWith("⚠️"));
    if (warn) {
      const rest = warn.slice(1);
      if (rest.length > 0) return clip(rest.join(" "));
      return clip(warn[0].replace(/⚠️/gu, ""));
    }
  }

  const themes = paras.filter((p) => THEME_START.test(p[0].trim()));
  if (themes.length > 0) {
    const parts = themes.map((p) => {
      const label = p[0].replace(THEME_PREFIX, "").replace(/\s+/g, " ").replace(/[:：]\s*$/u, "").replace(/ في /u, " ").trim();
      const names = p.slice(1).filter((l) => !NOTE_LINE.test(l)).map((l) => l.replace(NUMBERING, "").trim()).filter(Boolean);
      return names.length > 0 ? `${label} — ${names.join(", ")}` : label;
    });
    return clip(parts.join(" · "));
  }

  const plain = paras.find((p, i) => !(i === 0 && /السلام/u.test(p[0])));
  return clip((plain ?? paras[0] ?? [body]).slice(0, 2).join(" "));
}
