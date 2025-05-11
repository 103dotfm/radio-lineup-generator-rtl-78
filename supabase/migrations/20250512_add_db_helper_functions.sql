
-- Add function to check if a column exists in a table
CREATE OR REPLACE FUNCTION public.column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
    );
END;
$$;

-- Add function to execute SQL safely (will be used by the execute_sql edge function)
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow specific SQL operations for safety
    IF query ILIKE 'SELECT%' OR 
       query ILIKE 'ALTER TABLE%ADD COLUMN%' OR
       query ILIKE 'UPDATE%' THEN
        RETURN (SELECT jsonb_agg(r) FROM (EXECUTE query) r);
    ELSE
        RAISE EXCEPTION 'Unauthorized SQL operation: %', query;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Ensure the display_order column exists in producer_roles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'producer_roles'
          AND column_name = 'display_order'
    ) THEN
        ALTER TABLE public.producer_roles ADD COLUMN display_order INTEGER DEFAULT 999;
    END IF;
END $$;
