-- 2026-10-14 owner: "Nadine" and "Steiner (modifiziert)" (B2 Hören Teil 2) re-voiced from the same text (Qwen3-TTS German voices; male = male, female = female).
-- ROLLBACK (back to the denoised originals, files still in the bucket):
--   update public.hoeren_exercises set audio_path = 'clean/teil2/nadine.m4a'  where id = '64c87ece-327e-4042-8833-1f10b62e6872';
--   update public.hoeren_exercises set audio_path = 'clean/teil2/steiner.m4a' where id = 'fc06d9e6-75fa-45c3-b604-5360e2c0d5d5';
update public.hoeren_exercises set audio_path = 'voice2/teil2/nadine.m4a'  where id = '64c87ece-327e-4042-8833-1f10b62e6872' and audio_path = 'clean/teil2/nadine.m4a';
update public.hoeren_exercises set audio_path = 'voice2/teil2/steiner.m4a' where id = 'fc06d9e6-75fa-45c3-b604-5360e2c0d5d5' and audio_path = 'clean/teil2/steiner.m4a';
