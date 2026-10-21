// node scripts/notifications/shoot.mjs <dir>  — screenshots every *.html in <dir> to a 2x PNG next to it.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const dir = path.resolve(process.argv[2] ?? ".");
const browser = await chromium.launch();
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
  const page = await browser.newPage({ viewport: { width: 980, height: 1100 }, deviceScaleFactor: 2 });
  await page.goto(pathToFileURL(path.join(dir, f)).href, { waitUntil: "load" });
  await page.screenshot({ path: path.join(dir, f.replace(/\.html$/, ".png")), fullPage: true });
  await page.close();
  console.log("wrote", f.replace(/\.html$/, ".png"));
}
await browser.close();
