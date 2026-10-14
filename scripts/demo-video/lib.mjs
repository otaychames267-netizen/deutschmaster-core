// Shared helpers for the demo recordings: visible cursor + click ripples, caption bar, smooth scrolling, title cards.
import { createRequire } from "node:module";
const { chromium } = createRequire("C:/Users/asus/AuraLingovia/.claude/worktrees/score/package.json")("playwright");
export { chromium };
export const SP = "C:/Users/asus/AppData/Local/Temp/claude/C--Users-asus-AuraLingovia/6ec46fa6-1f81-4947-8f36-2311127c6930/scratchpad/demo/";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CURSOR_JS = `(() => { const add = () => { if (document.getElementById('__cur')) return; const c = document.createElement('div'); c.id = '__cur';
  c.style.cssText = 'position:fixed;left:0;top:0;width:20px;height:20px;margin:-4px 0 0 -4px;border-radius:50%;background:rgba(30,64,175,.9);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)';
  document.documentElement.appendChild(c);
  addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
  addEventListener('mousedown', (e) => { const r = document.createElement('div'); r.style.cssText = 'position:fixed;left:' + (e.clientX - 22) + 'px;top:' + (e.clientY - 22) + 'px;width:44px;height:44px;border-radius:50%;border:3px solid rgba(30,64,175,.75);z-index:2147483646;pointer-events:none;transition:all .5s ease-out;opacity:1';
    document.documentElement.appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(1.9)'; r.style.opacity = '0'; }); setTimeout(() => r.remove(), 600); }, true); };
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', add); else add(); })();`;

export async function newRecorder({ session, viewport = { width: 1280, height: 720 }, dir }) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport, locale: "en-US", recordVideo: { dir, size: viewport } });
  await ctx.addInitScript(CURSOR_JS);
  if (session) await ctx.addInitScript((s) => { try { localStorage.setItem("sb-gewcyydpgbfutkdcyztr-auth-token", s); } catch {} }, session);
  const page = await ctx.newPage();
  return { browser, ctx, page };
}

export async function caption(page, text, pos = "bottom") {
  await page.evaluate(([t, pos]) => {
    let c = document.getElementById("__cap");
    if (!t) { if (c) c.style.opacity = "0"; return; }
    if (!c) { c = document.createElement("div"); c.id = "__cap"; c.style.cssText = "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);max-width:1000px;padding:12px 22px;border-radius:12px;background:rgba(10,18,40,.88);color:#fff;font:600 20px/1.35 Inter,system-ui,Segoe UI,sans-serif;text-align:center;z-index:2147483645;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,.35);transition:opacity .35s"; document.documentElement.appendChild(c); }
    c.textContent = t; c.style.opacity = "1"; if (pos === "top") { c.style.bottom = "auto"; c.style.top = "72px"; } else { c.style.top = "auto"; c.style.bottom = "26px"; }
  }, [text, pos]);
}

export async function move(page, x, y, steps = 28) { await page.mouse.move(x, y, { steps }); }

export async function clickEl(page, locator, { pause = 450, after = 900 } = {}) {
  await locator.scrollIntoViewIfNeeded({ timeout: 8000 });
  await sleep(250);
  const b = await locator.boundingBox(); if (!b) throw new Error("no box");
  await move(page, b.x + b.width / 2, b.y + b.height / 2);
  await sleep(pause);
  await page.mouse.down(); await sleep(60); await page.mouse.up();
  await sleep(after);
}

export async function slowScroll(page, total, step = 360, delay = 900) {
  let done = 0; while (done < total) { await page.mouse.wheel(0, step); done += step; await sleep(delay); }
}

export async function titleCard(page, { title, sub, foot }, ms = 3500) {
  await page.setContent(`<html><body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 120% at 20% 10%,#1e3a8a 0%,#0b1230 60%,#060a1c 100%);font-family:Inter,system-ui,Segoe UI,sans-serif;color:#fff;text-align:center">
    <div style="max-width:900px;padding:0 40px"><div style="font-size:20px;letter-spacing:6px;color:#facc15;font-weight:700;margin-bottom:18px">AURALINGOVIA</div>
    <div style="font-size:46px;font-weight:800;line-height:1.15;margin-bottom:18px">${title}</div>
    <div style="font-size:23px;color:#cbd5e1;line-height:1.5">${sub ?? ""}</div>
    <div style="margin-top:34px;font-size:19px;color:#93c5fd">${foot ?? ""}</div></div></body></html>`);
  await sleep(ms);
}
