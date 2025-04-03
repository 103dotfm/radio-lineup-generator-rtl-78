
import { createErrorLog } from "./error-handler.ts";
import { EmailSettings } from "./utils.ts";

export const sendViaMailgun = async (
  emailSettings: EmailSettings,
  recipientEmails: string[],
  subject: string,
  body: string
): Promise<any> => {
  try {
    // Determine the appropriate Mailgun API URL based on region
    const isEuRegion = emailSettings.is_eu_region || false;
    const mailgunApiBase = isEuRegion ? "https://api.eu.mailgun.net/v3" : "https://api.mailgun.net/v3";
    
    // First try to get API key and domain from environment variables (for backward compatibility)
    let apiKey = Deno.env.get("MAILGUN_API_KEY");
    let domain = Deno.env.get("MAILGUN_DOMAIN");
    
    // Then check if API key and domain are in emailSettings (preferred method)
    if (emailSettings.mailgun_api_key) {
      apiKey = emailSettings.mailgun_api_key;
      console.log("Using Mailgun API key from database settings");
    }
    
    if (emailSettings.mailgun_domain) {
      domain = emailSettings.mailgun_domain;
      console.log("Using Mailgun domain from database settings");
    }
    
    // Validate required parameters
    if (!apiKey) {
      throw new Error("Mailgun API key is required");
    }
    
    if (!domain) {
      throw new Error("Mailgun domain is required");
    }
    
    console.log(`Sending email via Mailgun (${isEuRegion ? 'EU' : 'US'} region) to domain: ${domain}`);
    console.log(`From: ${emailSettings.sender_name} <${emailSettings.sender_email}>`);
    console.log(`To: ${recipientEmails.join(", ")}`);
    console.log(`Subject: ${subject}`);
    
    // Prepare headers for basic authentication
    const headers = new Headers({
      "Authorization": `Basic ${btoa(`api:${apiKey}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    });
    
    // Create form data for the request - FIX: Use BCC instead of multiple TO recipients
    const formData = new URLSearchParams();
    
    // Properly format the "from" field for better compatibility with Hebrew sender names
    // Use Deno-compatible encoding for Hebrew sender name
    const encoder = new TextEncoder();
    const senderNameBytes = encoder.encode(emailSettings.sender_name);
    const encodedSenderName = btoa(String.fromCharCode(...senderNameBytes));
    formData.append("from", `=?UTF-8?B?${encodedSenderName}?= <${emailSettings.sender_email}>`);
    
    // Use the first recipient as the "to" field and the rest as BCC
    if (recipientEmails.length > 0) {
      formData.append("to", recipientEmails[0]);
      
      // Add remaining recipients as BCC to prevent multiple emails
      if (recipientEmails.length > 1) {
        formData.append("bcc", recipientEmails.slice(1).join(","));
      }
    }
    
    // Encode the subject for Mailgun API
    formData.append("subject", subject);
    formData.append("html", body);
    
    // Log the request URL
    const requestUrl = `${mailgunApiBase}/${domain}/messages`;
    console.log(`Making Mailgun API request to: ${requestUrl}`);
    console.log("Using BCC for multiple recipients to avoid duplicate emails");
    
    // Make the request
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: headers,
      body: formData,
    });
    
    // Parse the response
    let responseData;
    try {
      responseData = await response.json();
    } catch (error) {
      // If response isn't JSON, get text instead
      responseData = { text: await response.text() };
    }
    
    // Log response status and data
    console.log(`Mailgun API response status: ${response.status}`);
    console.log("Mailgun API response data:", responseData);
    
    // Check if the request was successful
    if (!response.ok) {
      const errorMessage = responseData.message || `Mailgun API returned status ${response.status}`;
      throw {
        message: errorMessage,
        status: response.status,
        response: responseData
      };
    }
    
    return {
      success: true,
      method: 'mailgun',
      messageId: responseData.id,
      response: JSON.stringify(responseData)
    };
  } catch (error) {
    console.error("Error in Mailgun sending (full):", error);
    
    // Generate detailed error log
    const errorLog = createErrorLog("MAILGUN_SENDING", error);
    
    // Add additional error context
    if (error.response) {
      errorLog.response = typeof error.response === 'string' 
        ? error.response 
        : JSON.stringify(error.response);
    }
    
    throw { ...error, errorLog };
  }
};
