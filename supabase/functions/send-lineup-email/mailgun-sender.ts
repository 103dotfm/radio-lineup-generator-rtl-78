
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
    
    // Determine if we should use EU domain based on provided API key or domain
    const isEuDomain = MAILGUN_DOMAIN.includes(".eu.") || 
                       MAILGUN_API_KEY.startsWith("key-eu") || 
                       emailSettings.is_eu_region === true;
    
    const mailgunBaseUrl = isEuDomain 
      ? "https://api.eu.mailgun.net/v3"
      : "https://api.mailgun.net/v3";
    
    console.log(`Using Mailgun ${isEuDomain ? 'EU' : 'US'} region. Base URL: ${mailgunBaseUrl}`);
    
    const authHeader = `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`;
    const mailgunUrl = `${mailgunBaseUrl}/${MAILGUN_DOMAIN}/messages`;
    
    console.log(`Using Mailgun domain: ${MAILGUN_DOMAIN}`);
    console.log(`Full Mailgun API endpoint: ${mailgunUrl}`);
    console.log("Sending to recipients:", recipientEmails.join(", "));
    
    const formData = new FormData();
    formData.append("from", `${emailSettings.sender_name} <${emailSettings.sender_email}>`);
    
    // Add recipients in a way that ensures they're properly added to the FormData
    for (const email of recipientEmails) {
      formData.append("to", email.trim());
    }
    
    formData.append("subject", subject);
    formData.append("html", body);
    
    // Log request payload for debugging (excluding sensitive info)
    console.log("Request payload:", { 
      url: mailgunUrl,
      from: `${emailSettings.sender_name} <${emailSettings.sender_email}>`,
      to: recipientEmails,
      subject: subject,
      formDataEntries: [...formData.entries()].map(([key, value]) => 
        typeof value === 'string' ? `${key}: ${value}` : `${key}: [FormData value]`
      )
    });
    
    try {
      console.log("Sending Mailgun API request...");
      
      const response = await fetch(mailgunUrl, {
        method: "POST",
        headers: {
          "Authorization": authHeader
        },
        body: formData
      });
      
      const responseStatus = response.status;
      let responseText = "";
      
      try {
        responseText = await response.text();
        console.log(`Mailgun API response status: ${responseStatus}`);
        console.log("Mailgun API response:", responseText);
      } catch (textError) {
        console.error("Error reading response text:", textError);
        responseText = "Could not read response text";
      }
      
      if (!response.ok) {
        let errorDetail;
        try {
          errorDetail = JSON.parse(responseText);
        } catch (e) {
          errorDetail = responseText;
        }
        
        const error = new Error(`Mailgun API error (${responseStatus}): ${JSON.stringify(errorDetail)}`);
        // @ts-ignore
        error.status = responseStatus;
        // @ts-ignore
        error.response = responseText;
        throw error;
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
    
    // Add more debug information
    const additionalInfo = `
      API Key present: ${!!Deno.env.get("MAILGUN_API_KEY")}
      Domain present: ${!!Deno.env.get("MAILGUN_DOMAIN")}
      Domain value: ${Deno.env.get("MAILGUN_DOMAIN") || '(not set)'}
    `;
    
    // Create more detailed error log
    const errorLog = createErrorLog("MAILGUN_SENDING", {
      ...error,
      message: error.message,
      additionalInfo: additionalInfo + "\nMake sure Mailgun API key and domain are correctly set in Supabase Edge Function secrets"
    });
    
    throw { ...error, errorLog };
  }
};
