/**
 * Writes cards-{light,dark}.html: the branded notification card (src/components/NotificationBody.tsx) with sample messages,
 * bell and page size, using the CSS of the last `npm run build`. Screenshot them with scripts/notifications/shoot.mjs
 * (Playwright hangs under bun, so the two steps are separate).
 *   bun scripts/notifications/render-card-preview.tsx <out-dir> && node scripts/notifications/shoot.mjs <out-dir>
 * Why not the dev server: the cards live behind login, and this shows exactly the compiled CSS students get.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandedNotification } from "../../src/components/NotificationBody";
import type { AppNotification } from "../../src/lib/notification-format";

const out = process.argv[2] ?? ".";
const assets = path.resolve(".output/public/assets");
const cssFile = fs.readdirSync(assets).find((f) => f.startsWith("styles-") && f.endsWith(".css"));
if (!cssFile) throw new Error("run `npm run build` first");
const css = fs.readFileSync(path.join(assets, cssFile), "utf8");

const theme = `السلام عليكم ورحمة الله وبركاته 🌹

🎧 تزاد موضوع جديد في Hören Teil 2:
1️⃣ Matthias
   ↳ مقابلة إذاعية مع معلّم يخدم زادة في العناية بالأشجار (Baumpfleger): 10 جمل Richtig/Falsch. تلقاه بعلامة Neu، وفيه زر الترجمة بالعربي لكل جملة.

🌐 الموضوع موجود توّا في الموقع، ادخلو شوفوه وخدمو عليه مزيان. 💪🔥

⚠️ تنبيه: ما تحفظوش الـ Codes ⚠️
🤲 توكلوا على الله دائماً.
🧠 افهموا ولا تحفظوا: الفهم هو اللي ينجّحكم.

نتمنى النجاح والتوفيق للجميع 🍀🇩🇪`;

const digest = `السلام الخوت، 👋✨
تزادو مواضيع جداد في الموقع 🚀

🎧 Hören Teil 3:
1️⃣ In Raum C23 (المعدل)

📖 Lesen Teil 3:
1️⃣ Ausflug (معدل)
2️⃣ Berlin (معدل)

🌐 كل شي موجود توّا في الموقع، ادخلو شوفوهم وخدمو عليهم مزيان. 💪🔥
بالتوفيق للجميع! 🍀🇩🇪`;

const mk = (id: string, title: string, body: string, read: boolean, mins: number): AppNotification => ({
  id, type: "content", title, body, read, action_url: "/b2/schriftlich/vorbereitung/hoeren/teil-2",
  created_at: new Date(Date.now() - mins * 60_000).toISOString(),
});
const items = [
  mk("1", "إضافة موضوع جديد", theme, false, 12),
  mk("2", "إضافة مواضيع جديدة", digest, false, 95),
  mk("3", "إضافة موضوع جديد", theme, true, 60 * 30),
];
// optional 3rd argument: a text file with a message body -> renders just that one message (title from argv[4])
if (process.argv[3]) {
  items.splice(0, items.length, {
    ...mk("x", process.argv[4] ?? "تنبيه مهم", fs.readFileSync(process.argv[3], "utf8").trim(), false, 1),
    type: process.argv[5] ?? "announcement", // e.g. "alert" for the urgent-notice style
  });
}
const card = (n: AppNotification, v: "bell" | "page") =>
  renderToStaticMarkup(createElement(BrandedNotification, { n, variant: v, onOpen: () => {} }));

for (const mode of ["light", "dark"] as const) {
  const dark = mode === "dark";
  const html = `<!doctype html><html class="${dark ? "dark" : ""}"><head><meta charset="utf-8"><base href="${pathToFileURL(path.resolve("public") + path.sep).href}"><style>${css}</style>
<style>
  body { margin: 0; padding: 24px; background: ${dark ? "#0b0b0e" : "#f6f6f8"}; font-family: Inter, system-ui, sans-serif; color: ${dark ? "#f4f1e8" : "#1b1b22"}; }
  .col { display: flex; gap: 24px; align-items: flex-start; }
  .page { width: 560px; display: flex; flex-direction: column; gap: 12px; }
  .bell { width: 320px; border: 1px solid rgba(128,128,128,.3); border-radius: 12px; background: ${dark ? "#14141a" : "#fff"}; }
</style></head><body>
<div class="col">
  <div class="page">${items.map((n) => card(n, "page")).join("")}</div>
  <div class="bell">${items.map((n) => `<div style="padding:8px">${card(n, "bell")}</div>`).join("")}</div>
</div></body></html>`;
  const base = pathToFileURL(path.resolve("public") + path.sep).href;
  fs.writeFileSync(path.join(out, `cards-${mode}.html`), html.replaceAll('src="/favicon.svg"', `src="${base}favicon.svg"`));
}
console.log("done");
