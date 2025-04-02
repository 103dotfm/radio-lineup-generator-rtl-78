
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
    
    // Sender name needs special encoding for non-Latin characters
    const senderName = mimeEncode(emailSettings.sender_name);
    const from = `${senderName} <${emailSettings.sender_email}>`;
    
    // Use first recipient in To field
    const to = recipientEmails[0];
    // Use remaining recipients in BCC
    const bcc = recipientEmails.length > 1 ? recipientEmails.slice(1).join(", ") : "";
    
    // Add BCC header if needed
    const bccHeader = bcc ? `Bcc: ${bcc}\r\n` : "";
    console.log("Using BCC for multiple recipients to avoid duplicate emails");
    
    // Properly encode subject with UTF-8 support
    const encodedSubject = mimeEncode(subject);
    
    // Debug logging 
    console.log("Sender:", { 
      raw: emailSettings.sender_name,
      encoded: senderName
    });
    console.log("Subject:", {
      raw: subject,
      encoded: encodedSubject
    });
    
    // Log a sample of the HTML body for debugging
    console.log("Email body sample (first 100 chars):", body.substring(0, 100));
    
    // Create raw RFC 2822 formatted email
    const message = [
      `From: ${from}`,
      `To: ${to}`,
      bccHeader ? `Bcc: ${bcc}` : '',
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      body
    ].filter(Boolean).join('\r\n');
    
    console.log("Preparing email with length:", message.length);
    console.log("Email headers sample:", message.substring(0, 200));
    
    // Base64Url encode the email for the Gmail API
    const base64EncodedEmail = btoa(
      new Uint8Array(new TextEncoder().encode(message))
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    console.log("Base64 encoded email length:", base64EncodedEmail.length);
    
    try {
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: base64EncodedEmail
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

// MIME encode text (for subject and sender name with UTF-8 support)
function mimeEncode(text: string): string {
  // Convert text to UTF-8 binary data
  const utf8Encoded = new TextEncoder().encode(text);
  const base64Encoded = btoa(
    Array.from(utf8Encoded)
      .map(byte => String.fromCharCode(byte))
      .join('')
  );
  return `=?UTF-8?B?${base64Encoded}?=`;
}
