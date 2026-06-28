import nspell from "nspell";

async function loadSpell(): Promise<any> {
  const mod: any = await import("dictionary-de");
  const dict = mod.default ?? mod;
  return nspell(dict);
}

async function main() {
  const spell = await loadSpell();
  const tests = ["Württemberg", "Wiirttemberg", "Plastiktiiten", "Plastiktüten", "Käse", "Kise", "Läden", "Liden", "Händler", "Handler", "Großmärkte", "GroBmarkte"];
  for (const w of tests) {
    const ok = spell.correct(w);
    const sug = ok ? [] : spell.suggest(w).slice(0, 3);
    console.log(`${w.padEnd(16)} valid=${ok}${ok ? "" : "  suggest=" + sug.join(",")}`);
  }
}
main().catch((e) => { console.error("ERR", e); process.exit(1); });
