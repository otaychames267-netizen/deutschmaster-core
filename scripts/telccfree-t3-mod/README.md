# B2 Lesen Teil 3 — telccfree.com "(معدل)" variants (2026-10-07)

Owner asked for "Schlafzug معدل" and "Ausflug معدل" from telccfree.com (confirmed own platform, see memory `feedback-content-sourcing-policy`).

**How telccfree stores them:** each topic on `indexb2` has two versions (`quiz/<n>.html` original, `quiz/<slug>-mod.html` modified). The raw quiz HTML carries the whole answer key:
`.question-box` = ad (data-correct = matching situation, data-translation = Arabic), `.right-column-content .draggable` = situation (data-correct-letter A–L / X, data-mod="1" if reworded, data-translation).

**Content check (normalized FNV hashes of every ad and situation, telccfree vs Aura):**

| telccfree | Aura | result |
|---|---|---|
| Ausflug (quiz/109) | Ausflug | situations 10/10 identical → Aura has the original |
| Ausflug معدل | — | same ads + same answer letters, situations 11 and 13 reworded → **missing, added** |
| Schlafzug (quiz/132) | **Berlin** | situations 10/10 identical, same answer letters → telccfree's "Schlafzug" is Aura's "Berlin" |
| Schlafzug معدل | — | same ads/letters, all 10 situations reworded → **missing, added as "Berlin (معدل)"** |

telccfree's ad texts are lightly re-typed copies of the real ones (e.g. "liefen Speisen", "a.yildrim@", "zubereitet kann"); Aura's originals are the cleaned versions, so the new variants copy the ads from the Aura originals and take only the reworded situations from telccfree.

`insert-mod-variants.sql` is the insert (one DO block = one transaction, guarded against double-run); it also shifts `sort_order` of the rows after each original so a variant sits directly behind its original.

Typos in Ausflug-mod situations 11 ("ein Tag machen") and 13 ("Freier") were first imported verbatim, then fixed with the owner's OK on 2026-10-07 (`fix-ausflug-mod-typos.sql`): "einen Tag verbringen" and "Feier".

## Second batch (2026-10-07): Stadtführer (معدل) + Musik (معدل)

| telccfree | Aura | result |
|---|---|---|
| Stadtführer (quiz/stadtfuehrer.html) | Stadtführer | ads 12/12 (prefix), same answer key → Aura has the original |
| **Reiseführer 2** (quiz/reisefuehrer-2.html) = modified Stadtführer | — | 9/10 situations reworded + new key `A K X X H X F X B L` (original `A K D C X E X H F L`); telccfree re-typed all 12 ads (new typos) → **added** as "Stadtführer (معدل)" with Aura's ads |
| Musik (quiz/88.html) | Musik | 9/10 situations identical, same key → Aura has the original |
| Musik (معدل) (quiz/musik-mod.html) | — | situations 11–13 reworded, same ads + key → **added** as "Musik (معدل)" |

`insert-stadtfuehrer-musik-mod.sql`: verified with the real `score_lesen_t3` RPC (perfect = 10/10, wrong = 0, learning aids present). Open observation: Aura's *original* Stadtführer situations are missing umlauts ("Stadtfuhrer", "mochte", "mogen") — pre-existing, not touched.

## Translation + justification audit (2026-10-07)
All four variants carry the Arabic translation (12 ads + 10 situations) and a justification item for every matched situation. The no-match (X) situations of Ausflug/Berlin/Stadtführer (معدل) had none (copied from older originals that left X empty) → `add-no-match-justifications.sql` adds them (names the closest trap ad); Musik (معدل) inherits its X items. Check: `score_lesen_t3` returns learning_aids for 11–20 on all four.
