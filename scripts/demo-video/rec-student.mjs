// Segment 2: the signed-in student area, recorded on a local build of the same code with a disposable demo account (session injected, nothing typed).
import fs from "node:fs";
import { newRecorder, caption, clickEl, slowScroll, titleCard, sleep, SP } from "./lib.mjs";
const BASE = "http://localhost:3998";
const session = fs.readFileSync(SP + "session.json", "utf8").trim();
const dir = SP + "vid-student"; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
const { browser, ctx, page } = await newRecorder({ dir, session });
const step = async (name, fn) => { try { await fn(); } catch (e) { console.log("step failed:", name, String(e).slice(0, 140)); } };
const go = async (path, wait = 4200) => { await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {}); await sleep(wait); };

await titleCard(page, { title: "Inside the student area", sub: "A subscribed student's view — demo account", foot: "Lesen · Hören · Sprachbausteine · Schreiben · Mündlich · Exam simulations" }, 50);
await (async () => { const warm = await ctx.newPage(); await warm.goto(BASE + "/b2/dashboard", { waitUntil: "networkidle", timeout: 60000 }).catch(() => {}); await sleep(3500); await warm.close(); })();
await sleep(1200);

await step("dashboard", async () => { await go("/b2/dashboard", 3500); await caption(page, "Student dashboard — plan status, progress and exam countdown"); await sleep(3200); await slowScroll(page, 700, 350, 1200); await sleep(1000); });
await step("schriftlich", async () => { await go("/b2/schriftlich/vorbereitung", 3300); await caption(page, "Written exam preparation — Lesen, Hören, Sprachbausteine and Schreiben"); await sleep(3000); await slowScroll(page, 360, 360, 1100); await sleep(700); });

await step("lesen", async () => {
  await go("/b2/schriftlich/vorbereitung/lesen/teil-1", 3200); await caption(page, "Lesen — reading exercises with instant feedback (Teil 1: match headlines to texts)"); await sleep(2800);
  await clickEl(page, page.getByText("Limonade").first(), { after: 3500 });
  await caption(page, "Choose the matching headline for each text");
  await clickEl(page, page.getByRole("button", { name: /Schlagzeile wählen/ }).first(), { after: 1200 });
  await clickEl(page, page.getByRole("option").nth(0), { after: 1200 });
  await slowScroll(page, 560, 280, 800);
  await clickEl(page, page.getByRole("button", { name: /Schlagzeile wählen/ }).first(), { after: 1200 });
  await clickEl(page, page.getByRole("option").nth(2), { after: 1200 });
  await slowScroll(page, 900, 300, 700);
  const check = page.getByRole("button", { name: /^Auswertung$/ }).first();
  if (await check.count()) { await clickEl(page, check, { after: 2200 }); await caption(page, "Instant evaluation of the answers, with the correct solution"); await sleep(2800); }
});

await step("hoeren", async () => {
  await go("/b2/schriftlich/vorbereitung/hoeren/teil-2", 4000); await caption(page, "Hören — listen to the recording, then mark each statement Richtig or Falsch"); await sleep(2800);
  await clickEl(page, page.getByRole("button", { name: /Abspielen/ }).first(), { after: 3500 });
  const ok = page.getByRole("radio", { name: "Richtig", exact: true }); const bad = page.getByRole("radio", { name: "Falsch", exact: true });
  await clickEl(page, ok.nth(0), { after: 800 }); await clickEl(page, bad.nth(1), { after: 800 }); await clickEl(page, ok.nth(2), { after: 800 });
  await slowScroll(page, 600, 300, 700);
  await clickEl(page, page.getByRole("button", { name: /Lösung anzeigen/ }).first(), { after: 2200 });
  await caption(page, "The solution is revealed with the correct answers — each statement can be translated"); await sleep(2800); await slowScroll(page, 360, 360, 900);
});

await step("sprachbausteine", async () => {
  await go("/b2/schriftlich/vorbereitung/sprachbausteine/teil-1", 3200); await caption(page, "Sprachbausteine — grammar and vocabulary gap texts"); await sleep(2200);
  await clickEl(page, page.getByText("Liebe Agnieszka").first(), { after: 3500 });
  await caption(page, "Click a gap and choose the correct word");
  await clickEl(page, page.getByRole("button", { name: /^21/ }).first(), { after: 1400 });
  await clickEl(page, page.getByRole("option").nth(0), { after: 1200 });
  await clickEl(page, page.getByRole("button", { name: /^22/ }).first(), { after: 1400 });
  await clickEl(page, page.getByRole("option").nth(1), { after: 1400 });
  await sleep(900);
});

await step("schreiben", async () => {
  await go("/b2/schriftlich/vorbereitung/schreiben/beschwerde", 3300); await caption(page, "Schreiben — guided writing tasks (formal complaint letters, requests, informal letters)"); await sleep(3300);
  await slowScroll(page, 360, 360, 1000); await sleep(700);
});

await step("simulation", async () => { await go("/b2/schriftlich/pruefung", 3300); await caption(page, "Full timed exam simulations under exam conditions"); await sleep(4200); });

await step("muendlich", async () => {
  await go("/b2/muendlich/vorbereitung/teil-1", 3300); await caption(page, "Mündlich — preparation cards for the oral exam parts"); await sleep(3300);
  await slowScroll(page, 360, 360, 1000); await sleep(700);
});

await step("billing", async () => {
  await go("/billing", 4500); await caption(page, "Billing — active plan, available plans and payment methods"); await sleep(3200);
  await slowScroll(page, 360, 360, 900);
  for (const re of [/2 months/i, /3 months/i, /1 month/i]) { await clickEl(page, page.getByRole("radio", { name: re }).first(), { after: 1500 }); }
  await slowScroll(page, 900, 300, 900); await sleep(1000);
});

await step("help", async () => { await go("/help", 3300); await caption(page, "Help Center — answers about plans, payments and exam content"); await sleep(3500); });

await titleCard(page, { title: "Thank you", sub: "Live website: www.auralingoviatestdeutsch.academy<br/>Support: Support@auralingoviatestdeutsch.academy", foot: "Terms · Privacy Policy · Refund Policy are linked in the footer of every page" }, 5000);
const v = page.video(); await ctx.close(); const out = await v.path(); await browser.close();
fs.copyFileSync(out, SP + "student.webm"); console.log("saved student.webm");
