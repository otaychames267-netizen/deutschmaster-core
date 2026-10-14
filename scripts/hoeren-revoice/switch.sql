-- 2026-10-14 owner: "Julia" and "Herr Karimov" (B2 Hören Teil 2) voices were poor -> re-voiced from the same text (Qwen3-TTS German voices; male = male, female = female).
-- ROLLBACK (back to the denoised originals, files still in the bucket):
--   update public.hoeren_exercises set audio_path = 'clean/teil2/julia.m4a'       where id = '8a0fd249-a278-4d4f-9e56-ae44ffa6e6dd';
--   update public.hoeren_exercises set audio_path = 'clean/teil2/herrkarimov.m4a' where id = 'dc395130-8796-44ea-8720-bfdd2c45d101';
update public.hoeren_exercises set audio_path = 'voice2/teil2/julia.m4a'       where id = '8a0fd249-a278-4d4f-9e56-ae44ffa6e6dd' and audio_path = 'clean/teil2/julia.m4a';
update public.hoeren_exercises set audio_path = 'voice2/teil2/herrkarimov.m4a' where id = 'dc395130-8796-44ea-8720-bfdd2c45d101' and audio_path = 'clean/teil2/herrkarimov.m4a';
