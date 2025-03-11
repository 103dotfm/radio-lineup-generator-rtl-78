
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
    let requestData: OAuthRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      console.error("Error parsing request JSON:", error);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: corsHeaders }
      );
    }
    
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
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Handle two scenarios: initial auth with code or refresh token
    if (requestData.code) {
      // Exchange authorization code for tokens
      if (!requestData.redirectUri) {
        console.error("Missing redirect URI for code exchange");
        return new Response(
          JSON.stringify({ error: "Missing redirect URI" }),
          { status: 400, headers: corsHeaders }
        );
      }
      
      console.log("Exchanging auth code for tokens");
      console.log("Redirect URI:", requestData.redirectUri);
      
      const tokenParams = new URLSearchParams({
        code: requestData.code,
        client_id: requestData.clientId,
        client_secret: requestData.clientSecret,
        redirect_uri: requestData.redirectUri,
        grant_type: "authorization_code",
      });
      
      console.log("Token request params (except code):", 
        tokenParams.toString().replace(/code=[^&]+/, 'code=REDACTED'));
      
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenParams,
      });
      
      const responseStatus = tokenResponse.status;
      let responseBody;
      
      try {
        responseBody = await tokenResponse.json();
        console.log("Token exchange response status:", responseStatus);
        // Print response keys without showing the actual tokens
        console.log("Response contains keys:", Object.keys(responseBody));
      } catch (error) {
        const responseText = await tokenResponse.text();
        console.error("Failed to parse token response as JSON:", responseText);
        return new Response(
          JSON.stringify({ 
            error: "Failed to parse token response", 
            details: responseText,
            status: responseStatus
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      
      if (!tokenResponse.ok) {
        console.error("Token exchange failed:", responseStatus, responseBody);
        return new Response(
          JSON.stringify({ 
            error: "Failed to exchange authorization code for tokens",
            details: responseBody,
            status: responseStatus
          }),
          { status: responseStatus, headers: corsHeaders }
        );
      }
      
      // Verify we have the expected tokens
      if (!responseBody.access_token) {
        console.error("No access token in response");
        return new Response(
          JSON.stringify({ 
            error: "No access token received from Google",
            details: Object.keys(responseBody)
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      
      console.log("Token exchange successful, response:", JSON.stringify({
        access_token: responseBody.access_token ? "REDACTED" : "MISSING",
        token_type: responseBody.token_type,
        expires_in: responseBody.expires_in,
        has_refresh_token: !!responseBody.refresh_token,
      }));
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + (responseBody.expires_in || 3600));
      
      return new Response(
        JSON.stringify({
          accessToken: responseBody.access_token,
          refreshToken: responseBody.refresh_token,
          expiryDate: expiryDate.toISOString(),
          tokenType: responseBody.token_type,
          scope: responseBody.scope,
        }),
        { status: 200, headers: corsHeaders }
      );
    } else if (requestData.refreshToken) {
      // Refresh access token using refresh token
      console.log("Refreshing access token");
      
      const refreshParams = new URLSearchParams({
        refresh_token: requestData.refreshToken,
        client_id: requestData.clientId,
        client_secret: requestData.clientSecret,
        grant_type: "refresh_token",
      });
      
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: refreshParams,
      });
      
      const refreshStatus = refreshResponse.status;
      let refreshData;
      
      try {
        refreshData = await refreshResponse.json();
        console.log("Refresh response status:", refreshStatus);
        console.log("Response contains keys:", Object.keys(refreshData));
      } catch (error) {
        const errorText = await refreshResponse.text();
        console.error("Failed to parse refresh response as JSON:", errorText);
        return new Response(
          JSON.stringify({ 
            error: "Failed to parse refresh token response", 
            details: errorText,
            status: refreshStatus
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      
      if (!refreshResponse.ok) {
        console.error("Token refresh failed:", refreshStatus, refreshData);
        return new Response(
          JSON.stringify({ 
            error: "Failed to refresh access token",
            details: refreshData,
            status: refreshStatus
          }),
          { status: refreshStatus, headers: corsHeaders }
        );
      }
      
      // Verify we have the expected tokens
      if (!refreshData.access_token) {
        console.error("No access token in refresh response");
        return new Response(
          JSON.stringify({ 
            error: "No access token received from Google during refresh",
            details: Object.keys(refreshData)
          }),
          { status: 400, headers: corsHeaders }
        );
      }
      
      console.log("Token refresh successful");
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setSeconds(expiryDate.getSeconds() + (refreshData.expires_in || 3600));
      
      return new Response(
        JSON.stringify({
          accessToken: refreshData.access_token,
          expiryDate: expiryDate.toISOString(),
          tokenType: refreshData.token_type,
          scope: refreshData.scope,
        }),
        { status: 200, headers: corsHeaders }
      );
    } else {
      console.error("Missing either code or refresh token");
      return new Response(
        JSON.stringify({ error: "Missing either authorization code or refresh token" }),
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Unexpected error in gmail-auth function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Unexpected error in gmail-auth function",
        details: error.message || String(error) 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
