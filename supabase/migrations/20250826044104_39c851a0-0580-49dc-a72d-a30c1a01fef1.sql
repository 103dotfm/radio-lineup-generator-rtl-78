-- Continue tightening RLS on operational tables - make writes admin-only

-- Digital work arrangements
DROP POLICY IF EXISTS "Authenticated users can insert digital_work_arrangements" ON public.digital_work_arrangements;
DROP POLICY IF EXISTS "Authenticated users can update digital_work_arrangements" ON public.digital_work_arrangements;
DROP POLICY IF EXISTS "Authenticated users can delete digital_work_arrangements" ON public.digital_work_arrangements;

CREATE POLICY "Only admins can insert digital_work_arrangements" 
ON public.digital_work_arrangements 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update digital_work_arrangements" 
ON public.digital_work_arrangements 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete digital_work_arrangements" 
ON public.digital_work_arrangements 
FOR DELETE 
USING (is_admin());

-- Digital shifts
DROP POLICY IF EXISTS "Authenticated users can insert digital_shifts" ON public.digital_shifts;
DROP POLICY IF EXISTS "Authenticated users can update digital_shifts" ON public.digital_shifts;
DROP POLICY IF EXISTS "Authenticated users can delete digital_shifts" ON public.digital_shifts;

CREATE POLICY "Only admins can insert digital_shifts" 
ON public.digital_shifts 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update digital_shifts" 
ON public.digital_shifts 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete digital_shifts" 
ON public.digital_shifts 
FOR DELETE 
USING (is_admin());

-- Digital shift custom rows
DROP POLICY IF EXISTS "Authenticated users can insert digital_shift_custom_rows" ON public.digital_shift_custom_rows;
DROP POLICY IF EXISTS "Authenticated users can update digital_shift_custom_rows" ON public.digital_shift_custom_rows;
DROP POLICY IF EXISTS "Authenticated users can delete digital_shift_custom_rows" ON public.digital_shift_custom_rows;

CREATE POLICY "Only admins can insert digital_shift_custom_rows" 
ON public.digital_shift_custom_rows 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update digital_shift_custom_rows" 
ON public.digital_shift_custom_rows 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete digital_shift_custom_rows" 
ON public.digital_shift_custom_rows 
FOR DELETE 
USING (is_admin());

-- Producer assignments
DROP POLICY IF EXISTS "Authenticated users can insert producer_assignments" ON public.producer_assignments;
DROP POLICY IF EXISTS "Authenticated users can update producer_assignments" ON public.producer_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete producer_assignments" ON public.producer_assignments;

CREATE POLICY "Only admins can insert producer_assignments" 
ON public.producer_assignments 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update producer_assignments" 
ON public.producer_assignments 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete producer_assignments" 
ON public.producer_assignments 
FOR DELETE 
USING (is_admin());

-- Producer work arrangements
DROP POLICY IF EXISTS "Authenticated users can insert producer_work_arrangements" ON public.producer_work_arrangements;
DROP POLICY IF EXISTS "Authenticated users can update producer_work_arrangements" ON public.producer_work_arrangements;
DROP POLICY IF EXISTS "Authenticated users can delete producer_work_arrangements" ON public.producer_work_arrangements;

CREATE POLICY "Only admins can insert producer_work_arrangements" 
ON public.producer_work_arrangements 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update producer_work_arrangements" 
ON public.producer_work_arrangements 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete producer_work_arrangements" 
ON public.producer_work_arrangements 
FOR DELETE 
USING (is_admin());

-- Producer assignment skips
DROP POLICY IF EXISTS "Authenticated users can insert producer_assignment_skips" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Authenticated users can update producer_assignment_skips" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Authenticated users can delete producer_assignment_skips" ON public.producer_assignment_skips;

CREATE POLICY "Only admins can insert producer_assignment_skips" 
ON public.producer_assignment_skips 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update producer_assignment_skips" 
ON public.producer_assignment_skips 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete producer_assignment_skips" 
ON public.producer_assignment_skips 
FOR DELETE 
USING (is_admin());

-- Worker divisions
DROP POLICY IF EXISTS "Authenticated users can insert worker_divisions" ON public.worker_divisions;
DROP POLICY IF EXISTS "Authenticated users can update worker_divisions" ON public.worker_divisions;
DROP POLICY IF EXISTS "Authenticated users can delete worker_divisions" ON public.worker_divisions;

CREATE POLICY "Only admins can insert worker_divisions" 
ON public.worker_divisions 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update worker_divisions" 
ON public.worker_divisions 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete worker_divisions" 
ON public.worker_divisions 
FOR DELETE 
USING (is_admin());