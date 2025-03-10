
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { format } from "https://deno.land/std@0.178.0/datetime/mod.ts";
import nodemailer from "npm:nodemailer@6.9.9";

// Very important for browser requests - use explicit CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

interface ShowData {
  id: string;
  name: string;
  date: string;
  time: string;
  items: any[];
}

interface EmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  sender_email: string;
  sender_name: string;
  subject_template: string;
  body_template: string;
}

// Helper function to create detailed error logs
const createErrorLog = (stage: string, error: any) => {
  const errorDetails = {
    stage,
    message: error.message || 'Unknown error',
    stack: error.stack,
    code: error.code,
    command: error.command,
    responseCode: error.responseCode,
    response: error.response
  };
  
  console.error(`ERROR IN ${stage}:`, JSON.stringify(errorDetails, null, 2));
  return errorDetails;
};

// Helper function to check if the error is an Outlook SMTP authentication error
const isOutlookAuthError = (error: any): boolean => {
  const errorMsg = error?.message || '';
  const errorResponse = error?.response || '';
  
  return (
    errorMsg.includes('SmtpClientAuthentication is disabled for the Tenant') ||
    errorResponse.includes('SmtpClientAuthentication is disabled') ||
    errorMsg.includes('535 5.7.139 Authentication unsuccessful') ||
    errorResponse.includes('535 5.7.139 Authentication unsuccessful')
  );
};

// Helper function to get an alternative SMTP configuration recommendation
const getAlternativeSmtpRecommendation = (host: string): string => {
  if (host.includes('outlook') || host.includes('hotmail') || host.includes('office365')) {
    return "It appears you're using Microsoft Outlook/Office 365 which may have SMTP authentication disabled. Please check https://aka.ms/smtp_auth_disabled for more information, or consider using an alternative email provider like Gmail (smtp.gmail.com).";
  }
  return "Consider using an alternative SMTP server or checking your authentication credentials.";
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-lineup-email function");
    
    // Check for environment variables
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
      supabaseAnonKey: supabaseAnonKey ? "present (not shown)" : "missing"
    });
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Parse request body
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

    // Get show details
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

      // Get email settings
      console.log("Fetching email settings...");
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

      console.log(`Email settings found with SMTP host: ${emailSettings.smtp_host}, port: ${emailSettings.smtp_port}`);
      console.log(`Sender: ${emailSettings.sender_name} <${emailSettings.sender_email}>`);

      // Check required SMTP settings
      const requiredSettings = [
        "smtp_host", "smtp_port", "smtp_user", "smtp_password", 
        "sender_email", "sender_name"
      ];
      
      const missingSettings = requiredSettings.filter(key => !emailSettings[key]);
      
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

      // Get recipient emails if not a test
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

      // Prepare email content
      console.log("Preparing email content...");
      
      // Format date for display - properly parse the date string
      let formattedDate = "";
      try {
        formattedDate = show.date ? new Date(show.date).toLocaleDateString('he-IL') : "";
        console.log(`Formatted date: ${formattedDate} from raw date: ${show.date}`);
      } catch (dateError) {
        console.error("Error formatting date:", dateError);
        formattedDate = show.date || "";
      }
      
      // Create lineup link - ensure we're using the right URL format
      let lineupLink = "";
      try {
        // Extract the base URL dynamically - this helps avoid using HTML site URL
        const baseUrl = new URL(supabaseUrl).origin.replace('.supabase.co', '.app');
        lineupLink = `${baseUrl}/print/${show.id}?minutes=false`;
        console.log("Generated lineup link:", lineupLink);
      } catch (urlError) {
        console.error("Error creating lineup link:", urlError);
        lineupLink = `${supabaseUrl.replace('.supabase.co', '.app')}/print/${show.id}?minutes=false`;
      }
      
      // Generate interviewees list
      let intervieweesList = "<ul>";
      const uniqueInterviewees = new Set();
      
      if (Array.isArray(show.items)) {
        show.items.forEach(item => {
          if (item.interviewees && Array.isArray(item.interviewees) && item.interviewees.length > 0) {
            item.interviewees.forEach(interviewee => {
              const intervieweeText = interviewee.title 
                ? `${interviewee.name}, ${interviewee.title}` 
                : interviewee.name;
              
              if (!uniqueInterviewees.has(intervieweeText)) {
                uniqueInterviewees.add(intervieweeText);
                intervieweesList += `<li>${intervieweeText}</li>`;
              }
            });
          } else if (!item.is_break && !item.is_note && !item.is_divider) {
            const intervieweeText = item.title 
              ? `${item.name}, ${item.title}` 
              : item.name;
            
            if (!uniqueInterviewees.has(intervieweeText)) {
              uniqueInterviewees.add(intervieweeText);
              intervieweesList += `<li>${intervieweeText}</li>`;
            }
          }
        });
      } else {
        console.warn("Show items is not an array:", show.items);
      }
      
      intervieweesList += "</ul>";

      // Replace placeholders in templates
      let subject = emailSettings.subject_template.replace(/{{show_name}}/g, show.name);
      subject = subject.replace(/{{show_date}}/g, formattedDate);
      subject = subject.replace(/{{show_time}}/g, show.time || "");
      
      let body = emailSettings.body_template
        .replace(/{{show_name}}/g, show.name)
        .replace(/{{show_date}}/g, formattedDate)
        .replace(/{{show_time}}/g, show.time || "")
        .replace(/{{interviewees_list}}/g, intervieweesList)
        .replace(/{{lineup_link}}/g, lineupLink);

      console.log(`Email prepared - Subject: ${subject}`);
      console.log(`Using SMTP: ${emailSettings.smtp_host}:${emailSettings.smtp_port}`);

      // Configure email transport
      try {
        console.log("Configuring email transport...");
        const transportConfig = {
          host: emailSettings.smtp_host,
          port: emailSettings.smtp_port,
          secure: emailSettings.smtp_port === 465,
          auth: {
            user: emailSettings.smtp_user,
            pass: emailSettings.smtp_password,
          },
          tls: {
            // Do not fail on invalid certs
            rejectUnauthorized: false
          },
          debug: true, // Enable debug output
        };
        
        console.log("Transport config:", {
          host: transportConfig.host,
          port: transportConfig.port,
          secure: transportConfig.secure,
          auth: {
            user: transportConfig.auth.user,
            pass: "********" // Don't log the actual password
          }
        });
        
        const transporter = nodemailer.createTransport(transportConfig);

        // Verify SMTP connection configuration
        console.log("Verifying SMTP connection...");
        try {
          await transporter.verify();
          console.log("✅ SMTP connection verified successfully");
        } catch (verifyError) {
          const errorLog = createErrorLog("SMTP_VERIFICATION", verifyError);
          
          // Check if this is an Outlook SMTP auth error
          if (isOutlookAuthError(verifyError)) {
            const recommendation = getAlternativeSmtpRecommendation(emailSettings.smtp_host);
            
            return new Response(
              JSON.stringify({ 
                error: `Microsoft Outlook SMTP authentication is disabled`, 
                details: {
                  ...errorLog,
                  recommendedAction: "Check https://aka.ms/smtp_auth_disabled for information on enabling SMTP auth or use an alternative email provider",
                  recommendation
                }
              }),
              { 
                status: 500, 
                headers: corsHeaders 
              }
            );
          }
          
          return new Response(
            JSON.stringify({ error: `SMTP configuration error`, details: errorLog }),
            { 
              status: 500, 
              headers: corsHeaders 
            }
          );
        }

        // Send email
        console.log("Sending email...");
        try {
          const mailOptions = {
            from: `"${emailSettings.sender_name}" <${emailSettings.sender_email}>`,
            to: recipientEmails.join(", "),
            subject: subject,
            html: body,
            headers: {
              'Content-Type': 'text/html; charset=UTF-8'
            }
          };
          
          console.log("Mail options:", {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
            htmlLength: mailOptions.html.length
          });
          
          const info = await transporter.sendMail(mailOptions);

          console.log("✅ Email sent successfully:", {
            messageId: info.messageId,
            response: info.response,
            accepted: info.accepted,
            rejected: info.rejected
          });

          // Log the email in the database if not a test
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
              messageId: info.messageId,
              response: info.response,
              accepted: info.accepted,
              rejected: info.rejected
            }),
            { 
              status: 200, 
              headers: corsHeaders 
            }
          );
        } catch (emailError) {
          const errorLog = createErrorLog("SENDING_EMAIL", emailError);
          
          // Check if this is an Outlook SMTP auth error
          if (isOutlookAuthError(emailError)) {
            const recommendation = getAlternativeSmtpRecommendation(emailSettings.smtp_host);
            errorLog.recommendation = recommendation;
          }
          
          // Log the email error in the database if not a test
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
      } catch (transportError) {
        const errorLog = createErrorLog("CONFIGURING_TRANSPORT", transportError);
        return new Response(
          JSON.stringify({ error: `Failed to configure email transport`, details: errorLog }),
          { 
            status: 500, 
            headers: corsHeaders 
          }
        );
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
    const errorLog = createErrorLog("GENERAL", error);
    return new Response(
      JSON.stringify({ error: `Unexpected error in send-lineup-email function`, details: errorLog }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
});
