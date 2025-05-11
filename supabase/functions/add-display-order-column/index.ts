
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if display_order column exists in producer_roles table
    const { data, error } = await supabaseAdmin
      .from('producer_roles')
      .select()
      .limit(1);

    // Try to execute SQL to check if the column exists
    const { data: columnInfo, error: columnError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'producer_roles')
      .eq('column_name', 'display_order');

    if (columnError) {
      throw columnError;
    }
    
    // If column doesn't exist (array is empty), add it
    if (!columnInfo || columnInfo.length === 0) {
      console.log("Adding display_order column to producer_roles table");
      
      // Add the column
      const { error: alterError } = await supabaseAdmin.rpc(
        'execute_sql',
        {
          sql_query: `ALTER TABLE public.producer_roles ADD COLUMN IF NOT EXISTS display_order integer;`
        }
      );
      
      if (alterError) {
        throw alterError;
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'display_order column added successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'display_order column already exists' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
