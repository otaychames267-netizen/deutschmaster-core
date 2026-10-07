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

Open for the owner: the source wording of Ausflug-mod situations 11 ("ein Tag machen") and 13 ("einen Freier" — evidently "Feier") has typos; imported verbatim, noted in `import_notes`.
