
-- Function to execute arbitrary SQL queries (for admin use only)
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with the permissions of the function creator
AS $$
BEGIN
    EXECUTE sql_query;
END;
$$;

-- Grant execute permissions to service_role only
REVOKE ALL ON FUNCTION execute_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role;
