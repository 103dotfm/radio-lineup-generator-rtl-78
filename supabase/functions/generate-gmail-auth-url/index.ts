
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
    const { clientId, redirectUri } = await req.json();

    if (!clientId || !redirectUri) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters: clientId and redirectUri are required" 
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    // Define Gmail API scopes
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose'
    ];

    // Generate OAuth 2.0 URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent'); // Force to show consent screen to get refresh_token

    console.log(`Generated auth URL for client ID: ${clientId}, redirect URI: ${redirectUri}`);

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString() 
      }),
      { 
        status: 200, 
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error('Error generating Gmail auth URL:', error);
    
    return new Response(
      JSON.stringify({ 
        error: `Failed to generate auth URL: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
