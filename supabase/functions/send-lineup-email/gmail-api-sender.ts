
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
    
    const from = `"${emailSettings.sender_name}" <${emailSettings.sender_email}>`;
    // Use first recipient in To field
    const to = recipientEmails[0];
    // Use remaining recipients in BCC
    const bcc = recipientEmails.length > 1 ? recipientEmails.slice(1).join(", ") : "";
    
    // Add BCC header if needed
    const bccHeader = bcc ? `Bcc: ${bcc}\r\n` : "";
    console.log("Using BCC for multiple recipients to avoid duplicate emails");
    
    const emailLines = [
      `From: ${from}`,
      `To: ${to}`,
      bccHeader, // Add BCC header conditionally
      `Subject: =?UTF-8?B?${btoa(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      body
    ].filter(line => line !== ""); // Remove empty lines (in case BCC is empty)
    
    const email = emailLines.join('\r\n');
    
    // Use TextEncoder instead of Buffer for base64 encoding
    const encoder = new TextEncoder();
    const emailBytes = encoder.encode(email);
    const encodedEmail = btoa(String.fromCharCode(...new Uint8Array(emailBytes)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log("Sending email via Gmail API");
    
    try {
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });
      
      console.log("✅ Email sent successfully via Gmail API:", {
        messageId: res.data.id,
        threadId: res.data.threadId,
        labelIds: res.data.labelIds
      });
      
      return {
        messageId: res.data.id,
        success: true
      };
    } catch (sendError) {
      console.error("Error sending email via Gmail API:", sendError);
      
      // Detailed error logging
      if (sendError.response) {
        console.error("API Response Error:", {
          status: sendError.response.status,
          statusText: sendError.response.statusText,
          data: sendError.response.data
        });
      }
      
      throw new Error(`Failed to send email: ${sendError.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Error in Gmail API sender:", error);
    throw error;
  }
};
