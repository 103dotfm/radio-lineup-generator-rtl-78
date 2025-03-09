
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Very important for browser requests - use explicit CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

// Handle CORS preflight requests
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, clientId, clientSecret, redirectUri } = await req.json();

    if (!code || !clientId || !clientSecret || !redirectUri) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters" 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    console.log(`Exchanging OAuth code for tokens. Client ID: ${clientId}, redirect URI: ${redirectUri}`);
    
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Token exchange error:', tokenData);
      return new Response(
        JSON.stringify({ 
          error: `Failed to exchange code: ${tokenData.error_description || tokenData.error}` 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    console.log('Successfully exchanged code for tokens');
    
    // Return only what's needed by the frontend
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
      }),
      { 
        status: 200, 
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error('Error exchanging OAuth code:', error);
    
    return new Response(
      JSON.stringify({ 
        error: `Failed to exchange code: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
