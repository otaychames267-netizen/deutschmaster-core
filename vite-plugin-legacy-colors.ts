import type { Plugin } from "vite";
import postcss from "postcss";

/**
 * Production-only post-processing of the emitted CSS for OLDER browsers (owner 2026-10-09).
 *
 * Tailwind v4 writes every theme colour as `oklch(...)`. Chrome only understands oklch() from version 111 — but Windows 7/8 laptops are stuck on
 * Chrome 109. There, every declaration that uses such a colour (`--background`, `--card`, `bg-rose-500`, ...) is INVALID, so cards, modals and
 * popovers get NO background (text of the page shows through the open dialog) and colours fall back to defaults. This plugin rewrites each static
 * `oklch(...)` / `oklab(...)` in the final CSS to an sRGB hex / rgba() value that every browser understands. Colours that depend on var() are left
 * alone (Tailwind already emits a plain fallback before its `color-mix()` rules, inside `@supports`).
 *
 * The conversion is the standard OKLab -> linear sRGB -> sRGB transform (Björn Ottosson); out-of-gamut colours are clamped.
 */

function toByte(linear: number): number {
  const c = Math.min(1, Math.max(0, linear));
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    toByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function num(token: string, percentScale: number): number | null {
  if (token === "none") return 0;
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(%|deg)?$/i.exec(token);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return m[2] === "%" ? (v / 100) * percentScale : v;
}

function format([r, g, b]: [number, number, number], alpha: number): string {
  if (alpha >= 0.9995) return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `rgba(${r},${g},${b},${Math.round(alpha * 1000) / 1000})`;
}

/** Rewrites every static oklch()/oklab() in a stylesheet; exported for the build-time test. */
export function downlevelColors(css: string): { css: string; converted: number } {
  let converted = 0;
  const out = css.replace(/\bok(lch|lab)\(\s*([^()]*?)\s*\)/gi, (whole, kind: string, args: string) => {
    const slash = args.split("/");
    if (slash.length > 2) return whole;
    const parts = slash[0].trim().split(/\s+/);
    if (parts.length !== 3) return whole;
    const m = [args, parts[0], parts[1], parts[2], slash.length === 2 ? slash[1].trim() : undefined] as const;
    if (m[4] === "") return whole;
    const L = num(m[1], 1);
    const alpha = m[4] === undefined ? 1 : num(m[4], 1);
    let rgb: [number, number, number];
    if (kind.toLowerCase() === "lch") {
      const C = num(m[2], 0.4), H = num(m[3], 360);
      if (L === null || C === null || H === null) return whole;
      const h = (H * Math.PI) / 180;
      rgb = oklabToRgb(L, C * Math.cos(h), C * Math.sin(h));
    } else {
      const A = num(m[2], 0.4), B = num(m[3], 0.4);
      if (L === null || A === null || B === null) return whole;
      rgb = oklabToRgb(L, A, B);
    }
    if (alpha === null) return whole;
    converted++;
    return format(rgb, Math.min(1, Math.max(0, alpha)));
  });
  return { css: out, converted };
}

/** Bump when the plugin starts producing different CSS from the same source (see transform()). */
const CSS_REV = 2;

export function legacyColorFallback(): Plugin[] {
  return [
    {
      // 1) oklch()/oklab() -> sRGB while the stylesheet is still CSS. This hook must run BEFORE Vite's own "vite:css-post" plugin (which turns a CSS module
      //    into an emitted file and replaces the module's code), i.e. as a NORMAL-order plugin — an `enforce: "post"` plugin would only see the JS stub.
      //    It also matters for caching: the emitted file's NAME carries a hash of its content and returning visitors keep hashed assets cached "forever",
      //    so the content has to differ here, not only in generateBundle.
      //    NOTE: whenever the plugin starts producing different CSS from the SAME source CSS, bump CSS_REV so the file name changes too.
      name: "aura-legacy-color-fallback:transform",
      apply: "build",
      transform(code, id) {
        if (!/\.css(\?|$)/.test(id)) return null;
        const { css, converted } = downlevelColors(code);
        return converted > 0 ? { code: `${css}\n:root{--aura-css-rev:${CSS_REV}}`, map: null } : null;
      },
    },
    legacyBundlePlugin(),
  ];
}

function legacyBundlePlugin(): Plugin {
  return {
    name: "aura-legacy-color-fallback:bundle",
    apply: "build",
    enforce: "post",
    // 2) Everything that only exists after Vite minified the CSS (Lightning CSS adds the "solid fallback + @supports color-mix" pairs there), plus a
    //    safety net for CSS that reaches the bundle another way.
    generateBundle(_options, bundle) {
      let colors = 0, fallbacks = 0;
      for (const file of Object.values(bundle)) {
        if (file.type !== "asset" || !file.fileName.endsWith(".css")) continue;
        const source = typeof file.source === "string" ? file.source : Buffer.from(file.source).toString("utf8");
        const first = downlevelColors(source);
        const second = addOpacityFallbacks(first.css);
        if (first.converted > 0 || second.rewritten > 0) { file.source = second.css; colors += first.converted; fallbacks += second.rewritten; }
      }
      if (colors + fallbacks > 0) this.info(`legacy colors: ${colors} late oklch() values converted, ${fallbacks} translucent fallbacks for var(--token)/N% colours added`);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Opacity fallbacks for theme-token colours.
//
// Tailwind writes `bg-primary/10` as  `.x{background-color:var(--primary)}  @supports (color:color-mix(in lab,red,red)){.x{background-color:color-mix(in oklab,var(--primary) 10%,transparent)}}`.
// A browser without color-mix() (Chrome < 111) skips the @supports block and keeps the first line: a SOLID primary fill instead of a 10 % tint — dark
// panels with dark text, icons that vanish inside their own circle. (Palette colours such as rose-500 / black / white already get a correct static
// fallback from Tailwind; only var(--token) colours do not.) Here every token that appears in such a pair gets two helper variables next to its
// definition — `--T-rgb: r g b` and `--T-a: alpha` — and the fallback line becomes `rgb(var(--T-rgb) / calc(var(--T-a) * 10%))`, which old Chrome
// understands and which follows the light/dark theme because it is re-evaluated wherever the token is redefined. Modern browsers still take the
// color-mix() line exactly as before.
// ---------------------------------------------------------------------------------------------------------------------------------------------
function parseStaticColor(value: string): { rgb: string; a: number } | null {
  const v = value.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(v);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { rgb: `${n(0)} ${n(2)} ${n(4)}`, a: h.length === 8 ? Math.round((n(6) / 255) * 1000) / 1000 : 1 };
  }
  m = /^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)\s*(?:[,/]\s*([\d.]+)(%?)\s*)?\)$/.exec(v);
  if (m) return { rgb: `${m[1]} ${m[2]} ${m[3]}`, a: m[4] === undefined ? 1 : m[5] ? parseFloat(m[4]) / 100 : parseFloat(m[4]) };
  return null;
}

export function addOpacityFallbacks(css: string): { css: string; rewritten: number } {
  let root: postcss.Root;
  try { root = postcss.parse(css); } catch { return { css, rewritten: 0 }; }

  // 1. every "base line + @supports(color-mix)" pair
  const pairs: { baseRule: postcss.Rule; sel: string; prop: string; token: string; pct: string }[] = [];
  root.walkAtRules("supports", (at) => {
    if (at.params.replace(/\s+/g, "") !== "(color:color-mix(inlab,red,red))") return;
    at.walkRules((rule) => {
      rule.walkDecls((d) => {
        const m = /^color-mix\(\s*in oklab\s*,\s*var\((--[\w-]+)\)\s+([\d.]+)%\s*,\s*transparent\s*\)$/.exec(d.value.trim());
        if (!m) return;
        let prev = at.prev();
        while (prev && prev.type === "comment") prev = prev.prev();
        // The base rule is often a selector LIST (`.border-border,.border-border\/50{border-color:var(--border)}`): the plain class and its
        // opacity variants share one declaration, while each @supports block carries one variant.
        if (!prev || prev.type !== "rule" || !prev.selectors.includes(rule.selector)) return;
        const base = prev.nodes.find((n): n is postcss.Declaration => n.type === "decl" && n.prop === d.prop);
        if (base && base.value.trim() === `var(${m[1]})`) pairs.push({ baseRule: prev, sel: rule.selector, prop: d.prop, token: m[1], pct: m[2] });
      });
    });
  });
  if (pairs.length === 0) return { css, rewritten: 0 };

  // 2. token definitions -> helper channel variables (aliases `--A: var(--B)` follow B; closure until stable)
  const needed = new Set(pairs.map((p) => p.token));
  const broken = new Set<string>(); // a definition we cannot express as channels -> leave that token's pairs alone
  const defined = new Set<string>();
  const added = new WeakSet<postcss.Declaration>();
  for (let pass = 0; pass < 6; pass++) {
    const before = needed.size;
    root.walkDecls((d) => {
      if (!needed.has(d.prop) || added.has(d)) return;
      added.add(d);
      defined.add(d.prop);
      const alias = /^var\((--[\w-]+)\)$/.exec(d.value.trim());
      if (alias) {
        needed.add(alias[1]);
        d.after([postcss.decl({ prop: `${d.prop}-rgb`, value: `var(${alias[1]}-rgb)` }), postcss.decl({ prop: `${d.prop}-a`, value: `var(${alias[1]}-a)` })]);
        return;
      }
      const c = parseStaticColor(d.value);
      if (!c) { broken.add(d.prop); return; }
      d.after([postcss.decl({ prop: `${d.prop}-rgb`, value: c.rgb }), postcss.decl({ prop: `${d.prop}-a`, value: String(c.a) })]);
    });
    if (needed.size === before) break;
  }
  for (const t of needed) if (!defined.has(t)) broken.add(t);
  // an alias is only as good as the token it points to
  root.walkDecls((d) => { const a = /^var\((--[\w-]+)\)$/.exec(d.value.trim()); if (a && needed.has(d.prop) && broken.has(a[1])) broken.add(d.prop); });

  // 3. rewrite the base lines
  let rewritten = 0;
  for (const { baseRule, sel, prop, token, pct } of pairs) {
    if (broken.has(token)) continue;
    let target = baseRule;
    if (baseRule.selectors.length > 1) {
      // split this variant out of the shared rule so the plain class (`.border-border`) keeps the full-strength colour
      const rest = baseRule.selectors.filter((s) => s !== sel);
      if (rest.length === baseRule.selectors.length) continue;
      target = baseRule.clone({ selector: sel });
      baseRule.selectors = rest;
      baseRule.after(target);
    }
    const base = target.nodes.find((n): n is postcss.Declaration => n.type === "decl" && n.prop === prop);
    if (!base) continue;
    base.value = `rgb(var(${token}-rgb) / calc(var(${token}-a) * ${pct}%))`;
    rewritten++;
  }
  return { css: root.toString(), rewritten };
}
