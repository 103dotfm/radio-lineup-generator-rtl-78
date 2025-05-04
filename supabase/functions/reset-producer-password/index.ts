
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

    const { workerId } = await req.json();
    
    // Get the worker with user_id
    const { data: worker, error: workerError } = await supabaseClient
      .from('workers')
      .select('user_id')
      .eq('id', workerId)
      .single();
    
    if (workerError || !worker.user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'לא נמצא משתמש'
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }
    
    // Generate new password
    const newPassword = generateStrongPassword(12);
    
    // Update user password using admin API
    const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
      worker.user_id,
      { password: newPassword }
    );
    
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
    
    // Update worker record with new readable password
    await supabaseClient
      .from('workers')
      .update({ password_readable: newPassword })
      .eq('id', workerId);
    
    return new Response(
      JSON.stringify({
        success: true,
        password: newPassword
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
