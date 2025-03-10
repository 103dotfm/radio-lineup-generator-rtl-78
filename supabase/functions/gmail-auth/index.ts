
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Very important for browser requests - use explicit CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

interface OAuthRequest {
  code?: string;
  refreshToken?: string;
  redirectUri?: string;
  clientId?: string;
  clientSecret?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting gmail-auth function");
    
    // Parse request body
    const requestData: OAuthRequest = await req.json();
    console.log("Request data:", {
      hasCode: !!requestData.code,
      hasRefreshToken: !!requestData.refreshToken,
      hasRedirectUri: !!requestData.redirectUri,
      hasClientId: !!requestData.clientId,
      hasClientSecret: !!requestData.clientSecret?.substring(0, 3) + '...',
    });
    
    // Validate required fields
    if (!requestData.clientId || !requestData.clientSecret) {
      console.error("Missing client credentials");
      return new Response(
        JSON.stringify({ error: "Missing client credentials" }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
    // Handle two scenarios: initial auth with code or refresh token
    if (requestData.code) {
      // Exchange authorization code for tokens
      if (!requestData.redirectUri) {
        console.error("Missing redirect URI for code exchange");
        return new Response(
          JSON.stringify({ error: "Missing redirect URI" }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }
      
      console.log("Exchanging auth code for tokens");
      
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code: requestData.code,
          client_id: requestData.clientId,
          client_secret: requestData.clientSecret,
          redirect_uri: requestData.redirectUri,
          grant_type: "authorization_code",
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("Token exchange failed:", errorData);
        return new Response(
          JSON.stringify({ 
            error: "Failed to exchange authorization code for tokens",
            details: errorData
          }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }
      
      const tokenData = await tokenResponse.json();
      console.log("Token exchange successful");
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + tokenData.expires_in);
      
      return new Response(
        JSON.stringify({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiryDate: expiryDate.toISOString(),
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
        }),
        { 
          status: 200, 
          headers: corsHeaders 
        }
      );
    } else if (requestData.refreshToken) {
      // Refresh access token using refresh token
      console.log("Refreshing access token");
      
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          refresh_token: requestData.refreshToken,
          client_id: requestData.clientId,
          client_secret: requestData.clientSecret,
          grant_type: "refresh_token",
        }),
      });
      
      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.text();
        console.error("Token refresh failed:", errorData);
        return new Response(
          JSON.stringify({ 
            error: "Failed to refresh access token",
            details: errorData
          }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }
      
      const refreshData = await refreshResponse.json();
      console.log("Token refresh successful");
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + refreshData.expires_in);
      
      return new Response(
        JSON.stringify({
          accessToken: refreshData.access_token,
          expiryDate: expiryDate.toISOString(),
          tokenType: refreshData.token_type,
          scope: refreshData.scope,
        }),
        { 
          status: 200, 
          headers: corsHeaders 
        }
      );
    } else {
      console.error("Missing either code or refresh token");
      return new Response(
        JSON.stringify({ error: "Missing either authorization code or refresh token" }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
  } catch (error) {
    console.error("Unexpected error in gmail-auth function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Unexpected error in gmail-auth function",
        details: error.message || error 
      }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
