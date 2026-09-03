-- Structured reference_code column for hoeren_exercises. Previously the
-- source lookup code for placeholder topics (Erdbeeren, Manche Deutsch,
-- Schlagminger, Neu Autobahn, Frankfurt) only existed as free text inside
-- import_notes — not queryable, not shown on the student-facing card. This
-- makes it a real column so it can be displayed on the placeholder UI and
-- verified directly, without re-parsing prose.
--
-- Nullable — only meaningful for topics an admin has explicitly tagged with
-- a source code; existing rows are untouched (default NULL).

alter table public.hoeren_exercises add column if not exists reference_code text;

update public.hoeren_exercises set reference_code = '125' where id = 'ec5857c1-3c4d-4c34-9842-df4e44d924e8'; -- Erdbeeren, Teil 1
update public.hoeren_exercises set reference_code = '125' where id = 'c39be752-8762-49f3-a1fb-e9af66380127'; -- Manche Deutsch, Teil 1
update public.hoeren_exercises set reference_code = '15'  where id = '23281ce1-7085-4dc3-be4b-fb42f18ff870'; -- Schlagminger, Teil 3
update public.hoeren_exercises set reference_code = '34'  where id = '3c527504-02ad-470a-8b80-fb31750fc861'; -- Neu Autobahn, Teil 3
update public.hoeren_exercises set reference_code = '135' where id = '8662ba78-92fa-4cd1-891f-aba9274f4ebd'; -- Frankfurt, Teil 3
