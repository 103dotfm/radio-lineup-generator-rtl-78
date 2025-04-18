
import { google } from "npm:googleapis@129.0.0";
import { EmailSettings } from "./utils.ts";
import { createErrorLog } from "./error-handler.ts";

export const sendViaGmailApi = async (
  emailSettings: EmailSettings, 
  recipientEmails: string[], 
  subject: string, 
  body: string
): Promise<any> => {
  try {
    console.log("Setting up Gmail API client");
    
    const oauth2Client = new google.auth.OAuth2(
      emailSettings.gmail_client_id,
      emailSettings.gmail_client_secret,
      emailSettings.gmail_redirect_uri
    );
    
    let accessToken = emailSettings.gmail_access_token;
    const expiryDate = emailSettings.gmail_token_expiry ? new Date(emailSettings.gmail_token_expiry) : null;
    const now = new Date();
    
    // Check if token is expired or missing
    if (!accessToken || !expiryDate || expiryDate <= now) {
      if (!emailSettings.gmail_refresh_token) {
        throw new Error("No refresh token available. Please authenticate with Gmail again.");
      }
      
      console.log("Access token missing or expired, refreshing token");
      
      oauth2Client.setCredentials({
        refresh_token: emailSettings.gmail_refresh_token
      });
      
      try {
        const tokens = await oauth2Client.refreshAccessToken();
        accessToken = tokens.credentials.access_token;
        
        // Update stored token in database
        try {
          const { error } = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/email_settings`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": Deno.env.get("SUPABASE_ANON_KEY") || "",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
            },
            body: JSON.stringify({
              gmail_access_token: accessToken,
              gmail_token_expiry: new Date(tokens.credentials.expiry_date || (Date.now() + 3600 * 1000)).toISOString()
            })
          }).then(r => r.json());
          
          if (error) {
            console.warn("Failed to update access token in database:", error);
          }
        } catch (updateErr) {
          console.warn("Error updating token in database:", updateErr);
        }
        
        console.log("Token refreshed successfully");
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        throw new Error(`Failed to refresh access token: ${refreshError.message || 'Unknown error'}`);
      }
    }
    
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: emailSettings.gmail_refresh_token
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    console.log("Creating email message");
    
    // Build raw email content with proper encoding
    const rawTo = recipientEmails[0];
    // Add BCC if there are multiple recipients
    const rawBcc = recipientEmails.length > 1 ? recipientEmails.slice(1).join(',') : null;
    
    // Create MIME message with proper encoding for Hebrew text
    const emailLines = [];
    
    // Add headers with proper encoding
    emailLines.push(`Content-Type: text/html; charset=UTF-8`);
    emailLines.push(`MIME-Version: 1.0`);
    emailLines.push(`Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`);
    emailLines.push(`From: =?UTF-8?B?${btoa(unescape(encodeURIComponent(emailSettings.sender_name)))}?= <${emailSettings.sender_email}>`);
    emailLines.push(`To: ${rawTo}`);
    
    if (rawBcc) {
      emailLines.push(`Bcc: ${rawBcc}`);
    }
    
    emailLines.push(`Content-Transfer-Encoding: base64`);
    emailLines.push(``);
    
    // Properly encode the body for base64 with UTF-8 support
    // Convert the HTML string to a Uint8Array using TextEncoder
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(body);
    
    // Convert the Uint8Array to a base64 string
    // This avoids the btoa() Latin1 limitation
    const chunks = [];
    for (let i = 0; i < uint8Array.length; i += 3) {
      chunks.push(String.fromCharCode(
        uint8Array[i],
        uint8Array[i + 1] || 0,
        uint8Array[i + 2] || 0
      ));
    }
    const base64Body = btoa(chunks.join(''));
    
    // Add the body as base64 encoded content (with proper line breaks)
    // Gmail API requires line breaks every 76 characters
    const bodyLines = base64Body.match(/.{1,76}/g) || [];
    emailLines.push(bodyLines.join('\r\n'));
    
    // Join with proper CRLF
    const rawEmail = emailLines.join('\r\n');
    
    // Encode the raw email for the Gmail API
    // Use the same binary-to-base64 encoding approach
    const uint8ArrayRaw = encoder.encode(rawEmail);
    const chunksRaw = [];
    for (let i = 0; i < uint8ArrayRaw.length; i += 3) {
      chunksRaw.push(String.fromCharCode(
        uint8ArrayRaw[i],
        uint8ArrayRaw[i + 1] || 0,
        uint8ArrayRaw[i + 2] || 0
      ));
    }
    const encodedEmail = btoa(chunksRaw.join(''))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log("Sending email via Gmail API");
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });
    
    console.log("✅ Email sent successfully via Gmail API:", {
      messageId: response.data.id,
      threadId: response.data.threadId
    });
    
    return {
      success: true,
      method: 'gmail_api',
      messageId: response.data.id
    };
  } catch (error) {
    console.error("Error in Gmail API sender:", error);
    
    const errorLog = createErrorLog("GMAIL_API", error);
    throw { ...error, errorLog };
  }
};
