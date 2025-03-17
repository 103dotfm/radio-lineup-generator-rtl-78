
import { format } from "https://deno.land/std@0.178.0/datetime/mod.ts";

export interface ShowData {
  id: string;
  name: string;
  date: string;
  time: string;
  items: any[];
}

export interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
  subject_template: string;
  body_template: string;
  email_method: 'smtp' | 'gmail_api';
  gmail_client_id: string;
  gmail_client_secret: string;
  gmail_refresh_token: string;
  gmail_redirect_uri: string;
  gmail_access_token?: string;
  gmail_token_expiry?: string;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

export const applyTimezoneOffset = (date: Date, offsetHours: number): Date => {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + offsetHours);
  console.log(`Applying timezone offset: ${offsetHours} hours to ${date.toISOString()}, result: ${newDate.toISOString()}`);
  return newDate;
};

export const generateLineupLink = (showId: string, appDomain: string | null, reqUrl: string, reqOrigin: string | null): string => {
  try {
    console.log(`Generating lineup link with params:`, {
      showId,
      appDomain: appDomain || 'null',
      reqUrl: reqUrl || 'null',
      reqOrigin: reqOrigin || 'null'
    });
    
    // Use the app domain setting if available
    if (appDomain && appDomain.trim() !== '') {
      // Ensure domain has protocol
      const protocol = appDomain.includes('localhost') ? 'http://' : 'https://';
      const fullDomain = appDomain.includes('://') ? appDomain : `${protocol}${appDomain}`;
      
      // Remove any trailing slashes for consistency
      const cleanDomain = fullDomain.replace(/\/+$/, '');
      
      const link = `${cleanDomain}/print/${showId}?minutes=false`;
      console.log("Generated lineup link using app domain:", link);
      return link;
    } else {
      console.log("No app domain found in settings, using fallback");
      
      // Fall back to request origin if it doesn't contain supabase.co or edge-runtime
      if (reqOrigin && 
          !reqOrigin.includes("supabase.co") && 
          !reqOrigin.includes("edge-runtime")) {
        const link = `${reqOrigin}/print/${showId}?minutes=false`;
        console.log("Generated lineup link using request origin:", link);
        return link;
      } 
      
      // Last resort fallback
      return `https://app.radioline.co.il/print/${showId}?minutes=false`;
    }
  } catch (urlError) {
    console.error("Error creating lineup link:", urlError);
    return `https://app.radioline.co.il/print/${showId}?minutes=false`;
  }
};

export const validateEmailSettings = (emailSettings: EmailSettings): string[] => {
  const missingSettings: string[] = [];
  
  if (emailSettings.email_method === 'gmail_api') {
    const requiredGmailSettings = [
      "gmail_client_id", "gmail_client_secret", "gmail_refresh_token", 
      "sender_email", "sender_name"
    ];
    
    return requiredGmailSettings.filter(key => !emailSettings[key as keyof EmailSettings]);
  } else {
    const requiredSmtpSettings = [
      "smtp_host", "smtp_port", "smtp_user", "smtp_password", 
      "sender_email", "sender_name"
    ];
    
    return requiredSmtpSettings.filter(key => !emailSettings[key as keyof EmailSettings]);
  }
};
