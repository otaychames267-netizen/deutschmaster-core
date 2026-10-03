/**
 * Generates the Phase 8 D17 admin-test fixture PAIRS (screenshot 1 "Payment
 * Success" + screenshot 2 "Transaction History/Journal D17") used by the
 * admin-only fixture panel on the verify page. Synthetic SVG-rendered PNGs,
 * matching the existing single-screenshot fixtures' 360x640 phone-screen
 * dimensions.
 *
 * Each pair uses a MACRO-STRUCTURALLY different layout from the others —
 * not just a different color scheme. This is load-bearing, not cosmetic:
 * the duplicate-detection dHash algorithm (image-hash.server.ts) resizes
 * to a coarse 9x8 grayscale grid, so it's sensitive to the overall
 * light/dark BLOCK layout and almost blind to color hue or small text —
 * two recolored-but-same-shape mockups (e.g. both "dark background, centered
 * light card") hash near-identically regardless of what text or accent
 * color they use. Verified via scripts/_tmp-dhash-check pattern (see repo
 * history) that these three layouts are pairwise distinct under
 * DHASH_DUPLICATE_THRESHOLD before wiring them into the admin UI.
 *
 * Re-run this script any time the fixture set needs regenerating —
 * nothing else in the repo depends on its intermediate output, only the
 * final PNGs under public/d17-test-fixtures/.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const OUT_DIR = "./public/d17-test-fixtures";
mkdirSync(OUT_DIR, { recursive: true });

async function render(svg, path) {
  await sharp(Buffer.from(svg)).png().toFile(path);
}

const BASE_DATETIME = new Date(Date.now() - 5 * 60_000).toISOString().slice(0, 16).replace("T", " ");

// ── Layout A: vertical split, dark-left / light-right column, no card ──
// (Deliberately NOT "dark background, centered light card" like the
// pre-existing sample-pass.png — that shape collided with it under dHash.)
function layoutACard1({ amount, currency, destination, datetime, authNumber, txnId }) {
  return `<svg width="360" height="640" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="640" fill="#ffffff"/>
    <rect x="0" y="0" width="150" height="640" fill="#064e3b"/>
    <text x="30" y="70" font-size="16" font-weight="bold" fill="#ffffff" font-family="Arial">D17</text>
    <text x="30" y="95" font-size="12" fill="#6ee7b7" font-family="Arial">Réussi</text>
    <circle cx="75" cy="200" r="30" fill="#10b981"/>
    <text x="75" y="210" font-size="28" fill="#ffffff" text-anchor="middle" font-family="Arial">✓</text>
    <text x="30" y="300" font-size="26" font-weight="bold" fill="#ffffff" font-family="Arial">${amount}</text>
    <text x="30" y="325" font-size="14" fill="#6ee7b7" font-family="Arial">${currency}</text>
    <text x="170" y="70" font-size="12" fill="#065f46" font-family="Arial">Destinataire</text>
    <text x="170" y="92" font-size="15" fill="#0f172a" font-family="Arial">${destination}</text>
    <text x="170" y="150" font-size="12" fill="#065f46" font-family="Arial">Date et heure</text>
    <text x="170" y="172" font-size="15" fill="#0f172a" font-family="Arial">${datetime}</text>
    <text x="170" y="230" font-size="12" fill="#065f46" font-family="Arial">Transaction ID</text>
    <text x="170" y="252" font-size="13" fill="#0f172a" font-family="Arial">${txnId}</text>
    <text x="170" y="310" font-size="12" fill="#065f46" font-family="Arial">Numéro d'autorisation</text>
    <text x="170" y="332" font-size="15" font-weight="bold" fill="#0f172a" font-family="Arial">${authNumber}</text>
  </svg>`;
}
function layoutACard2({ amount, currency, destination, datetime, authNumber }) {
  return `<svg width="360" height="640" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="640" fill="#ffffff"/>
    <rect x="0" y="0" width="150" height="640" fill="#064e3b"/>
    <text x="30" y="70" font-size="15" font-weight="bold" fill="#ffffff" font-family="Arial">Journal</text>
    <text x="30" y="92" font-size="12" fill="#6ee7b7" font-family="Arial">D17</text>
    <text x="30" y="200" font-size="12" fill="#6ee7b7" font-family="Arial">● Terminée</text>
    <text x="170" y="70" font-size="12" fill="#065f46" font-family="Arial">Transfert D17</text>
    <text x="170" y="98" font-size="22" font-weight="bold" fill="#0f172a" font-family="Arial">${amount} ${currency}</text>
    <text x="170" y="140" font-size="13" fill="#334155" font-family="Arial">Vers: ${destination}</text>
    <text x="170" y="168" font-size="13" fill="#334155" font-family="Arial">${datetime}</text>
    <text x="170" y="196" font-size="13" fill="#334155" font-family="Arial">Autorisation: ${authNumber}</text>
  </svg>`;
}

// ── Layout B: light background, dark banner across the TOP THIRD only ──
function layoutBCard1({ amount, currency, destination, datetime, authNumber, txnId }) {
  return `<svg width="360" height="640" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="640" fill="#f1f5f9"/>
    <rect x="0" y="0" width="360" height="210" fill="#1e1b4b"/>
    <text x="180" y="90" font-size="34" fill="#ffffff" text-anchor="middle" font-family="Arial">✓</text>
    <text x="180" y="140" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="Arial">D17 — Paiement réussi</text>
    <text x="180" y="175" font-size="26" font-weight="bold" fill="#a5b4fc" text-anchor="middle" font-family="Arial">${amount} ${currency}</text>
    <rect x="24" y="240" width="312" height="360" rx="16" fill="#ffffff" stroke="#c7d2fe"/>
    <text x="48" y="280" font-size="12" fill="#6366f1" font-family="Arial">Destinataire</text>
    <text x="48" y="302" font-size="16" fill="#1e1b4b" font-family="Arial">${destination}</text>
    <text x="48" y="340" font-size="12" fill="#6366f1" font-family="Arial">Date et heure</text>
    <text x="48" y="362" font-size="16" fill="#1e1b4b" font-family="Arial">${datetime}</text>
    <text x="48" y="400" font-size="12" fill="#6366f1" font-family="Arial">Transaction ID</text>
    <text x="48" y="422" font-size="14" fill="#1e1b4b" font-family="Arial">${txnId}</text>
    <text x="48" y="460" font-size="12" fill="#6366f1" font-family="Arial">Numéro d'autorisation</text>
    <text x="48" y="484" font-size="16" font-weight="bold" fill="#1e1b4b" font-family="Arial">${authNumber}</text>
  </svg>`;
}
function layoutBCard2({ amount, currency, destination, datetime, authNumber }) {
  return `<svg width="360" height="640" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="640" fill="#f1f5f9"/>
    <rect x="0" y="0" width="360" height="120" fill="#1e1b4b"/>
    <text x="180" y="70" font-size="18" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="Arial">Journal D17 — Historique</text>
    <rect x="24" y="150" width="312" height="440" rx="16" fill="#ffffff" stroke="#c7d2fe"/>
    <text x="48" y="190" font-size="12" fill="#6366f1" font-family="Arial">Transfert D17</text>
    <text x="48" y="216" font-size="22" font-weight="bold" fill="#1e1b4b" font-family="Arial">${amount} ${currency}</text>
    <text x="48" y="250" font-size="13" fill="#334155" font-family="Arial">Vers: ${destination}</text>
    <text x="48" y="278" font-size="13" fill="#334155" font-family="Arial">${datetime}</text>
    <text x="48" y="306" font-size="13" fill="#334155" font-family="Arial">Autorisation: ${authNumber}</text>
    <text x="48" y="336" font-size="12" fill="#6366f1" font-family="Arial">● Terminée</text>
  </svg>`;
}

// ── Layout C: high-contrast diagonal split, no rounded card at all ──
function layoutCCard1({ amount, currency, destination, datetime, authNumber, txnId }) {
  return `<svg width="360" height="640" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="640" fill="#fff7ed"/>
    <polygon points="0,0 360,0 360,260 0,420" fill="#7c2d12"/>
    <text x="30" y="60" font-size="16" font-weight="bold" fill="#ffffff" font-family="Arial">D17 Confirmation</text>
    <text x="30" y="150" font-size="30" font-weight="bold" fill="#ffffff" font-family="Arial">${amount} ${currency}</text>
    <text x="30" y="180" font-size="13" fill="#fed7aa" font-family="Arial">Paiement réussi</text>
    <text x="30" y="460" font-size="12" fill="#9a3412" font-family="Arial">Destinataire: ${destination}</text>
    <text x="30" y="490" font-size="12" fill="#9a3412" font-family="Arial">Date: ${datetime}</text>
    <text x="30" y="520" font-size="12" fill="#9a3412" font-family="Arial">Transaction ID: ${txnId}</text>
    <text x="30" y="560" font-size="15" font-weight="bold" fill="#7c2d12" font-family="Arial">Autorisation: ${authNumber}</text>
  </svg>`;
}
function layoutCCard2({ amount, currency, destination, datetime, authNumber }) {
  return `<svg width="360" height="640" xmlns="http://www.w3.org/2000/svg">
    <rect width="360" height="640" fill="#fff7ed"/>
    <polygon points="0,640 360,640 360,300 0,180" fill="#7c2d12"/>
    <text x="30" y="50" font-size="18" font-weight="bold" fill="#7c2d12" font-family="Arial">Journal D17</text>
    <text x="30" y="90" font-size="13" fill="#9a3412" font-family="Arial">Historique des transactions</text>
    <text x="30" y="440" font-size="22" font-weight="bold" fill="#ffffff" font-family="Arial">${amount} ${currency}</text>
    <text x="30" y="470" font-size="13" fill="#fed7aa" font-family="Arial">Vers: ${destination}</text>
    <text x="30" y="500" font-size="13" fill="#fed7aa" font-family="Arial">${datetime}</text>
    <text x="30" y="530" font-size="13" fill="#fed7aa" font-family="Arial">Autorisation: ${authNumber}</text>
    <text x="30" y="560" font-size="12" fill="#fdba74" font-family="Arial">● Terminée</text>
  </svg>`;
}

async function makePair(name, svg1, svg2) {
  await render(svg1, `${OUT_DIR}/pair-${name}-1.png`);
  await render(svg2, `${OUT_DIR}/pair-${name}-2.png`);
  console.log("wrote pair:", name);
}

// 1. consistent-pass (Layout A) — both screenshots agree on everything.
await makePair(
  "consistent-pass",
  layoutACard1({ amount: "30.00", currency: "TND", destination: "20 123 456", datetime: BASE_DATETIME, authNumber: "AUTH-778899", txnId: "TXN-445566" }),
  layoutACard2({ amount: "30.00", currency: "TND", destination: "20 123 456", datetime: BASE_DATETIME, authNumber: "AUTH-778899" }),
);

// 2. mismatched (Layout B) — screenshot 2 shows a different amount.
await makePair(
  "mismatched",
  layoutBCard1({ amount: "30.00", currency: "TND", destination: "31 555 222", datetime: BASE_DATETIME, authNumber: "AUTH-991122", txnId: "TXN-334455" }),
  layoutBCard2({ amount: "55.00", currency: "TND", destination: "31 555 222", datetime: BASE_DATETIME, authNumber: "AUTH-991122" }),
);

// 3. wrong-destination (Layout C) — both agree with each other, but the
// destination doesn't match D17_OFFICIAL_NUMBER once that's configured.
await makePair(
  "wrong-destination",
  layoutCCard1({ amount: "30.00", currency: "TND", destination: "99 000 111", datetime: BASE_DATETIME, authNumber: "AUTH-100200", txnId: "TXN-100200" }),
  layoutCCard2({ amount: "30.00", currency: "TND", destination: "99 000 111", datetime: BASE_DATETIME, authNumber: "AUTH-100200" }),
);

console.log("Done — 3 fixture pairs (6 PNGs) written to", OUT_DIR);
