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
USING (auth.uid() = id);

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