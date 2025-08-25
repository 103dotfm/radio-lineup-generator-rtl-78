-- Final security migration to enable RLS on remaining tables and secure edge functions

-- Enable RLS on the remaining tables that don't have it
ALTER TABLE public.work_arrangements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_assignment_skips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies on work_arrangements and replace with restrictive ones
DROP POLICY IF EXISTS "Allow public read access to work_arrangements" ON public.work_arrangements;
DROP POLICY IF EXISTS "Allow authenticated users to insert work_arrangements" ON public.work_arrangements;
DROP POLICY IF EXISTS "Allow authenticated users to update their work_arrangements" ON public.work_arrangements;

-- Secure work_arrangements policies
CREATE POLICY "Authenticated users can read work_arrangements" ON public.work_arrangements
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert work_arrangements" ON public.work_arrangements
FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update work_arrangements" ON public.work_arrangements
FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Only admins can delete work_arrangements" ON public.work_arrangements
FOR DELETE TO authenticated USING (public.is_admin());

-- Drop existing policies on producer_assignments and replace with proper ones
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.producer_assignments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.producer_assignments;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.producer_assignments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.producer_assignments;

-- Secure producer_assignments policies
CREATE POLICY "Authenticated users can read producer_assignments" ON public.producer_assignments
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert producer_assignments" ON public.producer_assignments
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update producer_assignments" ON public.producer_assignments
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete producer_assignments" ON public.producer_assignments
FOR DELETE TO authenticated USING (true);

-- Drop existing policies on producer_assignment_skips and replace with proper ones
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.producer_assignment_skips;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.producer_assignment_skips;

-- Secure producer_assignment_skips policies
CREATE POLICY "Authenticated users can read producer_assignment_skips" ON public.producer_assignment_skips
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert producer_assignment_skips" ON public.producer_assignment_skips
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update producer_assignment_skips" ON public.producer_assignment_skips
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete producer_assignment_skips" ON public.producer_assignment_skips
FOR DELETE TO authenticated USING (true);

-- Drop existing policies on profiles and replace with user-specific ones
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Secure profiles policies (users can only access their own profile)
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Drop existing policies on users and replace with user-specific ones
DROP POLICY IF EXISTS "Users can read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;

-- Secure users policies (users can only access their own data)
CREATE POLICY "Users can view their own data" ON public.users
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Also secure any missing tables that might have been created
DO $$
BEGIN
    -- Check for any other tables that might exist and need securing
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'api_keys') THEN
        ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Only admins can access api_keys" ON public.api_keys
        FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Only admins can access audit_logs" ON public.audit_logs
        FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    END IF;
END $$;