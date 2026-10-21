// node scripts/push/render-push-assets.mjs
// Renders the images the Web Push notifications use (needs network once for the Cairo / Manrope web fonts):
//   public/push-icon.png         192x192  the current logo badge (the old pwa-icon-192 is an earlier logo)
//   public/push-badge.png         96x96   monochrome white silhouette on transparent — what Android shows in the status bar
//   public/push-alert.jpg       1200x600  ruby/amber banner for urgent notices ("تنبيه مهم"); normal pushes reuse og-card.jpg
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const pub = (f) => path.resolve("public", f);
const browser = await chromium.launch();

// 1. icon: the favicon SVG, transparent corners
{
  const page = await browser.newPage({ viewport: { width: 192, height: 192 }, deviceScaleFactor: 1 });
  // inline the SVG: an about:blank page may not load file:// images
  const logo = fs.readFileSync(pub("favicon.svg"), "utf8").replace("<svg ", '<svg width="192" height="192" ');
  await page.setContent(`<html><body style="margin:0;background:transparent">${logo}</body></html>`);
  await page.screenshot({ path: pub("push-icon.png"), omitBackground: true, type: "png" });
  await page.close();
}

// 2. badge: white A + graduation cap from the logo's own paths (Android uses only the alpha channel)
{
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="30 20 340 360" width="96" height="96">
    <g transform="translate(0,14)" fill="#fff">
      <path fill-rule="evenodd" d="M 176 70 L 224 70 L 336 348 Q 342 364 326 364 L 280 364 Q 268 364 264 352 L 246 302 L 154 302 L 136 352 Q 132 364 120 364 L 74 364 Q 58 364 64 348 Z M 200 138 L 164 270 L 236 270 Z"/>
      <path d="M 176 70 L 224 70 L 219 50 L 181 50 Z"/>
      <g transform="translate(200,42) rotate(-3)"><path d="M0,-15 L84,-1 L0,13 L-84,-1 Z"/></g>
    </g></svg>`;
  const page = await browser.newPage({ viewport: { width: 96, height: 96 }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: pub("push-badge.png"), omitBackground: true, type: "png" });
  await page.close();
}

// 3. urgent banner
{
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(path.resolve("scripts/push/push-alert.html")).href, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: pub("push-alert.jpg"), type: "jpeg", quality: 90 });
  await page.close();
}
await browser.close();
console.log("wrote push-icon.png, push-badge.png, push-alert.jpg");
