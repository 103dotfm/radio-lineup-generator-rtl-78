
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
import { sendViaWhatsApp, WhatsAppSettings } from "./whatsapp-sender.ts";

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
      TWILIO_ACCOUNT_SID: !!Deno.env.get("TWILIO_ACCOUNT_SID"),
      TWILIO_AUTH_TOKEN: !!Deno.env.get("TWILIO_AUTH_TOKEN"),
      TWILIO_PHONE_NUMBER: !!Deno.env.get("TWILIO_PHONE_NUMBER"),
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
      mailgunDomain: Deno.env.get("MAILGUN_DOMAIN") ? "present (not shown)" : "missing",
      twilioAccountSid: Deno.env.get("TWILIO_ACCOUNT_SID") ? "present (not shown)" : "missing",
      twilioAuthToken: Deno.env.get("TWILIO_AUTH_TOKEN") ? "present (not shown)" : "missing",
      twilioPhoneNumber: Deno.env.get("TWILIO_PHONE_NUMBER") ? "present (not shown)" : "missing",
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
    
    const { showId, testEmail, skipEmail, skipWhatsApp } = requestData;
    
    if (!showId) {
      return new Response(
        JSON.stringify({ error: "Show ID is required" }),
        { 
          status: 400, 
          headers: corsHeaders 
        }
      );
    }

    console.log(`Processing request for show ${showId}, test email: ${testEmail || 'none'}, skipEmail: ${skipEmail}, skipWhatsApp: ${skipWhatsApp}`);

    // Get timezone offset from system settings
    let timezoneOffset = 0;
    try {
      const { data: offsetData, error: offsetError } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "timezone_offset")
        .maybeSingle();
        
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
        .maybeSingle();
        
      if (!domainError && domainData && domainData.value) {
        appDomain = domainData.value;
        console.log(`App domain from system settings: ${appDomain}`);
      }
    } catch (domainError) {
      console.warn("Error fetching app domain, will use request origin:", domainError);
    }

    // Fetch the show details - Separate queries for shows and related items
    try {
      console.log("Fetching show details...");
      
      // First, fetch the show details - ALWAYS use shows_backup
      const { data: show, error: showError } = await supabase
        .from("shows_backup")
        .select("id, name, date, time")
        .eq("id", showId)
        .maybeSingle();

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
        console.error(`Show not found with ID: ${showId}`);
        return new Response(
          JSON.stringify({ 
            error: "Show not found", 
            details: { showId }
          }),
          { 
            status: 404, 
            headers: corsHeaders 
          }
        );
      }
      
      console.log("Retrieved show:", show);
      
      // Then, fetch the show items separately
      const { data: items, error: itemsError } = await supabase
        .from("show_items")
        .select(`
          id,
          name,
          title,
          is_break,
          is_note,
          is_divider,
          interviewees(name, title)
        `)
        .eq("show_id", showId);
        
      if (itemsError) {
        const errorLog = createErrorLog("FETCHING_SHOW_ITEMS", itemsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch show items", details: errorLog }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
      }
      
      // Combine the data
      const showWithItems = {
        ...show,
        items: items || []
      };

      console.log(`Show found: ${show.name}, with ${showWithItems.items?.length || 0} items`);

      // Fetch email settings
      const { data: emailSettings, error: settingsError } = await supabase
        .from("email_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

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

      // Fetch WhatsApp settings
      const { data: whatsappSettings, error: whatsappSettingsError } = await supabase
        .from("whatsapp_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (whatsappSettingsError) {
        console.warn("Failed to fetch WhatsApp settings, will disable WhatsApp notifications:", whatsappSettingsError);
      }
      
      const whatsAppEnabled = !skipWhatsApp && whatsappSettings?.whatsapp_enabled;
      console.log(`WhatsApp messaging is ${whatsAppEnabled ? 'enabled' : 'disabled'}`);

      if (!emailSettings && !whatsAppEnabled) {
        return new Response(
          JSON.stringify({ 
            error: "No messaging settings found", 
            details: "Please configure email or WhatsApp settings in the admin panel"
          }),
          { 
            status: 404, 
            headers: corsHeaders 
          }
        );
      }

      if (emailSettings) {
        console.log(`Email settings found with method: ${emailSettings.email_method || 'smtp'}`);
        console.log(`Sender: ${emailSettings.sender_name} <${emailSettings.sender_email}>`);
      }

      // Format the date with timezone offset
      console.log("Preparing content...");
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
      
      const results = {
        emailResult: null,
        whatsappResult: null
      };

      // Send email if not skipped
      if (!skipEmail && emailSettings) {
        try {
          // Prepare email content
          const { subject, body } = prepareEmailContent(
            showWithItems as ShowData, 
            formattedDate, 
            lineupLink, 
            emailSettings
          );

          console.log(`Email prepared - Subject: ${subject}`);
          
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
              
              recipientEmails = recipients?.map(r => r.email) || [];
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
            console.warn("No recipient emails found, skipping email sending");
          } else {
            console.log(`Recipients: ${recipientEmails.join(', ')}`);
            console.log(`Using email method: ${emailSettings.email_method}`);
            
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
            
            // Send email based on method
            if (emailSettings.email_method === 'mailgun') {
              try {
                console.log("Sending email via Mailgun...");
                
                // Check for mailgun settings in the database
                const usingDatabaseSettings = !!(emailSettings.mailgun_api_key && emailSettings.mailgun_domain);
                console.log(`Using Mailgun settings from: ${usingDatabaseSettings ? 'database' : 'environment variables'}`);
                
                // If not using database settings, double check that Mailgun secrets are set in the environment
                if (!usingDatabaseSettings) {
                  const mailgunApiKey = Deno.env.get("MAILGUN_API_KEY");
                  const mailgunDomain = Deno.env.get("MAILGUN_DOMAIN");
                  
                  if (!mailgunApiKey || !mailgunDomain) {
                    const missingSecrets = [];
                    if (!mailgunApiKey) missingSecrets.push("MAILGUN_API_KEY");
                    if (!mailgunDomain) missingSecrets.push("MAILGUN_DOMAIN");
                    
                    const errorLog = createErrorLog("MAILGUN_SECRETS_CHECK", {
                      message: `Missing Mailgun secrets: ${missingSecrets.join(", ")}`,
                      code: "MISSING_SECRETS",
                      additionalInfo: "Mailgun settings were not found in database or environment variables"
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
                }
                
                // Log configuration details
                console.log("Mailgun configuration:", {
                  usingDatabaseSettings,
                  domain: emailSettings.mailgun_domain || Deno.env.get("MAILGUN_DOMAIN"),
                  apiKeyPresent: !!(emailSettings.mailgun_api_key || Deno.env.get("MAILGUN_API_KEY")),
                  isEuRegion: emailSettings.is_eu_region || false
                });
                
                results.emailResult = await sendViaMailgun(
                  emailSettings as EmailSettings,
                  recipientEmails,
                  subject,
                  body
                );
                
                // Record successful email
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
                
                results.emailResult = await sendViaGmailApi(
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
                results.emailResult = await sendViaSmtp(
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
          }
        } catch (emailProcessingError) {
          const errorLog = createErrorLog("PROCESSING_EMAIL", emailProcessingError);
          return new Response(
            JSON.stringify({ error: `Error processing email data`, details: errorLog }),
            { 
              status: 500, 
              headers: corsHeaders 
            }
          );
        }
      }
      
      // Send WhatsApp message if enabled
      if (whatsAppEnabled && whatsappSettings) {
        try {
          console.log("Preparing WhatsApp message...");
          
          // Create a simplified message for WhatsApp
          const whatsappMessage = `*${show.name}* - ${formattedDate}${show.time ? ` ${show.time}` : ''}\n\nלצפייה בליינאפ: ${lineupLink}`;
          
          console.log("WhatsApp message prepared");
          
          try {
            results.whatsappResult = await sendViaWhatsApp(
              whatsappSettings as WhatsAppSettings, 
              whatsappMessage,
              showId
            );
            
            console.log("WhatsApp message sent successfully:", results.whatsappResult);
            
            // Log WhatsApp message to database
            if (!testEmail) {
              const { error: logError } = await supabase
                .from("show_whatsapp_logs")
                .upsert({
                  show_id: show.id,
                  success: true,
                  error_message: null
                });
                
              if (logError) {
                console.error("Error logging WhatsApp success:", logError);
              }
            }
          } catch (whatsappError) {
            console.error("WhatsApp error:", whatsappError);
            const errorLog = whatsappError.errorLog || createErrorLog("WHATSAPP_SEND", whatsappError);
            
            if (!testEmail) {
              const { error: logError } = await supabase
                .from("show_whatsapp_logs")
                .upsert({
                  show_id: show.id,
                  success: false,
                  error_message: errorLog.message
                });
                
              if (logError) {
                console.error("Error logging WhatsApp failure:", logError);
              }
            }
            
            // If email was sent successfully but WhatsApp failed, we report partial success
            if (results.emailResult) {
              results.whatsappResult = { 
                success: false, 
                error: errorLog.message 
              };
            } else {
              return new Response(
                JSON.stringify({ error: `Failed to send WhatsApp message`, details: errorLog }),
                { 
                  status: 500, 
                  headers: corsHeaders 
                }
              );
            }
          }
        } catch (whatsappProcessingError) {
          const errorLog = createErrorLog("PROCESSING_WHATSAPP", whatsappProcessingError);
          
          // If email was sent successfully but WhatsApp failed, we report partial success
          if (results.emailResult) {
            results.whatsappResult = { 
              success: false, 
              error: errorLog.message 
            };
          } else {
            return new Response(
              JSON.stringify({ error: `Error processing WhatsApp data`, details: errorLog }),
              { 
                status: 500, 
                headers: corsHeaders 
              }
            );
          }
        }
      }

      // Return final results
      return new Response(
        JSON.stringify({
          success: true,
          email: results.emailResult || { skipped: true },
          whatsapp: results.whatsappResult || { skipped: true }
        }),
        { 
          status: 200, 
          headers: corsHeaders 
        }
      );
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
