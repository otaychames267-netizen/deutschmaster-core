-- Role-based access control for Mündlich Teil 2/3 "not yet introduced" topics.
-- Previously these were merely filtered out of the student UI while the same
-- single shared PDF (readable by any 'muendlich'-plan user) still contained
-- them at the end. That is a UI-only gate, not real RBAC: any subscribed user
-- could still fetch them if they knew/guessed the storage path.
--
-- This migration:
--   1. Adds muendlich_materials.admin_storage_path, a second PDF variant
--      (the full book incl. the unassigned/appendix section) alongside the
--      existing storage_path, which the generator scripts now redirect to
--      hold the student-facing, active-topics-only book.
--   2. Splits the muendlich-pdfs storage.objects SELECT policy so objects
--      stored under an '.../admin/...' path segment require the 'admin'
--      role (public.has_role), not just 'muendlich' plan access — closing
--      the storage-layer gap, since RLS policies are OR'd and a permissive
--      bucket-wide policy would otherwise still let any plan holder read an
--      admin object by path even if the UI never links to it.

alter table public.muendlich_materials
  add column if not exists admin_storage_path text;

comment on column public.muendlich_materials.admin_storage_path is
  'Teil-2/3 "redemittel" book rows only: storage path of the full PDF variant (all topics, including is_unassigned_center ones appended at the end) — admin-only, gated via storage.objects RLS on the /admin/ path segment. storage_path holds the student-facing active-topics-only variant.';

drop policy if exists "plan-gated read muendlich-pdfs" on storage.objects;
create policy "plan-gated read muendlich-pdfs" on storage.objects for select to authenticated
  using (
    bucket_id = 'muendlich-pdfs'
    and name not like '%/admin/%'
    and (public.has_plan_access(auth.uid(), 'muendlich') or public.is_d17_staff(auth.uid()))
  );

drop policy if exists "admin-only read muendlich-pdfs admin content" on storage.objects;
create policy "admin-only read muendlich-pdfs admin content" on storage.objects for select to authenticated
  using (
    bucket_id = 'muendlich-pdfs'
    and name like '%/admin/%'
    and public.has_role(auth.uid(), 'admin')
  );
