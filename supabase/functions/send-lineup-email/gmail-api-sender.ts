
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
    
    // Since we're dealing with Hebrew characters, we need to ensure proper UTF-8 encoding
    const encoder = new TextEncoder();
    
    // Properly encode the sender name and subject with UTF-8 support
    // Use Deno-compatible base64 encoding (no Buffer needed)
    const senderNameBytes = encoder.encode(emailSettings.sender_name);
    const encodedSenderName = btoa(String.fromCharCode(...senderNameBytes));
    
    const subjectBytes = encoder.encode(subject);
    const encodedSubject = btoa(String.fromCharCode(...subjectBytes));
    
    // Create simple MIME message with proper encoding
    const emailLines = [];
    
    // Add headers with proper encoding for UTF-8 content
    emailLines.push(`From: =?UTF-8?B?${encodedSenderName}?= <${emailSettings.sender_email}>`);
    emailLines.push(`To: ${rawTo}`);
    if (rawBcc) {
      emailLines.push(`Bcc: ${rawBcc}`);
    }
    emailLines.push(`Subject: =?UTF-8?B?${encodedSubject}?=`);
    emailLines.push('MIME-Version: 1.0');
    emailLines.push('Content-Type: text/html; charset=UTF-8');
    emailLines.push('Content-Transfer-Encoding: base64');
    emailLines.push('');
    
    // Properly encode the body for base64 with UTF-8 support
    const uint8Array = encoder.encode(body);
    
    // Convert the Uint8Array to a base64 string
    // Using Deno-compatible approach (no Buffer needed)
    const bodyChunks = [];
    for (let i = 0; i < uint8Array.length; i++) {
      bodyChunks.push(String.fromCharCode(uint8Array[i]));
    }
    const base64Body = btoa(bodyChunks.join(''));
    
    // Add the body as base64 encoded content (with proper line breaks)
    // Gmail API requires line breaks every 76 characters
    const bodyLines = [];
    for (let i = 0; i < base64Body.length; i += 76) {
      bodyLines.push(base64Body.substring(i, i + 76));
    }
    emailLines.push(bodyLines.join('\r\n'));
    
    // Join with proper CRLF
    const rawEmail = emailLines.join('\r\n');
    
    // Encode the raw email for the Gmail API using the same approach
    const uint8ArrayRaw = encoder.encode(rawEmail);
    const rawChunks = [];
    for (let i = 0; i < uint8ArrayRaw.length; i++) {
      rawChunks.push(String.fromCharCode(uint8ArrayRaw[i]));
    }
    const encodedEmail = btoa(rawChunks.join(''))
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
