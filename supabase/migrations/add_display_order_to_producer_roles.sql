
-- Create a function to add display_order column if it doesn't exist
CREATE OR REPLACE FUNCTION public.add_display_order_to_producer_roles()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'producer_roles'
        AND column_name = 'display_order'
    ) THEN
        ALTER TABLE public.producer_roles
        ADD COLUMN display_order integer;
    END IF;
END;
$$;
