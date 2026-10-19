# Hören Teil 1 re-voiced with Gemini TTS (2026-10-19)
- `gemini-teil1.switch.sql` / `gemini-teil1.rollback.sql`: every exercise switched to `hoeren-audio/gemini/teil1/<slug>.m4a` and the one-line rollback to its previous path (old files stay in the bucket). Already applied through the REST API — the SQL is a record.
- `work/`: per file `<slug>.gt.json` (Gemini transcript segments), `<slug>.script.json` (the Gemini-TTS script that was synthesized: teacher tag dropped, announcer + news/persons voices) and `<slug>.meta.json` (old audio path + exercise ids).
- Tools: `../teil1-tools/` (t1-build, t1-build-persons, t1-run, t1-batch, t1-batch-persons, qa-gemini). Free tier = 10 TTS requests/day/model, so the batch stops on quota and resumes (batch-done.txt in the work dir).
