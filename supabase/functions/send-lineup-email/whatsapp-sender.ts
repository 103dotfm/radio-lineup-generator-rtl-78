
import { createErrorLog } from "./error-handler.ts";

export interface WhatsAppSettings {
  whatsapp_enabled: boolean;
  whatsapp_api_type: string; // 'twilio' or 'whatsapp_business'
  whatsapp_group_id: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  whatsapp_api_key?: string;
}

interface WhatsAppMessage {
  body: string;
  to: string;
}

export const sendViaWhatsApp = async (
  settings: WhatsAppSettings,
  message: string,
  showId: string
): Promise<{ success: boolean; messageId?: string; details?: string }> => {
  try {
    // Check if WhatsApp is enabled
    if (!settings.whatsapp_enabled) {
      return { success: false, details: "WhatsApp messaging is disabled in settings" };
    }

    console.log(`Sending WhatsApp message using ${settings.whatsapp_api_type} API`);
    
    // Determine which WhatsApp API to use
    if (settings.whatsapp_api_type === 'twilio') {
      return await sendViaTwilio(settings, message);
    } else if (settings.whatsapp_api_type === 'whatsapp_business') {
      return await sendViaWhatsAppBusiness(settings, message);
    } else {
      throw new Error(`Unsupported WhatsApp API type: ${settings.whatsapp_api_type}`);
    }
  } catch (error) {
    const errorLog = createErrorLog('WHATSAPP_SEND', error);
    console.error('WhatsApp sending error:', errorLog);
    throw { ...error, errorLog };
  }
};

const sendViaTwilio = async (
  settings: WhatsAppSettings,
  message: string
): Promise<{ success: boolean; messageId?: string; details?: string }> => {
  try {
    // Check for required Twilio settings
    const accountSid = settings.twilio_account_sid || Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = settings.twilio_auth_token || Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = settings.twilio_phone_number || Deno.env.get("TWILIO_PHONE_NUMBER");
    
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error("Missing Twilio configuration (account SID, auth token, or phone number)");
    }
    
    if (!settings.whatsapp_group_id) {
      throw new Error("Missing WhatsApp group ID or recipient number");
    }
    
    // Format the destination properly for Twilio WhatsApp
    const to = `whatsapp:${settings.whatsapp_group_id}`;
    const from = `whatsapp:${fromNumber}`;
    
    console.log(`Sending WhatsApp via Twilio from ${from} to ${to}`);
    
    // Create the request to Twilio API
    const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const encodedAuth = btoa(`${accountSid}:${authToken}`);
    
    const formData = new FormData();
    formData.append("To", to);
    formData.append("From", from);
    formData.append("Body", message);
    
    const response = await fetch(twilioEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encodedAuth}`,
      },
      body: formData,
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      const errorDetails = responseData?.message || responseData?.error_message || "Unknown Twilio error";
      throw new Error(`Twilio API error: ${errorDetails}`);
    }
    
    console.log("WhatsApp message sent successfully via Twilio:", responseData.sid);
    return { 
      success: true, 
      messageId: responseData.sid,
      details: "Message sent via Twilio WhatsApp"
    };
  } catch (error) {
    const errorLog = createErrorLog("TWILIO_WHATSAPP_SEND", error);
    console.error("Error sending WhatsApp via Twilio:", errorLog);
    throw { ...error, errorLog };
  }
};

const sendViaWhatsAppBusiness = async (
  settings: WhatsAppSettings,
  message: string
): Promise<{ success: boolean; messageId?: string; details?: string }> => {
  try {
    // Check for required WhatsApp Business API settings
    const apiKey = settings.whatsapp_api_key || Deno.env.get("WHATSAPP_API_KEY");
    
    if (!apiKey) {
      throw new Error("Missing WhatsApp Business API key");
    }
    
    if (!settings.whatsapp_group_id) {
      throw new Error("Missing WhatsApp phone number or group ID");
    }
    
    // This is a placeholder for WhatsApp Business API implementation
    // You would need to implement the specific API calls for your WhatsApp Business provider
    console.log("WhatsApp Business API implementation is a placeholder");
    console.log(`Would send message to ${settings.whatsapp_group_id}`);
    
    // This is where you'd make the actual API call to your WhatsApp Business API provider
    // For example, with a POST request similar to the Twilio implementation above
    
    return { 
      success: true, 
      messageId: `mock-${Date.now()}`,
      details: "Message sent via WhatsApp Business API (placeholder)"
    };
  } catch (error) {
    const errorLog = createErrorLog("WHATSAPP_BUSINESS_SEND", error);
    console.error("Error sending via WhatsApp Business API:", errorLog);
    throw { ...error, errorLog };
  }
};
