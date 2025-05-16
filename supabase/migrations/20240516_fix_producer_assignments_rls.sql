
-- Drop the existing policies if they are not working correctly
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.producer_assignments;

-- Ensure RLS is enabled
ALTER TABLE producer_assignments ENABLE ROW LEVEL SECURITY;

-- Create a more permissive policy for authenticated users
CREATE POLICY "Allow all operations for authenticated users" 
ON producer_assignments 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Make sure the skips table has proper permissions too
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.producer_assignment_skips;

-- Create a comprehensive policy for the skips table
CREATE POLICY "Allow all operations for authenticated users" 
ON producer_assignment_skips 
FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
