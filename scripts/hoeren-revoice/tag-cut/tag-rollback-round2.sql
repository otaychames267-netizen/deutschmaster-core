-- 2026-10-15 owner: cut the spoken teacher tag out of the Hören audio — ROUND 2. Found with an ASR-free acoustic fingerprint scan: 7 files that never had a transcript + the intro tag that the ASR pass missed in Hannover (hannover-zugteil.v2).
-- New objects only; previous objects stay in the bucket.
-- ROLLBACK
begin;
update public.hoeren_exercises set audio_path = 'clean/teil3/fuer-das-konzert-mit-romano.m4a' where audio_path = 'notag/teil3/fuer-das-konzert-mit-romano.m4a';
update public.hoeren_exercises set audio_path = 'clean/teil3/uckermark-birkenpollen.m4a' where audio_path = 'notag/teil3/uckermark-birkenpollen.m4a';
update public.hoeren_exercises set audio_path = 'clean/teil3/im-sueden-deutschlands-schnee.m4a' where audio_path = 'notag/teil3/im-sueden-deutschlands-schnee.m4a';
update public.hoeren_exercises set audio_path = 'clean/teil3/reitturniers.m4a' where audio_path = 'notag/teil3/reitturniers.m4a';
update public.hoeren_exercises set audio_path = 'clean/teil3/am-wochenanfang.m4a' where audio_path = 'notag/teil3/am-wochenanfang.m4a';
update public.hoeren_exercises set audio_path = 'clean/teil2/frau-eichhorn.m4a' where audio_path = 'notag/teil2/frau-eichhorn.m4a';
update public.hoeren_exercises set audio_path = 'clean/teil3/ehrenamts-original.m4a' where audio_path = 'notag/teil3/ehrenamts-original.m4a';
update public.hoeren_exercises set audio_path = 'notag/teil3/hannover-zugteil.m4a' where audio_path = 'notag/teil3/hannover-zugteil.v2.m4a';
commit;
