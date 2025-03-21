
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
  mailgun_api_key?: string;
  mailgun_domain?: string;
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
  } else if (settings.email_method === 'mailgun') {
    // Check for Mailgun settings in the database first
    if (!settings.mailgun_api_key && !Deno.env.get("MAILGUN_API_KEY")) {
      missingFields.push('mailgun_api_key');
    }
    if (!settings.mailgun_domain && !Deno.env.get("MAILGUN_DOMAIN")) {
      missingFields.push('mailgun_domain');
    }
  }
  
  return missingFields;
};

export const applyTimezoneOffset = (date: Date, offsetHours: number): Date => {
  // Create a new date to avoid modifying the input
  const newDate = new Date(date);
  
  // First ensure we're working with UTC time
  const year = newDate.getUTCFullYear();
  const month = newDate.getUTCMonth();
  const day = newDate.getUTCDate();
  const hours = newDate.getUTCHours();
  const minutes = newDate.getUTCMinutes();
  const seconds = newDate.getUTCSeconds();
  
  // Create a new UTC date
  const utcDate = new Date();
  utcDate.setUTCFullYear(year);
  utcDate.setUTCMonth(month);
  utcDate.setUTCDate(day);
  utcDate.setUTCHours(hours);
  utcDate.setUTCMinutes(minutes);
  utcDate.setUTCSeconds(seconds);
  
  // Apply Israel offset (UTC+3)
  const israelOffset = 3;
  utcDate.setUTCHours(utcDate.getUTCHours() + israelOffset);
  
  // Apply the additional user-defined timezone offset
  utcDate.setUTCHours(utcDate.getUTCHours() + offsetHours);
  
  console.log(`Original date: ${date.toISOString()}`);
  console.log(`With Israel offset (UTC+3): ${new Date(date.getTime() + israelOffset * 3600000).toISOString()}`);
  console.log(`With additional offset (${offsetHours}): ${utcDate.toISOString()}`);
  
  return utcDate;
};

export const generateLineupLink = (
  showId: string, 
  appDomain: string | null, 
  requestUrl: string,
  requestOrigin: string | null
): string => {
  // First log everything for debugging
  console.log(`Generating lineup link for show: ${showId}`);
  console.log(`App domain from settings: ${appDomain}`);
  console.log(`Request URL: ${requestUrl}`);
  console.log(`Request origin: ${requestOrigin}`);
  
  // Try to use app_domain from system settings first (with protocol check)
  if (appDomain) {
    // Ensure the domain has a protocol
    if (!appDomain.startsWith('http://') && !appDomain.startsWith('https://')) {
      appDomain = `https://${appDomain}`;
    }
    
    // Normalize the domain (remove trailing slashes)
    appDomain = appDomain.replace(/\/+$/, '');
    
    console.log(`Using app domain from settings: ${appDomain}`);
    return `${appDomain}/print/${showId}`;
  }
  
  // Fall back to request origin
  if (requestOrigin) {
    // Normalize the origin
    requestOrigin = requestOrigin.replace(/\/+$/, '');
    
    console.log(`Using request origin: ${requestOrigin}`);
    return `${requestOrigin}/print/${showId}`;
  }
  
  // Last resort: try to extract from the request URL
  try {
    const url = new URL(requestUrl);
    const origin = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
    
    console.log(`Extracted origin from request URL: ${origin}`);
    return `${origin}/print/${showId}`;
  } catch (error) {
    console.error("Failed to generate lineup link from request URL:", error);
    console.log(`Falling back to relative URL: /print/${showId}`);
    return `/print/${showId}`;
  }
};
