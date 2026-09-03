-- Hides the 15 Hören Teil 1 exercises flagged with the "not yet introduced
-- in Tunisia" notice from the normal student view, per explicit owner
-- request. Reversible: flips is_hidden back to false, same mechanism
-- already used for the Baumpfleger Matthias precedent — no content,
-- answers, audio, or metadata touched, no rows deleted.
--
-- Teil 1 previously had a deliberate `reveal: true` exception in
-- HoerenTeilPage.tsx that kept these visible despite the notice flag; that
-- reveal logic is left untouched (it still applies to any *future* flagged
-- Teil 1 content) — is_hidden simply removes these specific rows from every
-- query before that logic ever runs.

update public.hoeren_exercises
set is_hidden = true
where teil = 1
  and level = 'TELC_B2'
  and import_notes like '%لم تدرج في تونس%'
  and id in (
    '1d675d81-cf0b-4ac1-baec-a7f7422e3a8e', -- AirBerlin
    'f2ab562b-99f7-43e1-b9cd-556dfe06619a', -- Belegschaftsengpass
    'd34d3964-aea1-490a-af7b-964c33bb80b0', -- Busfahrer
    'a762e0c2-7cf9-4832-bc82-67c9e15e36f9', -- Co-Living
    '41adeff7-d504-4bb8-b1cd-9a44ff5dcc98', -- Elbjazz-Festival
    '2000a658-cd54-403c-ba8d-d34f9f1588d7', -- EU-Klimapaket
    '0a2c2129-b3aa-4a82-8e59-44b3bb9a1f38', -- Fahrkarten
    '855768b8-fe1f-46dd-8f10-34979a3febe6', -- Frühzeitige
    'fd2fd2e8-9700-4564-a244-b8d12cad537f', -- Homeoffice
    'feec839b-fda6-446f-bd75-2631a8170c88', -- Japan
    '8530934a-e867-48f6-bc4d-c43afd25df34', -- Lorenzo
    '9e7ee496-1c54-48d6-9da9-34333e16151a', -- Nord-Ostsee
    '45222cda-4cdd-4783-b19c-68ccc2553c6e', -- Paris
    '0e3a2c7d-967d-490a-9a63-eaa78766337e', -- Softdrinks
    'ef3ae7c2-1b95-4a8f-95a0-0d87bd61b179'  -- Theaterpremiere
  );
