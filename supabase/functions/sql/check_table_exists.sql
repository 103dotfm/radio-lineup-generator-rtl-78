
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean AS $$
DECLARE
    exists_val BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = $1
    ) INTO exists_val;
    
    RETURN exists_val;
END;
$$ LANGUAGE plpgsql;
