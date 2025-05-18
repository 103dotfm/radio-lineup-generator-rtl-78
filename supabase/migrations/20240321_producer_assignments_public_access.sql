-- Drop all existing policies first
DROP POLICY IF EXISTS "Enable public read access for producer assignments" ON producer_assignments;
DROP POLICY IF EXISTS "Enable public read access for producer assignment skips" ON producer_assignment_skips;
DROP POLICY IF EXISTS "Enable authenticated user access for producer assignments" ON producer_assignments;
DROP POLICY IF EXISTS "Enable authenticated user access for producer assignment skips" ON producer_assignment_skips;

-- Disable RLS temporarily to restore functionality
ALTER TABLE producer_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE producer_assignment_skips DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON producer_assignments TO anon, authenticated;
GRANT ALL ON producer_assignment_skips TO anon, authenticated;
GRANT ALL ON workers TO anon, authenticated;
GRANT ALL ON schedule_slots TO anon, authenticated;

-- Grant sequence usage
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated; 