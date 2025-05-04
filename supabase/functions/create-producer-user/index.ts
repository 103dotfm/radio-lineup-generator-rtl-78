
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
    
    // Check if email already registered
    const { data: existingUser, error: existingUserError } = await supabaseClient.auth.admin.listUsers();
    const userExists = existingUser?.users.some(user => user.email === email);
    
    if (userExists) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'האימייל כבר רשום במערכת'
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }
    
    // Generate new password
    const newPassword = generateStrongPassword(12);
    
    // Create the user using admin API
    const { data, error } = await supabaseClient.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true
    });
    
    if (error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error, 
          message: error.message 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }
    
    // Update worker record with user_id and password
    const { error: updateError } = await supabaseClient
      .from('workers')
      .update({ 
        user_id: data.user.id,
        password_readable: newPassword,
        email: email  // Ensure the email is stored in the worker record as well
      })
      .eq('id', workerId);
    
    if (updateError) {
      console.error("Error updating worker record:", updateError);
      // User was created but worker record wasn't updated.
      // Consider handling this case, possibly by deleting the created user.
    }
    
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
