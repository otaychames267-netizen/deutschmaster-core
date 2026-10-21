// node scripts/og/render-og-card.mjs [out.jpg|out.png]  — renders scripts/og/og-card.html to the 1200x630 link-preview card
// (Telegram / WhatsApp / social). Needs network once for the Manrope web font. Default output: public/og-card.jpg (JPEG q90, ~130 KB: WhatsApp skips previews whose image is too heavy)
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const out = path.resolve(process.argv[2] ?? "public/og-card.jpg");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.resolve("scripts/og/og-card.html")).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const jpg = /\.jpe?g$/i.test(out);
await page.screenshot(jpg ? { path: out, type: "jpeg", quality: 90 } : { path: out, type: "png" });
await browser.close();
console.log("wrote", out);
