-- Drop existing policies if any
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON producer_roles;
DROP POLICY IF EXISTS "Enable insert for admin users" ON producer_roles;
DROP POLICY IF EXISTS "Enable update for admin users" ON producer_roles;
DROP POLICY IF EXISTS "Enable delete for admin users" ON producer_roles;

-- Enable RLS
ALTER TABLE producer_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all access for authenticated users" 
ON producer_roles
TO authenticated 
USING (true)
WITH CHECK (true); 