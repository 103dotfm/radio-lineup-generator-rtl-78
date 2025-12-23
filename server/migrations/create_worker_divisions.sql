-- Create worker_divisions table
CREATE TABLE IF NOT EXISTS worker_divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL,
    division_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_worker FOREIGN KEY(worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    CONSTRAINT fk_division FOREIGN KEY(division_id) REFERENCES divisions(id) ON DELETE CASCADE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_worker_divisions_worker_id ON worker_divisions(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_divisions_division_id ON worker_divisions(division_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_worker_divisions_updated_at
    BEFORE UPDATE ON worker_divisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 