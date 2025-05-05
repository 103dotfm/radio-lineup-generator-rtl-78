
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async (req) => {
  console.log("Reset password function called with method:", req.method);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(JSON.stringify({ success: true }), { 
      headers: corsHeaders,
      status: 200 
    });
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
    
    const { workerId } = body;
    
    if (!workerId) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required fields'
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // Get the worker to check if they have a user_id
    console.log("Fetching worker record for ID:", workerId);
    const { data: workerData, error: workerError } = await supabaseClient
      .from('workers')
      .select('user_id, email')
      .eq('id', workerId)
      .single();
    
    if (workerError || !workerData) {
      console.error("Error fetching worker record:", workerError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'לא נמצא מפיק עם המזהה הזה',
          error: workerError?.message
        }),
        { headers: corsHeaders, status: 404 }
      );
    }
    
    if (!workerData.user_id) {
      console.error("Worker has no associated user_id");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'למפיק אין משתמש מערכת מקושר'
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // Generate new password
    const newPassword = generateStrongPassword(12);
    console.log("Generated new password for user");
    
    // Reset the password
    console.log("Resetting password for user:", workerData.user_id);
    const { error: resetError } = await supabaseClient.auth.admin.updateUserById(
      workerData.user_id,
      { password: newPassword }
    );
    
    if (resetError) {
      console.error("Error resetting password:", resetError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'שגיאה באיפוס סיסמה',
          error: resetError.message 
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // Update the readable password in worker record
    console.log("Updating worker record with new password");
    const { error: updateError } = await supabaseClient
      .from('workers')
      .update({ password_readable: newPassword })
      .eq('id', workerId);
    
    if (updateError) {
      console.error("Error updating worker record:", updateError);
      // This is not a critical error, the password was reset but we couldn't save it
      // We can still return success with a warning
    }
    
    // Check and ensure user entry exists in the users table
    const { data: userExists, error: userCheckError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', workerData.user_id)
      .single();
      
    if (userCheckError || !userExists) {
      console.log("User entry not found in users table, creating one");
      // Create or update the users table entry
      await supabaseClient
        .from('users')
        .upsert({
          id: workerData.user_id,
          email: workerData.email,
          username: workerData.email,
          is_admin: false
        });
    }
    
    console.log("Successfully reset password for user");
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
