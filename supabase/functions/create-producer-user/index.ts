
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { workerId, email } = await req.json();
    
    // Generate a random password
    const randomPassword = generateStrongPassword(12);
    
    // Create user with Supabase Auth using the admin API
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: randomPassword,
      email_confirm: true
    });
    
    if (authError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError, 
          message: authError.message 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }
    
    // Add user to regular users table
    const userId = authData.user.id;
    await supabaseClient.from('users').insert({
      id: userId,
      email: email,
      username: email.split('@')[0],
      full_name: (await supabaseClient.from('workers').select('name').eq('id', workerId).single()).data?.name,
      is_admin: false
    });
    
    // Update worker record with user_id
    const { error: updateError } = await supabaseClient
      .from('workers')
      .update({ 
        user_id: userId, 
        email: email,
        password_readable: randomPassword 
      })
      .eq('id', workerId);
    
    if (updateError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: updateError, 
          message: updateError.message 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        password: randomPassword
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

// Helper function to generate a strong random password
function generateStrongPassword(length: number): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}
