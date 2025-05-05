
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async (req) => {
  console.log("Function called with method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Server configuration error'
        }),
        { headers: corsHeaders, status: 500 }
      );
    }

    console.log("Creating Supabase client");
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      { auth: { persistSession: false } }
    );
    
    // Parse request body
    let body;
    try {
      body = await req.json();
      console.log("Request body parsed:", body);
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid request body'
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    const { workerId, email } = body;
    
    if (!workerId || !email) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required fields'
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    console.log("Checking for existing user with email:", email);
    // Check if email already registered
    const { data: existingUser, error: existingUserError } = await supabaseClient.auth.admin.listUsers();
    
    if (existingUserError) {
      console.error("Error listing users:", existingUserError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Error checking existing users'
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
    const userExists = existingUser?.users.some(user => user.email === email);
    
    if (userExists) {
      console.log("Email already registered:", email);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'האימייל כבר רשום במערכת'
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // Generate new password
    const newPassword = generateStrongPassword(12);
    console.log("Generated password for new user");
    
    // Create the user using admin API
    console.log("Creating user with email:", email);
    const { data, error } = await supabaseClient.auth.admin.createUser({
      email,
      password: newPassword,
      email_confirm: true
    });
    
    if (error) {
      console.error("Error creating user:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message, 
          message: error.message 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // Update worker record with user_id and password
    console.log("Updating worker record for ID:", workerId);
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
      // We should handle this case by sending a useful response
      return new Response(
        JSON.stringify({
          success: true,
          password: newPassword,
          warning: "User created but worker record not updated"
        }),
        { headers: corsHeaders, status: 207 } // Partial success
      );
    }
    
    console.log("Successfully created user and updated worker record");
    return new Response(
      JSON.stringify({
        success: true,
        password: newPassword
      }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error",
        message: "שגיאה לא צפויה אירעה"
      }),
      { headers: corsHeaders, status: 500 }
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
