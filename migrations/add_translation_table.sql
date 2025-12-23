-- Add translation table for Hebrew to English mappings
CREATE TABLE IF NOT EXISTS translation_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hebrew_text TEXT NOT NULL,
    english_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hebrew_text)
);

-- Insert test data
INSERT INTO translation_mappings (hebrew_text, english_text) VALUES
    ('עם', 'with'),
    ('ענת דוידוב', 'Anat Davidov'),
    ('אודי סגל', 'Udi Segal')
ON CONFLICT (hebrew_text) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_translation_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_translation_mappings_updated_at
    BEFORE UPDATE ON translation_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_translation_mappings_updated_at();
