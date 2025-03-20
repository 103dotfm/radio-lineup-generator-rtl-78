
import { EmailSettings } from "./utils.ts";
import { createErrorLog } from "./error-handler.ts";

export const sendViaMailgun = async (
  emailSettings: EmailSettings,
  recipientEmails: string[],
  subject: string,
  body: string
): Promise<any> => {
  try {
    console.log("Sending email via Mailgun API...");
    
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");
    
    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error("Missing Mailgun credentials:", {
        apiKeyPresent: !!MAILGUN_API_KEY,
        domainPresent: !!MAILGUN_DOMAIN
      });
      throw new Error("Missing Mailgun credentials. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN in environment variables.");
    }
    
    const authHeader = `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`;
    
    const formData = new FormData();
    formData.append("from", `${emailSettings.sender_name} <${emailSettings.sender_email}>`);
    
    // Add recipients in a way that ensures they're properly added to the FormData
    for (const email of recipientEmails) {
      formData.append("to", email.trim());
    }
    
    formData.append("subject", subject);
    formData.append("html", body);
    
    const mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
    
    console.log(`Using Mailgun domain: ${MAILGUN_DOMAIN}`);
    console.log("Sending to:", recipientEmails.join(", "));
    
    // Log request payload for debugging (excluding sensitive info)
    console.log("Request payload:", { 
      url: mailgunUrl,
      from: `${emailSettings.sender_name} <${emailSettings.sender_email}>`,
      to: recipientEmails,
      subject: subject
    });
    
    try {
      const response = await fetch(mailgunUrl, {
        method: "POST",
        headers: {
          "Authorization": authHeader
        },
        body: formData
      });
      
      const responseStatus = response.status;
      const responseText = await response.text();
      
      console.log(`Mailgun API response status: ${responseStatus}`);
      console.log("Mailgun API response:", responseText);
      
      if (!response.ok) {
        let errorDetail;
        try {
          errorDetail = JSON.parse(responseText);
        } catch (e) {
          errorDetail = responseText;
        }
        
        throw new Error(`Mailgun API error (${responseStatus}): ${JSON.stringify(errorDetail)}`);
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.warn("Could not parse Mailgun response as JSON:", responseText);
        result = { message: responseText };
      }
      
      console.log("✅ Email sent successfully via Mailgun:", result);
      
      return {
        success: true,
        method: 'mailgun',
        messageId: result.id || 'unknown',
        response: JSON.stringify(result)
      };
    } catch (fetchError) {
      console.error("Fetch error with Mailgun API:", fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error("Error in Mailgun sending:", error);
    
    // Create more detailed error log
    const errorLog = createErrorLog("MAILGUN_SENDING", {
      ...error,
      message: error.message,
      additionalInfo: "Make sure Mailgun API key and domain are correctly set in Supabase Edge Function secrets"
    });
    
    throw { ...error, errorLog };
  }
};
