
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

// Create a Supabase client with the Auth context of the server
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

serve(async (req) => {
  try {
    // This endpoint requires an authenticated user
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify the user's JWT
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Only proceed if the user is authorized
    const { sql_query } = await req.json();

    if (!sql_query) {
      return new Response(
        JSON.stringify({ error: 'Missing SQL query' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Execute the SQL query
    console.log(`Executing SQL query: ${sql_query}`);
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: sql_query });

    if (error) {
      console.error('Error executing SQL:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Return the result
    return new Response(
      JSON.stringify({ data: data || [] }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
