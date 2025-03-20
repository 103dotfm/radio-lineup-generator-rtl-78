import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  corsHeaders, 
  EmailSettings, 
  ShowData, 
  applyTimezoneOffset,
  generateLineupLink,
  validateEmailSettings
} from "./utils.ts";
import { createErrorLog } from "./error-handler.ts";
import { prepareEmailContent } from "./email-content.ts";
import { sendViaGmailApi } from "./gmail-api-sender.ts";
import { sendViaSmtp } from "./smtp-sender.ts";
import { sendViaMailgun } from "./mailgun-sender.ts";

async function handleRequest(req: Request) {
  try {
    console.log("Starting send-lineup-email function with URL:", req.url);
    console.log("Request method:", req.method);
    
    // Dump the environment variables (secure)
    console.log("Environment variables available:", {
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      SUPABASE_ANON_KEY: !!Deno.env.get("SUPABASE_ANON_KEY"),
      MAILGUN_API_KEY: !!Deno.env.get("MAILGUN_API_KEY"),
      MAILGUN_DOMAIN: !!Deno.env.get("MAILGUN_DOMAIN"),
    });
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing required environment variables:", {
        supabaseUrl: supabaseUrl ? "present" : "missing",
        supabaseAnonKey: supabaseAnonKey ? "present" : "missing"
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Server configuration error: Missing environment variables", 
          details: {
            stage: "ENVIRONMENT_CHECK",
            supabaseUrlPresent: !!supabaseUrl,
            supabaseAnonKeyPresent: !!supabaseAnonKey
          }
        }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }
    
    console.log("Environment variables:", {
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : "missing",
      supabaseAnonKey: supabaseAnonKey ? "present (not shown)" : "missing",
      mailgunApiKey: Deno.env.get("MAILGUN_API_KEY") ? "present (not shown)" : "missing",
      mailgunDomain: Deno.env.get("MAILGUN_DOMAIN") ? "present (not shown)" : "missing"
    });
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let requestData;
    
    try {
      const requestBody = await req.text();
      console.log("Raw request body:", requestBody);
      
      if (!requestBody || requestBody.trim() === '') {
        return new Response(
          JSON.stringify({ error: "Empty request body" }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }
      
      try {
        requestData = JSON.parse(requestBody);
      } catch (parseError) {
        const errorLog = createErrorLog("REQUEST_PARSING", parseError);
        console.error("Raw body:", requestBody);
        return new Response(
          JSON.stringify({ error: "Invalid JSON in request body", details: errorLog }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }
    } catch (bodyReadError) {
      const errorLog = createErrorLog("REQUEST_BODY_READING", bodyReadError);
      return new Response(
        JSON.stringify({ error: "Failed to read request body", details: errorLog }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }
    
    const { showId, testEmail } = requestData;
    
    if (!showId) {
      return new Response(
        JSON.stringify({ error: "Show ID is required" }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    console.log(`Processing request for show ${showId}, test email: ${testEmail || 'none'}`);

    // Get timezone offset from system settings
    let timezoneOffset = 0;
    try {
      const { data: offsetData, error: offsetError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "timezone_offset")
        .single();
        
      if (!offsetError && offsetData && offsetData.value) {
        timezoneOffset = parseInt(offsetData.value) || 0;
        console.log(`Timezone offset from system settings: ${timezoneOffset} hours`);
      }
    } catch (offsetError) {
      console.warn("Error fetching timezone offset, defaulting to 0:", offsetError);
    }

    // Get app domain from system settings
    let appDomain = null;
    try {
      const { data: domainData, error: domainError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "app_domain")
        .single();
        
      if (!domainError && domainData && domainData.value) {
        appDomain = domainData.value;
        console.log(`App domain from system settings: ${appDomain}`);
      }
    } catch (domainError) {
      console.warn("Error fetching app domain, will use request origin:", domainError);
    }

    // Fetch the show details
    try {
      console.log("Fetching show details...");
      const { data: show, error: showError } = await supabase
        .from("shows")
        .select(`
          id,
          name,
          date,
          time,
          items:show_items(
            id,
            name,
            title,
            is_break,
            is_note,
            is_divider,
            interviewees(name, title)
          )
        `)
        .eq("id", showId)
        .single();

      if (showError) {
        const errorLog = createErrorLog("FETCHING_SHOW", showError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch show", details: errorLog }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }

      if (!show) {
        return new Response(
          JSON.stringify({ error: "Show not found" }),
          { 
            status: 404, 
            headers: corsHeaders 
          }
        );
      }

      console.log(`Show found: ${show.name}, with ${show.items?.length || 0} items`);

      // Fetch email settings
      const { data: emailSettings, error: settingsError } = await supabase
        .from("email_settings")
        .select("*")
        .limit(1)
        .single();

      if (settingsError) {
        const errorLog = createErrorLog("FETCHING_EMAIL_SETTINGS", settingsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch email settings", details: errorLog }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }

      if (!emailSettings) {
        return new Response(
          JSON.stringify({ error: "Email settings not found" }),
          { 
            status: 404, 
            headers: corsHeaders 
          }
        );
      }

      console.log(`Email settings found with method: ${emailSettings.email_method || 'smtp'}`);
      console.log(`Sender: ${emailSettings.sender_name} <${emailSettings.sender_email}>`);

      // Validate email settings
      const missingSettings = validateEmailSettings(emailSettings as EmailSettings);
      
      if (missingSettings.length > 0) {
        const errorMessage = `Missing required email settings: ${missingSettings.join(", ")}`;
        console.error(errorMessage);
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: { missingSettings }
          }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }

      // Get recipient emails
      let recipientEmails: string[] = [];
      if (testEmail) {
        recipientEmails = [testEmail];
        console.log(`Using test email: ${testEmail}`);
      } else {
        try {
          console.log("Fetching email recipients...");
          const { data: recipients, error: recipientsError } = await supabase
            .from("email_recipients")
            .select("email");

          if (recipientsError) {
            const errorLog = createErrorLog("FETCHING_RECIPIENTS", recipientsError);
            return new Response(
              JSON.stringify({ error: "Failed to fetch recipients", details: errorLog }),
              { 
                status: 500, 
                headers: corsHeaders 
              }
            );
          }
          
          recipientEmails = recipients.map(r => r.email);
          console.log(`Found ${recipientEmails.length} recipients`);
        } catch (recipientsError) {
          const errorLog = createErrorLog("PROCESSING_RECIPIENTS", recipientsError);
          return new Response(
            JSON.stringify({ error: "Error processing recipients", details: errorLog }),
            { 
              status: 500, 
              headers: corsHeaders 
            }
          );
        }
      }

      if (recipientEmails.length === 0) {
        return new Response(
          JSON.stringify({ error: "No recipient emails found" }),
          { 
            status: 400, 
            headers: corsHeaders 
          }
        );
      }

      console.log(`Recipients: ${recipientEmails.join(', ')}`);

      // Format the date with timezone offset
      console.log("Preparing email content...");
      let formattedDate = "";
      try {
        if (show.date) {
          const showDate = new Date(show.date);
          const adjustedDate = applyTimezoneOffset(showDate, timezoneOffset);
          formattedDate = adjustedDate.toLocaleDateString('he-IL');
          console.log(`Raw date: ${show.date}, Adjusted date with offset ${timezoneOffset}: ${adjustedDate.toISOString()}, Formatted date: ${formattedDate}`);
        }
      } catch (dateError) {
        console.error("Error formatting date:", dateError);
        formattedDate = show.date || "";
      }

      // Generate lineup link
      const lineupLink = generateLineupLink(show.id, appDomain, req.url, req.headers.get("origin"));
      
      // Prepare email content
      const { subject, body } = prepareEmailContent(
        show as ShowData, 
        formattedDate, 
        lineupLink, 
        emailSettings
      );

      console.log(`Email prepared - Subject: ${subject}`);
      console.log(`Using email method: ${emailSettings.email_method}`);
      
      // Send email based on method
      if (emailSettings.email_method === 'mailgun') {
        try {
          console.log("Sending email via Mailgun...");
          
          // Double check that Mailgun secrets are set
          const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
          const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");
          
          if (!mailgunApiKey || !mailgunDomain) {
            const missingSecrets = [];
            if (!mailgunApiKey) missingSecrets.push("MAILGUN_API_KEY");
            if (!mailgunDomain) missingSecrets.push("MAILGUN_DOMAIN");
            
            const errorLog = createErrorLog("MAILGUN_SECRETS_CHECK", {
              message: `Missing Mailgun secrets: ${missingSecrets.join(", ")}`,
              code: "MISSING_SECRETS"
            });
            
            return new Response(
              JSON.stringify({ 
                error: "Missing Mailgun configuration", 
                details: errorLog,
                missingSecrets
              }),
              { 
                status: 500, 
                headers: corsHeaders 
              }
            );
          }
          
          // Log more details about the Mailgun configuration
          console.log("Mailgun configuration:", {
            domain: mailgunDomain,
            apiKeyLength: mailgunApiKey ? mailgunApiKey.length : 0,
            isEuRegion: emailSettings.is_eu_region || false
          });
          
          const result = await sendViaMailgun(
            emailSettings as EmailSettings,
            recipientEmails,
            subject,
            body
          );
          
          if (!testEmail) {
            const { error: logError } = await supabase
              .from("show_email_logs")
              .upsert({
                show_id: show.id,
                success: true,
                error_message: null
              });
              
            if (logError) {
              console.error("Error logging email success:", logError);
            }
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              method: 'mailgun',
              ...result
            }),
            { 
              status: 200, 
              headers: corsHeaders 
            }
          );
        } catch (mailgunError) {
          console.error("Mailgun error (caught at top level):", mailgunError);
          const errorLog = mailgunError.errorLog || createErrorLog("MAILGUN_SEND", mailgunError);
          
          if (!testEmail) {
            const { error: logError } = await supabase
              .from("show_email_logs")
              .upsert({
                show_id: show.id,
                success: false,
                error_message: errorLog.message
              });
              
            if (logError) {
              console.error("Error logging email failure:", logError);
            }
          }
          
          return new Response(
            JSON.stringify({ error: `Failed to send email via Mailgun`, details: errorLog }),
            { 
              status: 500, 
              headers: corsHeaders 
            }
          );
        }
      } else if (emailSettings.email_method === 'gmail_api') {
        try {
          console.log("Sending email via Gmail API...");
          
          const result = await sendViaGmailApi(
            emailSettings as EmailSettings,
            recipientEmails,
            subject,
            body
          );
          
          if (!testEmail) {
            const { error: logError } = await supabase
              .from("show_email_logs")
              .upsert({
                show_id: show.id,
                success: true,
                error_message: null
              });
              
            if (logError) {
              console.error("Error logging email success:", logError);
            }
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              method: 'gmail_api',
              ...result
            }),
            { 
              status: 200, 
              headers: corsHeaders 
            }
          );
        } catch (gmailError) {
          const errorLog = createErrorLog("GMAIL_API_SEND", gmailError);
          
          if (!testEmail) {
            const { error: logError } = await supabase
              .from("show_email_logs")
              .upsert({
                show_id: show.id,
                success: false,
                error_message: errorLog.message
              });
              
            if (logError) {
              console.error("Error logging email failure:", logError);
            }
          }
          
          return new Response(
            JSON.stringify({ error: `Failed to send email via Gmail API`, details: errorLog }),
            { 
              status: 500, 
              headers: corsHeaders 
            }
          );
        }
      } else {
        try {
          const result = await sendViaSmtp(
            emailSettings as EmailSettings,
            recipientEmails,
            subject,
            body
          );

          if (!testEmail) {
            const { error: logError } = await supabase
              .from("show_email_logs")
              .upsert({
                show_id: show.id,
                success: true,
                error_message: null
              });
              
            if (logError) {
              console.error("Error logging email success:", logError);
            }
          }

          return new Response(
            JSON.stringify(result),
            { 
              status: 200, 
              headers: corsHeaders 
            }
          );
        } catch (smtpError) {
          console.error("SMTP error (caught at top level):", smtpError);
          const errorLog = smtpError.errorLog || createErrorLog("SMTP_ERROR", smtpError);
          
          if (!testEmail) {
            const { error: logError } = await supabase
              .from("show_email_logs")
              .upsert({
                show_id: show.id,
                success: false,
                error_message: errorLog.message
              });
              
            if (logError) {
              console.error("Error logging email failure:", logError);
            }
          }

          return new Response(
            JSON.stringify({ error: `Failed to send email`, details: errorLog }),
            { 
              status: 500, 
              headers: corsHeaders 
            }
          );
        }
      }
    } catch (showProcessingError) {
      const errorLog = createErrorLog("PROCESSING_SHOW", showProcessingError);
      return new Response(
        JSON.stringify({ error: `Error processing show data`, details: errorLog }),
        { 
          status: 500, 
          headers: corsHeaders 
        }
      );
    }
  } catch (error) {
    console.error("General error in send-lineup-email function:", error);
    const errorLog = createErrorLog("GENERAL", error);
    return new Response(
      JSON.stringify({ error: `Unexpected error in send-lineup-email function`, details: errorLog }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  return handleRequest(req);
});
