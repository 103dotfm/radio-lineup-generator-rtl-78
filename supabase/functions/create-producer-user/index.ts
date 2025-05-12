
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

serve(async (req) => {
  console.log("Function called with method:", req.method);
  console.log("Request URL:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }
  
  try {
    console.log("Starting user creation process");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Server configuration error - missing environment variables'
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
    
    // Parse and validate request body
    let body;
    try {
      body = await req.json();
      console.log("Request body received:", body);
    } catch (error) {
      console.error("Error parsing request body:", error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid JSON in request body'
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // Validate required fields
    const { worker_id, email } = body;
    
    console.log("Validating required fields:", { worker_id, email });
    
    if (!worker_id) {
      console.error("Missing required field: worker_id");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required field: worker_id'
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    if (!email) {
      console.error("Missing required field: email");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required field: email'
        }),
        { headers: corsHeaders, status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid email format'
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
          message: 'Error checking existing users',
          error: existingUserError.message
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
    console.log("Retrieved users count:", existingUser?.users?.length || 0);
    const userExists = existingUser?.users?.some(user => user.email === email);
    
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
    
    // Fetch worker details to get the name and other info first
    console.log("Fetching worker details for ID:", worker_id);
    const { data: workerData, error: workerError } = await supabaseClient
      .from('workers')
      .select('name, position, department')
      .eq('id', worker_id)
      .single();
    
    if (workerError) {
      console.error("Error fetching worker details:", workerError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "שגיאה בקבלת פרטי המפיק",
          error: workerError.message
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
    
    if (!workerData) {
      console.error("Worker not found with ID:", worker_id);
      return new Response(
        JSON.stringify({
          success: false,
          message: "לא נמצאו פרטי מפיק"
        }),
        { headers: corsHeaders, status: 404 }
      );
    }
    
    console.log("Worker found:", workerData);
    
    // Generate new password
    const newPassword = generateStrongPassword(12);
    console.log("Generated password for new user");
    
    // Create the user using admin API
    console.log("Creating user with email:", email);
    try {
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
            message: error.message
          }),
          { headers: corsHeaders, status: 400 }
        );
      }
      
      if (!data.user) {
        console.error("User creation returned no user data");
        return new Response(
          JSON.stringify({
            success: false,
            message: "נכשל ביצירת משתמש - אין פרטי משתמש"
          }),
          { headers: corsHeaders, status: 500 }
        );
      }
      
      console.log("User created successfully with ID:", data.user.id);
      
      // Update worker record with user_id and password
      console.log("Updating worker record for ID:", worker_id);
      const { error: updateError } = await supabaseClient
        .from('workers')
        .update({ 
          user_id: data.user.id,
          password_readable: newPassword,
          email: email  // Ensure the email is stored in the worker record as well
        })
        .eq('id', worker_id);
      
      if (updateError) {
        console.error("Error updating worker record:", updateError);
        // We should handle this case by ensuring the user is properly deleted
        console.log("Attempting to delete the created user to maintain consistency");
        await supabaseClient.auth.admin.deleteUser(data.user.id);
        
        return new Response(
          JSON.stringify({
            success: false,
            message: "נוצר משתמש אך אירעה שגיאה בקישור למפיק",
            error: updateError.message
          }),
          { headers: corsHeaders, status: 500 }
        );
      }
      
      // Create an entry in the users table for the new user with producer info
      console.log("Creating users table entry for ID:", data.user.id);
      
      // Create the users table entry with worker name and position
      const { error: usersTableError } = await supabaseClient
        .from('users')
        .insert({
          id: data.user.id,
          email: email,
          full_name: workerData.name || email,
          username: `${workerData.name || ''} (${email})`,
          title: workerData.position || workerData.department || '',
          is_admin: false // producers are not admins by default
        });
      
      if (usersTableError) {
        console.error("Error creating users table entry:", usersTableError);
        console.log("User authentication created, but profile creation failed");
      }
      
      console.log("Successfully created user and updated worker record");
      return new Response(
        JSON.stringify({
          success: true,
          password: newPassword
        }),
        { headers: corsHeaders, status: 200 }
      );
    } catch (authError) {
      console.error("Error in auth.admin.createUser:", authError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "שגיאה ביצירת משתמש",
          error: authError.message
        }),
        { headers: corsHeaders, status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "שגיאה לא צפויה אירעה",
        error: error.message || "Unknown error"
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
