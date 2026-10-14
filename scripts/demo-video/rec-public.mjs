// Segment 1: the PUBLIC website (live domain). No account is created and nothing is submitted.
import fs from "node:fs";
import { newRecorder, caption, clickEl, slowScroll, titleCard, sleep, SP } from "./lib.mjs";
const BASE = process.env.PUBLIC_BASE ?? "https://www.auralingoviatestdeutsch.academy";
const dir = SP + "vid-public"; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const { browser, ctx, page } = await newRecorder({ dir });
const step = async (name, fn) => { try { await fn(); } catch (e) { console.log("step failed:", name, String(e).slice(0, 120)); } };

await titleCard(page, { title: "Online preparation for the TELC B1 / B2 German exam", sub: "Product demo — website, core features and user flow", foot: "www.auralingoviatestdeutsch.academy" }, 3800);
await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 60000 }); await sleep(2500);
await caption(page, "Public website — an independent online preparation platform for the TELC B1/B2 German exam");
await sleep(3500);
await step("scroll features", async () => { await slowScroll(page, 1500, 375, 1000); await caption(page, "Practice material for every written part: Lesen, Hören, Sprachbausteine and Schreiben — plus Mündlich preparation"); await slowScroll(page, 1500, 375, 1000); });
await step("pricing", async () => {
  const h = page.getByText(/Simple, transparent pricing/i).first(); await h.scrollIntoViewIfNeeded(); await sleep(600); await slowScroll(page, 330, 330, 700);
  await caption(page, "Simple pricing — one-month, two-month or three-month access. No automatic renewal.", "top");
  await sleep(2800);
  for (const re of [/2 months/i, /3 months/i, /1 month/i]) { await clickEl(page, page.getByRole("radio", { name: re }).first(), { after: 2200 }); }
  await slowScroll(page, 700, 350, 1100);
});
await step("faq+footer", async () => { await caption(page, "FAQ, contact details and legal pages are linked in the footer"); await slowScroll(page, 3000, 500, 800); });
await caption(page, "");
await step("register", async () => { await page.goto(BASE + "/register", { waitUntil: "networkidle" }); await sleep(1200); await caption(page, "Students create an account with email or Google"); await sleep(4500); });
await step("login", async () => { await page.goto(BASE + "/login", { waitUntil: "networkidle" }); await sleep(1200); await caption(page, "…and sign in to their personal study area"); await sleep(4000); });
for (const [p, label] of [["/terms", "Terms of Service"], ["/privacy", "Privacy Policy"], ["/refund", "Refund Policy"]]) {
  await step(p, async () => { await page.goto(BASE + p, { waitUntil: "networkidle" }); await sleep(1200); await caption(page, label); await sleep(2500); await slowScroll(page, 900, 300, 900); await sleep(900); });
}
const v = page.video(); await ctx.close(); const out = await v.path(); await browser.close();
fs.copyFileSync(out, SP + "public.webm"); console.log("saved", SP + "public.webm");
