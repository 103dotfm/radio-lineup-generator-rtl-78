-- Enable row level security
ALTER TABLE producer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE producer_assignment_skips ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to producer assignments
CREATE POLICY "Enable public read access for producer assignments"
ON producer_assignments FOR SELECT
TO public
USING (true);

-- Create policy for public read access to producer assignment skips
CREATE POLICY "Enable public read access for producer assignment skips"
ON producer_assignment_skips FOR SELECT
TO public
USING (true);

-- Grant SELECT permissions to public on necessary tables
GRANT SELECT ON producer_assignments TO anon;
GRANT SELECT ON producer_assignment_skips TO anon;
GRANT SELECT ON workers TO anon;
GRANT SELECT ON schedule_slots TO anon; 