-- Create producer_assignment_skips table if it doesn't exist
CREATE TABLE IF NOT EXISTS producer_assignment_skips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES producer_assignments(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(assignment_id, week_start)
);

-- Enable RLS
ALTER TABLE producer_assignment_skips ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Enable all access for authenticated users" 
ON producer_assignment_skips
TO authenticated 
USING (true)
WITH CHECK (true); 