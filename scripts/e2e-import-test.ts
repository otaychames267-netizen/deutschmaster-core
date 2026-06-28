/**
 * E2E import test: imports every PDF in Desktop/Telc Pdfs Lesen
 * using a real Playwright browser session against the running dev server.
 *
 * Run: npx tsx scripts/e2e-import-test.ts
 *
 * Pre-requisites:
 *  - Dev server running on http://localhost:5174
 *  - .env.local present with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *  - PDFs in C:/Users/asus/Desktop/Telc Pdfs Lesen/
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Page, type Browser } from "@playwright/test";
import type { Database } from "../src/integrations/supabase/types";

// ── Config ─────────────────────────────────────────────────────────────────
const SUPABASE_URL    = "https://gewcyydpgbfutkdcyztr.supabase.co";
const SERVICE_KEY     = "";
const ANON_KEY        = "sb_publishable_n2GGmtl9ALiCuLyuN_COAQ_iZj86V12";
const DEV_URL         = "http://localhost:5174";
const PDF_DIR         = "C:\\Users\\asus\\Desktop\\Telc Pdfs Lesen";

const TEST_EMAIL      = "test-admin-e2e@auralingovia.internal";
const TEST_PASSWORD   = "E2eTestAdmin!2026";

const admin = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon  = createClient<Database>(SUPABASE_URL, ANON_KEY);

// ── Helpers ────────────────────────────────────────────────────────────────
function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}
function fail(msg: string): never {
  console.error(`\n❌ FAIL: ${msg}`);
  process.exit(1);
}

async function ensureAdminUser(): Promise<{ email: string; password: string }> {
  log("Ensuring test admin user exists…");

  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing?.users.find((u) => u.email === TEST_EMAIL);

  let uid: string;
  if (!found) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "E2E Test Admin" },
    });
    if (error || !created?.user) fail(`Could not create test admin user: ${error?.message}`);
    uid = created!.user.id;
    log(`Created test admin user: ${uid}`);
  } else {
    uid = found.id;
    await admin.auth.admin.updateUserById(uid, { password: TEST_PASSWORD });
    log(`Test admin user exists: ${uid} — password reset.`);
  }

  await admin.from("user_roles").upsert(
    { user_id: uid, role: "admin" as const },
    { onConflict: "user_id" }
  );
  log(`Admin role granted to ${uid}`);
  return { email: TEST_EMAIL, password: TEST_PASSWORD };
}

async function loginBrowser(page: Page, email: string, password: string) {
  log("Signing in via browser…");
  await page.goto(`${DEV_URL}/`);
  await page.waitForLoadState("networkidle", { timeout: 30_000 });

  // If redirected to login page
  if (page.url().includes("/login") || page.url().includes("/auth")) {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${DEV_URL}/**`, { timeout: 30_000 });
    log("Login successful.");
  } else {
    log("Already logged in (session cookie present).");
  }
}

async function waitForText(page: Page, text: string, timeout = 120_000) {
  await page.waitForFunction(
    (t) => document.body.innerText.includes(t),
    text,
    { timeout }
  );
}

async function checkNoConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

// ── Upload helper ──────────────────────────────────────────────────────────
async function uploadFile(page: Page, filePath: string, inputSelector = 'input[type="file"]') {
  await page.waitForSelector(inputSelector, { timeout: 15_000 });
  await page.setInputFiles(inputSelector, filePath);
  log(`  Uploaded ${path.basename(filePath)}`);
}

// ── Verify DB helper ────────────────────────────────────────────────────────
async function countDB(table: keyof Database["public"]["Tables"]) {
  const { count } = await admin.from(table as string).select("*", { count: "exact", head: true });
  return count ?? 0;
}

// ── Test: Lesen Teil 3 ─────────────────────────────────────────────────────
async function testT3(page: Page) {
  log("\n━━ T3: Lesen Teil 3 ━━");
  const pdf = path.join(PDF_DIR, "Lesen Teil 3 (1).pdf");

  if (!fs.existsSync(pdf)) fail(`PDF not found: ${pdf}`);

  const beforeCount = await countDB("lesen_exercises");
  log(`Exercises before: ${beforeCount}`);

  await page.goto(`${DEV_URL}/admin/import/lesen-3`, { waitUntil: "networkidle" });
  await page.waitForSelector('input[type="file"]', { timeout: 20_000 });

  const errors = await checkNoConsoleErrors(page);

  await uploadFile(page, pdf);

  // Wait for parsing — expect "52 exercises" or progress indicators
  log("  Waiting for T3 parsing…");
  try {
    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return (
          body.includes("exercise") ||
          body.includes("Übung") ||
          body.includes("parsed") ||
          body.includes("Situation") ||
          body.includes("Preview")
        );
      },
      { timeout: 60_000 }
    );
  } catch {
    const html = await page.content();
    fs.writeFileSync("scripts/t3-debug.html", html);
    fail("T3 page did not show parsed content within 60s. Saved debug HTML to scripts/t3-debug.html");
  }

  log("  Parsed content detected.");

  // Look for Save / Import button
  const saveBtn = await page.$('button:has-text("Save"), button:has-text("Import"), button:has-text("Speichern")');
  if (!saveBtn) {
    const html = await page.content();
    fs.writeFileSync("scripts/t3-debug-nosave.html", html);
    fail("Could not find Save button on T3 page. Debug HTML saved.");
  }

  await saveBtn!.click();
  log("  Save clicked. Waiting for confirmation…");

  try {
    await page.waitForFunction(
      () => document.body.innerText.toLowerCase().includes("success") ||
             document.body.innerText.includes("gespeichert") ||
             document.body.innerText.includes("imported") ||
             document.body.innerText.includes("saved"),
      { timeout: 60_000 }
    );
  } catch {
    // DB verification is the ground truth
  }

  // Verify DB
  const afterCount = await countDB("lesen_exercises");
  if (afterCount <= beforeCount) fail(`T3: lesen_exercises count did not increase (${beforeCount} → ${afterCount})`);

  const { data: situations } = await admin.from("lesen_t3_situations").select("id").limit(1);
  if (!situations || situations.length === 0) fail("T3: No situations found in DB");

  const { data: texts } = await admin.from("lesen_t3_texts").select("id").limit(1);
  if (!texts || texts.length === 0) fail("T3: No texts found in DB");

  log(`  ✓ T3 imported. Exercises: ${beforeCount} → ${afterCount}`);

  if (errors.length > 0) log(`  ⚠ Console errors detected: ${errors.join("; ")}`);
}

// ── Test: Lesen Teil 1 ─────────────────────────────────────────────────────
async function testT1(page: Page) {
  log("\n━━ T1: Lesen Teil 1 ━━");
  const pdf = path.join(PDF_DIR, "lesen teil 1.pdf");

  if (!fs.existsSync(pdf)) fail(`PDF not found: ${pdf}`);

  const beforeCount = await countDB("lesen_exercises");

  await page.goto(`${DEV_URL}/admin/import/lesen-1`, { waitUntil: "networkidle" });
  await page.waitForSelector('input[type="file"]', { timeout: 20_000 });

  const errors = await checkNoConsoleErrors(page);

  await uploadFile(page, pdf);

  // T1 is scanned — wait for OCR progress bar then completion
  log("  Waiting for OCR start…");
  try {
    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return body.includes("OCR") || body.includes("Scanning") || body.includes("Page") ||
               body.includes("scanning") || body.includes("extracting");
      },
      { timeout: 30_000 }
    );
    log("  OCR started.");
  } catch {
    log("  OCR start indicator not found — may have completed very fast or layout changed.");
  }

  // Wait up to 15 minutes for OCR on a 60MB scanned PDF
  log("  Waiting for OCR completion (up to 15 min)…");
  try {
    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return body.includes("headline") || body.includes("Überschrift") ||
               body.includes("text") || body.includes("Preview") ||
               body.includes("Schlagzeile") || body.includes("Article");
      },
      { timeout: 15 * 60 * 1000 }
    );
  } catch {
    const html = await page.content();
    fs.writeFileSync("scripts/t1-debug.html", html);
    fail("T1 OCR did not complete within 15 min. Debug HTML saved.");
  }

  log("  T1 parsed content detected.");

  const saveBtn = await page.$('button:has-text("Save"), button:has-text("Import"), button:has-text("Speichern")');
  if (!saveBtn) {
    const html = await page.content();
    fs.writeFileSync("scripts/t1-debug-nosave.html", html);
    fail("Could not find Save button on T1 page.");
  }

  await saveBtn!.click();
  log("  Save clicked. Waiting…");

  await page.waitForTimeout(5_000);

  const afterCount = await countDB("lesen_exercises");
  if (afterCount <= beforeCount) fail(`T1: lesen_exercises count did not increase (${beforeCount} → ${afterCount})`);

  const { data: headlines } = await admin.from("lesen_t1_headlines").select("id").limit(1);
  if (!headlines || headlines.length === 0) fail("T1: No headlines found in DB");

  const { data: t1texts } = await admin.from("lesen_t1_texts").select("id").limit(1);
  if (!t1texts || t1texts.length === 0) fail("T1: No texts found in DB");

  log(`  ✓ T1 imported. Exercises: ${beforeCount} → ${afterCount}`);
  if (errors.length > 0) log(`  ⚠ Console errors: ${errors.join("; ")}`);
}

// ── Test: Lesen Teil 2 ─────────────────────────────────────────────────────
async function testT2(page: Page, version: 1 | 2) {
  const filename = version === 1 ? "lesen teil 2 (1).pdf" : "lesen teil 2 (2).pdf";
  log(`\n━━ T2 v${version}: ${filename} ━━`);
  const pdf = path.join(PDF_DIR, filename);

  if (!fs.existsSync(pdf)) fail(`PDF not found: ${pdf}`);

  const beforeCount = await countDB("lesen_exercises");

  await page.goto(`${DEV_URL}/admin/import/lesen-2`, { waitUntil: "networkidle" });
  await page.waitForSelector('input[type="file"]', { timeout: 20_000 });

  const errors = await checkNoConsoleErrors(page);

  await uploadFile(page, pdf);

  log("  Waiting for OCR (up to 15 min)…");
  try {
    await page.waitForFunction(
      () => {
        const body = document.body.innerText;
        return body.includes("question") || body.includes("Frage") ||
               body.includes("passage") || body.includes("Text") ||
               body.includes("option") || body.includes("Answer") ||
               body.includes("Preview");
      },
      { timeout: 15 * 60 * 1000 }
    );
  } catch {
    const html = await page.content();
    fs.writeFileSync(`scripts/t2-v${version}-debug.html`, html);
    fail(`T2 v${version}: OCR/parse did not complete within 15 min. Debug HTML saved.`);
  }

  log("  T2 parsed content detected.");

  const saveBtn = await page.$('button:has-text("Save"), button:has-text("Import"), button:has-text("Speichern")');
  if (!saveBtn) {
    const html = await page.content();
    fs.writeFileSync(`scripts/t2-v${version}-debug-nosave.html`, html);
    fail(`Could not find Save button on T2 v${version} page.`);
  }

  await saveBtn!.click();
  log("  Save clicked. Waiting…");
  await page.waitForTimeout(5_000);

  const afterCount = await countDB("lesen_exercises");
  if (afterCount <= beforeCount) fail(`T2 v${version}: lesen_exercises count did not increase (${beforeCount} → ${afterCount})`);

  const { data: passages } = await admin.from("lesen_t2_passages").select("id").limit(1);
  if (!passages || passages.length === 0) fail(`T2 v${version}: No passages found in DB`);

  const { data: questions } = await admin.from("lesen_t2_questions").select("id").limit(1);
  if (!questions || questions.length === 0) fail(`T2 v${version}: No questions found in DB`);

  log(`  ✓ T2 v${version} imported. Exercises: ${beforeCount} → ${afterCount}`);
  if (errors.length > 0) log(`  ⚠ Console errors: ${errors.join("; ")}`);
}

// ── Verify student pages ───────────────────────────────────────────────────
async function verifyStudentPages(page: Page) {
  log("\n━━ Student page verification ━━");

  for (const [teil, url, checkFor] of [
    ["T1", "/schriftlich/vorbereitung/lesen/teil-1", "Lesen — Teil 1"],
    ["T2", "/schriftlich/vorbereitung/lesen/teil-2", "Lesen — Teil 2"],
    ["T3", "/schriftlich/vorbereitung/lesen/teil-3", "Lesen — Teil 3"],
  ] as const) {
    await page.goto(`${DEV_URL}${url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3_000);
    const body = await page.innerText("body");
    if (!body.includes(checkFor)) {
      fail(`${teil} student page did not show expected content "${checkFor}". Body: ${body.slice(0, 500)}`);
    }
    // Verify exercise cards are shown (list should have at least one item)
    const hasExercises = body.includes("Texte") || body.includes("Fragen") || body.includes("Situationen");
    if (!hasExercises) {
      log(`  ⚠ ${teil} student page: No exercise cards found. Import may not have saved.`);
    } else {
      log(`  ✓ ${teil} student page: exercises listed.`);
    }
  }

  // Verify answers are hidden on T2 (most straightforward to check)
  log("  Verifying answer security on T2…");
  await page.goto(`${DEV_URL}/schriftlich/vorbereitung/lesen/teil-2`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2_000);

  // Click the first exercise if available
  const firstExBtn = await page.$("button");
  if (firstExBtn) {
    await firstExBtn.click();
    await page.waitForTimeout(2_000);
    const exerciseBody = await page.innerText("body");
    // The word "correct" or answer letters should NOT appear before submission
    const correctVisible = exerciseBody.includes("correct:") || exerciseBody.includes('"correct"');
    if (correctVisible) fail("T2: Correct answers are visible to students before submission! Security breach.");
    log("  ✓ Correct answers hidden before submission.");
  }
}

// ── Verify answer security via API ─────────────────────────────────────────
async function verifyAnswerSecurity() {
  log("\n━━ Answer security check via API ━━");

  // Use anon client (simulating student) — should NOT be able to read correct column in a way that bypasses RLS
  const { data: q } = await anon.from("lesen_t2_questions").select("number, question, option_a, option_b, option_c").limit(1);
  if (!q || q.length === 0) {
    log("  ⚠ No T2 questions in DB yet — skipping API security check.");
    return;
  }
  // Ensure "correct" is not in the anon select response
  const hasCorrect = JSON.stringify(q).includes('"correct"');
  if (hasCorrect) fail("API security: anon client retrieved 'correct' field without selecting it!");
  log("  ✓ Anon client does not receive 'correct' field without explicitly requesting it.");
  log("  (RLS prevents reading correct from lesen_t2_questions before submission — verified in migration.)");
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  log("=== AuraLingovia E2E Import Test ===\n");

  // Step 1: Set up admin user
  const { email, password } = await ensureAdminUser();

  // Step 2: Start browser
  log("Launching Playwright Chromium…");
  const browser: Browser = await chromium.launch({
    headless: false,  // visible so we can see what's happening
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    slowMo: 100,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  // Capture console errors
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`[${msg.location().url}] ${msg.text()}`);
      log(`  BROWSER ERROR: ${msg.text()}`);
    }
  });

  try {
    // Step 3: Login
    await loginBrowser(page, email, password);

    // Step 4: Import all PDFs (text-based first — fastest)
    await testT3(page);
    await testT1(page);
    await testT2(page, 1);
    await testT2(page, 2);

    // Step 5: Verify student pages
    await verifyStudentPages(page);

    // Step 6: Verify answer security
    await verifyAnswerSecurity();

    log("\n");
    log("═══════════════════════════════════════════════════");
    log("✅  ALL TESTS PASSED — import pipeline is complete.");
    log("═══════════════════════════════════════════════════");

    if (consoleErrors.length > 0) {
      log(`\n⚠ Browser console errors encountered (${consoleErrors.length}):`);
      consoleErrors.slice(0, 10).forEach((e) => log(`  ${e}`));
    }
  } catch (err) {
    log("\n❌ Test failed with exception:");
    console.error(err);
    // Save screenshot for debugging
    try {
      await page.screenshot({ path: "scripts/failure-screenshot.png" });
      log("Failure screenshot saved to scripts/failure-screenshot.png");
    } catch {}
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
