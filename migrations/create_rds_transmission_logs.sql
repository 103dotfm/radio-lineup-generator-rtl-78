-- Create RDS transmission logs table
CREATE TABLE IF NOT EXISTS rds_transmission_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transmission_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rds_data JSONB,
    success BOOLEAN NOT NULL,
    message TEXT,
    telnet_server TEXT NOT NULL,
    telnet_port INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on transmission_time for faster queries
CREATE INDEX IF NOT EXISTS idx_rds_transmission_logs_time 
ON rds_transmission_logs (transmission_time DESC);

-- Create index on success for filtering
CREATE INDEX IF NOT EXISTS idx_rds_transmission_logs_success 
ON rds_transmission_logs (success);
