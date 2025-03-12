
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
      console.log("Request data:", {
        hasCode: !!requestData.code,
        hasRefreshToken: !!requestData.refreshToken,
        hasRedirectUri: !!requestData.redirectUri,
        hasClientId: !!requestData.clientId,
        hasClientSecret: !!requestData.clientSecret ? true : false,
      });
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request format",
          details: error.message
        }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
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
      
      console.log("Exchanging auth code for tokens with redirect URI:", requestData.redirectUri);
      
      try {
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
        
        const responseText = await tokenResponse.text();
        console.log("Token exchange response status:", tokenResponse.status);
        console.log("Token exchange response body:", responseText);
        
        if (!tokenResponse.ok) {
          return new Response(
            JSON.stringify({ 
              error: "Failed to exchange authorization code for tokens",
              details: responseText,
              status: tokenResponse.status
            }),
            { 
              status: 400, 
              headers: corsHeaders 
            }
          );
        }
        
        try {
          const tokenData = JSON.parse(responseText);
          console.log("Token exchange successful");
          
          if (!tokenData.refresh_token) {
            console.error("No refresh token in response. This might happen if you've authorized this app before.");
            return new Response(
              JSON.stringify({ 
                error: "No refresh token in response",
                message: "This might happen if you've authorized this app before. Try revoking access and trying again.",
                access_token: tokenData.access_token,
                expires_in: tokenData.expires_in,
                token_type: tokenData.token_type,
              }),
              { 
                status: 400, 
                headers: corsHeaders 
              }
            );
          }
          
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
        } catch (parseError) {
          console.error("Error parsing token data:", parseError);
          return new Response(
            JSON.stringify({ 
              error: "Failed to parse token response",
              details: parseError.message,
              rawResponse: responseText
            }),
            { 
              status: 500, 
              headers: corsHeaders 
            }
          );
        }
      } catch (error) {
        console.error("Error during token exchange:", error);
        return new Response(
          JSON.stringify({ 
            error: "Error during token exchange process",
            details: error.message || error
          }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }
    } else if (requestData.refreshToken) {
      // Refresh access token using refresh token
      console.log("Refreshing access token");
      
      try {
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
        
        const responseText = await refreshResponse.text();
        console.log("Token refresh response status:", refreshResponse.status);
        console.log("Token refresh response body:", responseText);
        
        if (!refreshResponse.ok) {
          return new Response(
            JSON.stringify({ 
              error: "Failed to refresh access token",
              details: responseText,
              status: refreshResponse.status
            }),
            { 
              status: 400, 
              headers: corsHeaders 
            }
          );
        }
        
        const refreshData = JSON.parse(responseText);
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
      } catch (error) {
        console.error("Error during token refresh:", error);
        return new Response(
          JSON.stringify({ 
            error: "Error during token refresh process",
            details: error.message || error
          }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }
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
