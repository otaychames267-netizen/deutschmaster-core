# Re-voicing a Hören exercise (2026-10-14: "Julia", "Herr Karimov", B2 Teil 2)

Why: the owner found the two voices poor. The words stay exactly as in the original audio; every speaker gets a new voice of the SAME gender.

Pipeline (all scripts expect to run from a working folder that has `../hoeren/orig/teil2/<name>.m4a` = the original audio, as downloaded by the scratchpad `hoeren-dl.mjs`):
1. `<name>.script.json` — the corrected text per turn (Whisper on the original + clip re-checks resolved the doubtful words), voice ids (DeepInfra cloned Qwen3-TTS voices from `muendlich-relay/src/voice/voices.config.ts`), gaps, optional `tempo` per voice (rubberband slow-down: Qwen is 15-20 % faster than the exam recordings), and `clip` items = music / ring / door-bell cut from the ORIGINAL.
2. `node revoice.mjs <name>` — synthesizes (cached per chunk), lays out the timeline, writes `<name>.new.pcm` + `<name>.timeline.json` (start/end of every chunk = a ready transcript).
3. `node encode.mjs <name> 64` — two-pass loudnorm to -18 LUFS, AAC mono 64 kbps -> `<name>.final.m4a`.
4. `node qa.mjs <name>` — Whisper re-transcription vs the script (word diff), pitch per voice, loudness.
5. Upload to bucket `hoeren-audio` (`voice2/teil2/<name>.m4a`), then `switch.sql` (rollback SQL in its header). The old `clean/…` and `teil2/…` files stay in the bucket.

Voices used: Julia = Lara (PF1, early 20s) / radio host = Thomas (M1) / announcer = Nadine (F1); Herr Karimov = interviewer Claudia (F2) + Wolfgang (M3, mid 50s).
Measured: Julia WER 1.2 % (the only multi-word gap was an ASR drop, the audio contains it), Karimov WER 0.3 %; pace = original (15.9 cps) after tempo 0.85-0.86.
