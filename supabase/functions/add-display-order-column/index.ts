
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

serve(async (req) => {
  // Create a Supabase client with the service role key
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Check if display_order column exists in producer_roles table
    const { data: columnExists, error: checkError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'producer_roles')
      .eq('column_name', 'display_order')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // If column doesn't exist, add it
    if (!columnExists) {
      // Execute SQL to add the column
      const { error: alterError } = await supabaseAdmin.rpc('add_display_order_to_producer_roles');
      
      if (alterError) {
        throw alterError;
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'display_order column added successfully' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'display_order column already exists' }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
