-- Critical Security Fixes Migration

-- 1. Fix users table privilege escalation
-- Add policy to prevent users from setting themselves as admin on INSERT
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;
CREATE POLICY "Users can insert their own data" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = id AND is_admin = false);

-- Add policy to prevent users from changing is_admin status on UPDATE
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
CREATE POLICY "Users can update their own data" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id AND (OLD.is_admin = NEW.is_admin OR OLD.is_admin = true));

-- 2. Lock down workers table to admin-only access (contains sensitive password data)
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.workers;
DROP POLICY IF EXISTS "Allow authenticated insert access" ON public.workers;
DROP POLICY IF EXISTS "Allow authenticated update access" ON public.workers;
DROP POLICY IF EXISTS "Allow authenticated delete access" ON public.workers;

CREATE POLICY "Only admins can read workers" 
ON public.workers 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Only admins can insert workers" 
ON public.workers 
FOR INSERT 
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update workers" 
ON public.workers 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Only admins can delete workers" 
ON public.workers 
FOR DELETE 
USING (is_admin());

-- 3. Lock down interviewees table (currently has public access)
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON public.interviewees;
DROP POLICY IF EXISTS "Enable all operations for interviewees" ON public.interviewees;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.interviewees;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.interviewees;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.interviewees;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.interviewees;
DROP POLICY IF EXISTS "Everyone can read interviewees" ON public.interviewees;
DROP POLICY IF EXISTS "Users can create interviewees" ON public.interviewees;
DROP POLICY IF EXISTS "Users can delete interviewees" ON public.interviewees;
DROP POLICY IF EXISTS "Users can view interviewees" ON public.interviewees;
DROP POLICY IF EXISTS "Authenticated users can delete interviewees" ON public.interviewees;
DROP POLICY IF EXISTS "Authenticated users can insert interviewees" ON public.interviewees;
DROP POLICY IF EXISTS "Authenticated users can update interviewees" ON public.interviewees;

CREATE POLICY "Authenticated users can read interviewees" 
ON public.interviewees 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert interviewees" 
ON public.interviewees 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update interviewees" 
ON public.interviewees 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete interviewees" 
ON public.interviewees 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- 4. Tighten RLS on operational tables - make writes admin-only
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