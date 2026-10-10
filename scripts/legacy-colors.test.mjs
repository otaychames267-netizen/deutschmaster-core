// Unit test for the build-time oklch -> sRGB downlevelling (vite-plugin-legacy-colors.ts).   npx tsx scripts/legacy-colors.test.mjs
import { downlevelColors, addOpacityFallbacks } from "../vite-plugin-legacy-colors.ts";

let failed = 0;
const ok = (name, cond, extra = "") => { if (!cond) failed++; console.log((cond ? "PASS" : "FAIL") + "  " + name + (extra ? "  " + extra : "")); };
const one = (css) => downlevelColors(css).css;
const hexNear = (hex, want, tol = 2) => { const a = hex.match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16)), b = want.match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16)); return a.every((v, i) => Math.abs(v - b[i]) <= tol); };

ok("white", one("a{color:oklch(1 0 0)}") === "a{color:#ffffff}", one("a{color:oklch(1 0 0)}"));
ok("black", one("a{color:oklch(0 0 0)}") === "a{color:#000000}");
// Tailwind v4's palette (its documented sRGB equivalents — v4 re-tuned the colours, they differ from v3's #3b82f6 / #f43f5e / #f59e0b)
let r = one("a{color:oklch(62.3% .214 259.815)}"); ok("tailwind v4 blue-500 ≈ #2b7fff", hexNear(/#[0-9a-f]{6}/.exec(r)?.[0] ?? "#000000", "#2b7fff"), r);
r = one("a{color:oklch(64.5% .246 16.439)}"); ok("tailwind v4 rose-500 ≈ #ff2056", hexNear(/#[0-9a-f]{6}/.exec(r)?.[0] ?? "#000000", "#ff2056"), r);
r = one("a{color:oklch(76.9% .188 70.08)}"); ok("tailwind v4 amber-500 ≈ #fe9a00", hexNear(/#[0-9a-f]{6}/.exec(r)?.[0] ?? "#000000", "#fe9a00"), r);
r = one("a{color:oklch(0.985 0.004 240)}"); ok("app --background is a near-white", /^a\{color:#f[0-9a-f]{5}\}$/.test(r), r);
r = one("a{color:oklch(0.5 0.18 264/0.4)}"); ok("alpha via slash -> rgba", /^a\{color:rgba\(\d+,\d+,\d+,0\.4\)\}$/.test(r), r);
r = one("a{color:oklch(1 0 0 / 8%)}"); ok("alpha percentage", r === "a{color:rgba(255,255,255,0.08)}", r);
r = one("a{color:oklab(0.5 0.1 -0.1)}"); ok("oklab handled", /^a\{color:#[0-9a-f]{6}\}$/.test(r), r);
ok("var() colours are left untouched", one("a{color:oklch(var(--l) 0 0)}") === "a{color:oklch(var(--l) 0 0)}");
ok("relative colour syntax is left untouched", one("a{color:oklch(from var(--x) l c h)}") === "a{color:oklch(from var(--x) l c h)}");
ok("custom property definition is converted", /^:root\{--card:#ffffff;/.test(one(":root{--card:oklch(1.0 0 0);--x:1}")));
ok("a stylesheet without them is unchanged", downlevelColors("a{color:red}").converted === 0);
r = downlevelColors("a{b:oklch(1 0 0)}c{d:oklch(0 0 0)}"); ok("counts conversions", r.converted === 2);

// ---- opacity fallbacks for theme-token colours (Tailwind: solid var(--token) line + @supports color-mix line) ----
const SUP = "@supports (color:color-mix(in lab,red,red))";
const pair = (cls, prop, tok, pct) => `.${cls}{${prop}:var(${tok})}${SUP}{.${cls}{${prop}:color-mix(in oklab,var(${tok}) ${pct}%,transparent)}}`;
let t = addOpacityFallbacks(`:root{--primary:#2b59c8;--ring:var(--primary)}.dark{--primary:#8fb0ff}${pair("bg-primary\\/10", "background-color", "--primary", 10)}`);
ok("token pair is rewritten", t.rewritten === 1 && t.css.includes("background-color:rgb(var(--primary-rgb) / calc(var(--primary-a) * 10%))"), t.css.slice(-190));
ok("the @supports color-mix line is kept untouched", t.css.includes("color-mix(in oklab,var(--primary) 10%,transparent)"));
ok("light and dark definitions both get channels", t.css.includes("--primary:#2b59c8;--primary-rgb:43 89 200;--primary-a:1") && t.css.includes("--primary:#8fb0ff;--primary-rgb:143 176 255;--primary-a:1"), t.css.slice(0, 200));
t = addOpacityFallbacks(`:root{--border:#ffffff1a}${pair("border-border\\/50", "border-color", "--border", 50)}`);
ok("a token that carries its own alpha keeps it (hex8)", t.css.includes("--border-rgb:255 255 255;--border-a:0.102"), t.css.slice(0, 120));
t = addOpacityFallbacks(`:root{--a:var(--b);--b:#112233}${pair("bg-a\\/20", "background-color", "--a", 20)}`);
ok("alias tokens resolve through var()", t.rewritten === 1 && t.css.includes("--b:#112233;--b-rgb:17 34 51") && t.css.includes("--a:var(--b);--a-rgb:var(--b-rgb)"), t.css.slice(0, 160));
t = addOpacityFallbacks(`:root{--x:oklch(from red l c h)}${pair("bg-x\\/10", "background-color", "--x", 10)}`);
ok("a token we cannot express as channels is left alone", t.rewritten === 0 && t.css.includes("background-color:var(--x)"));
t = addOpacityFallbacks(pair("bg-gone\\/10", "background-color", "--gone", 10));
ok("an undefined token is left alone", t.rewritten === 0);
t = addOpacityFallbacks(`.bg-rose\\/10{background-color:#ff23571a}${SUP}{.bg-rose\\/10{background-color:color-mix(in oklab,var(--color-rose-500) 10%,transparent)}}`);
ok("palette colours with a static fallback are left alone", t.rewritten === 0 && t.css.includes("#ff23571a"));
// grouped base rule: `.border-border,.border-border\/50{...}` — only the /50 variant may become translucent
t = addOpacityFallbacks(`:root{--border:#dce2e9}.border-border,.border-border\\/50{border-color:var(--border)}${SUP}{.border-border\\/50{border-color:color-mix(in oklab,var(--border) 50%,transparent)}}`);
ok("grouped selector: the plain class keeps the solid colour", t.css.includes(".border-border{border-color:var(--border)}"), t.css);
ok("grouped selector: the /50 variant gets the translucent fallback", t.rewritten === 1 && /\.border-border\\\/50\{border-color:rgb\(var\(--border-rgb\) \/ calc\(var\(--border-a\) \* 50%\)\)\}/.test(t.css), t.css);
ok("css without any pair is returned unchanged", addOpacityFallbacks("a{color:red}").css === "a{color:red}");
ok("broken css does not throw", addOpacityFallbacks("a{{{").css === "a{{{");

if (failed) { console.error(`\n${failed} FAILED`); process.exit(1); }
console.log("\nall passed");
