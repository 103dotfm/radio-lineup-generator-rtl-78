export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

export interface EmailSettings {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
  subject_template: string;
  body_template: string;
  email_method: 'smtp' | 'gmail_api' | 'mailgun';
  gmail_client_id?: string;
  gmail_client_secret?: string;
  gmail_refresh_token?: string;
  gmail_redirect_uri?: string;
  gmail_access_token?: string;
  gmail_token_expiry?: string;
  is_eu_region?: boolean;
}

export interface ShowData {
  id: string;
  name: string;
  date: string;
  time: string;
  items: Array<{
    id: string;
    name: string;
    title?: string;
    is_break: boolean;
    is_note: boolean;
    is_divider: boolean;
    interviewees?: Array<{
      name: string;
      title?: string;
    }>;
  }>;
}

export const validateEmailSettings = (settings: EmailSettings): string[] => {
  const requiredFields = ['sender_email', 'sender_name'];
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!settings[field as keyof EmailSettings]) {
      missingFields.push(field);
    }
  }
  
  if (settings.email_method === 'smtp') {
    const smtpFields = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password'];
    for (const field of smtpFields) {
      if (!settings[field as keyof EmailSettings]) {
        missingFields.push(field);
      }
    }
  } else if (settings.email_method === 'gmail_api') {
    if (!settings.gmail_refresh_token) {
      missingFields.push('gmail_authentication');
    }
  }
  
  return missingFields;
};

export const applyTimezoneOffset = (date: Date, offsetHours: number): Date => {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + offsetHours);
  return newDate;
};

export const generateLineupLink = (
  showId: string, 
  appDomain: string | null, 
  requestUrl: string,
  requestOrigin: string | null
): string => {
  // Try to use app_domain from system settings first
  if (appDomain) {
    return `${appDomain}/print/${showId}`;
  }
  
  // Fall back to request origin
  if (requestOrigin) {
    return `${requestOrigin}/print/${showId}`;
  }
  
  // Last resort: try to extract from the request URL
  try {
    const url = new URL(requestUrl);
    const origin = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
    return `${origin}/print/${showId}`;
  } catch (error) {
    console.error("Failed to generate lineup link from request URL:", error);
    return `/print/${showId}`;
  }
};
