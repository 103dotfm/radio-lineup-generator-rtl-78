
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
    
    if (!accessToken || !expiryDate || expiryDate <= now) {
      console.log("Access token missing or expired, refreshing token");
      
      oauth2Client.setCredentials({
        refresh_token: emailSettings.gmail_refresh_token
      });
      
      const tokens = await oauth2Client.refreshAccessToken();
      accessToken = tokens.credentials.access_token;
      
      console.log("Token refreshed successfully");
    }
    
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: emailSettings.gmail_refresh_token
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    console.log("Creating email message");
    
    const from = `"${emailSettings.sender_name}" <${emailSettings.sender_email}>`;
    const to = recipientEmails.join(", ");
    
    const emailLines = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      body
    ];
    
    const email = emailLines.join('\r\n');
    
    const encodedEmail = Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log("Sending email via Gmail API");
    
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
  } catch (error) {
    console.error("Error sending email via Gmail API:", error);
    throw error;
  }
};
