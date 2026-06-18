DROP POLICY IF EXISTS "admin manage pdf imports" ON public.pdf_imports;
CREATE POLICY "admin manage pdf imports"
ON public.pdf_imports
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "pdf_extractions admin read" ON public.pdf_extractions;
CREATE POLICY "pdf_extractions admin read"
ON public.pdf_extractions
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "pdf_extractions super admin write" ON public.pdf_extractions;
CREATE POLICY "pdf_extractions super admin write"
ON public.pdf_extractions
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Admins read fidelity reports" ON public.pdf_fidelity_reports;
CREATE POLICY "Admins read fidelity reports"
ON public.pdf_fidelity_reports
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin writes fidelity reports" ON public.pdf_fidelity_reports;
CREATE POLICY "Super admin writes fidelity reports"
ON public.pdf_fidelity_reports
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS exercises_admin_all ON public.exercises;
CREATE POLICY exercises_admin_all
ON public.exercises
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "answer_keys admin read" ON public.exercise_answer_keys;
CREATE POLICY "answer_keys admin read"
ON public.exercise_answer_keys
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "answer_keys super admin write" ON public.exercise_answer_keys;
CREATE POLICY "answer_keys super admin write"
ON public.exercise_answer_keys
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'super_admin'::public.app_role));