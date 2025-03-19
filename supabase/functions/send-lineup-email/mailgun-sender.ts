
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
      throw new Error("Missing Mailgun credentials. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN in environment variables.");
    }
    
    const authHeader = `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`;
    
    const formData = new FormData();
    formData.append("from", `${emailSettings.sender_name} <${emailSettings.sender_email}>`);
    recipientEmails.forEach(email => {
      formData.append("to", email);
    });
    formData.append("subject", subject);
    formData.append("html", body);
    
    const mailgunUrl = `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`;
    
    console.log(`Using Mailgun domain: ${MAILGUN_DOMAIN}`);
    console.log("Sending to:", recipientEmails.join(", "));
    
    const response = await fetch(mailgunUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mailgun API error:", errorText);
      throw new Error(`Mailgun API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    
    console.log("✅ Email sent successfully via Mailgun:", result);
    
    return {
      success: true,
      method: 'mailgun',
      messageId: result.id,
      response: JSON.stringify(result)
    };
  } catch (error) {
    console.error("Error in Mailgun sending:", error);
    const errorLog = createErrorLog("MAILGUN_SENDING", error);
    throw { ...error, errorLog };
  }
};
