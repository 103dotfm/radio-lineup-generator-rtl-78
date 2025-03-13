import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { format } from "https://deno.land/std@0.178.0/datetime/mod.ts";
import nodemailer from "npm:nodemailer@6.9.9";
import { google } from "npm:googleapis@129.0.0";

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
  email_method: 'smtp' | 'gmail_api';
  gmail_client_id: string;
  gmail_client_secret: string;
  gmail_refresh_token: string;
  gmail_redirect_uri: string;
  gmail_access_token?: string;
  gmail_token_expiry?: string;
}

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

const getAlternativeSmtpRecommendation = (host: string): string => {
  if (host.includes('outlook') || host.includes('hotmail') || host.includes('office365')) {
    return "It appears you're using Microsoft Outlook/Office 365 which may have SMTP authentication disabled. Please check https://aka.ms/smtp_auth_disabled for more information, or consider using an alternative email provider like Gmail (smtp.gmail.com).";
  }
  return "Consider using an alternative SMTP server or checking your authentication credentials.";
};

const applyTimezoneOffset = (date: Date, offsetHours: number): Date => {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + offsetHours);
  console.log(`Applying timezone offset: ${offsetHours} hours to ${date.toISOString()}, result: ${newDate.toISOString()}`);
  return newDate;
};

const sendViaGmailApi = async (
  emailSettings: EmailSettings, 
  recipientEmails: string[], 
  subject: string, 
  body: string
): Promise<any> => {
  try {
    console.log("Setting up Gmail API client");
    
    const oauth2Client = new google.auth.OAuth2(
      emailSettings.gmail_client_id,
      emailSettings.gmail_client_secret,
      emailSettings.gmail_redirect_uri
    );
    
    let accessToken = emailSettings.gmail_access_token;
    const expiryDate = emailSettings.gmail_token_expiry ? new Date(emailSettings.gmail_token_expiry) : null;
    const now = new Date();
    
    if (!accessToken || !expiryDate || expiryDate <= now) {
      console.log("Access token missing or expired, refreshing token");
      
      oauth2Client.setCredentials({
        refresh_token: emailSettings.gmail_refresh_token
      });
      
      const tokens = await oauth2Client.refreshAccessToken();
      accessToken = tokens.credentials.access_token;
      
      console.log("Token refreshed successfully");
    }
    
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: emailSettings.gmail_refresh_token
    });
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    console.log("Creating email message");
    
    const from = `"${emailSettings.sender_name}" <${emailSettings.sender_email}>`;
    const to = recipientEmails.join(", ");
    
    const emailLines = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      body
    ];
    
    const email = emailLines.join('\r\n');
    
    const encodedEmail = Buffer.from(email).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    console.log("Sending email via Gmail API");
    
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });
    
    console.log("✅ Email sent successfully via Gmail API:", {
      messageId: res.data.id,
      threadId: res.data.threadId,
      labelIds: res.data.labelIds
    });
    
    return {
      messageId: res.data.id,
      success: true
    };
  } catch (error) {
    console.error("Error sending email via Gmail API:", error);
    throw error;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-lineup-email function");
    
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

      let missingSettings: string[] = [];
      
      if (emailSettings.email_method === 'gmail_api') {
        const requiredGmailSettings = [
          "gmail_client_id", "gmail_client_secret", "gmail_refresh_token", 
          "sender_email", "sender_name"
        ];
        
        missingSettings = requiredGmailSettings.filter(key => !emailSettings[key]);
      } else {
        const requiredSmtpSettings = [
          "smtp_host", "smtp_port", "smtp_user", "smtp_password", 
          "sender_email", "sender_name"
        ];
        
        missingSettings = requiredSmtpSettings.filter(key => !emailSettings[key]);
      }
      
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
      
      let lineupLink = "";
      try {
        const origin = req.headers.get("origin") || "";
        let baseUrl = "";
        
        if (origin && !origin.includes("supabase.co")) {
          baseUrl = origin;
        } else {
          const url = new URL(req.url);
          if (url.hostname !== "yyrmodgbnzqbmatlypuc.supabase.co") {
            baseUrl = `${url.protocol}//${url.hostname}`;
          } else {
            baseUrl = "https://app.radioline.co.il";
          }
        }
        
        lineupLink = `${baseUrl}/print/${show.id}?minutes=false`;
        console.log("Generated lineup link:", lineupLink);
      } catch (urlError) {
        console.error("Error creating lineup link:", urlError);
        lineupLink = `https://app.radioline.co.il/print/${show.id}?minutes=false`;
      }
      
      let intervieweesList = "<ul style='direction: rtl; text-align: right; padding-right: 20px; margin-right: 0;'>";
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
                intervieweesList += `<li style="direction: rtl; text-align: right;">${intervieweeText}</li>`;
              }
            });
          } else if (!item.is_break && !item.is_note && !item.is_divider) {
            const intervieweeText = item.title 
              ? `${item.name}, ${item.title}` 
              : item.name;
            
            if (!uniqueInterviewees.has(intervieweeText)) {
              uniqueInterviewees.add(intervieweeText);
              intervieweesList += `<li style="direction: rtl; text-align: right;">${intervieweeText}</li>`;
            }
          }
        });
      } else {
        console.warn("Show items is not an array:", show.items);
      }
      
      intervieweesList += "</ul>";

      let subject = emailSettings.subject_template.replace(/{{show_name}}/g, show.name);
      subject = subject.replace(/{{show_date}}/g, formattedDate);
      subject = subject.replace(/{{show_time}}/g, show.time || "");
      
      let body = `<div dir="rtl" style="direction: rtl; text-align: right; font-family: Arial, sans-serif;">
        ${emailSettings.body_template
          .replace(/{{show_name}}/g, show.name)
          .replace(/{{show_date}}/g, formattedDate)
          .replace(/{{show_time}}/g, show.time || "")
          .replace(/{{interviewees_list}}/g, intervieweesList)
          .replace(/{{lineup_link}}/g, lineupLink)}
      </div>`;
      
      const rtlElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'a', 'li', 'ul', 'ol', 'table', 'tr', 'td', 'th'];
      rtlElements.forEach(element => {
        const regex = new RegExp(`<${element}(\\s[^>]*|)>`, 'g');
        body = body.replace(regex, `<${element}$1 style="direction: rtl; text-align: right;">`);
      });

      console.log(`Email prepared - Subject: ${subject}`);
      
      if (emailSettings.email_method === 'gmail_api') {
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
        console.log(`Using SMTP: ${emailSettings.smtp_host}:${emailSettings.smtp_port}`);
        
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
              rejectUnauthorized: false
            },
            debug: true
          };
          
          console.log("Transport config:", {
            host: transportConfig.host,
            port: transportConfig.port,
            secure: transportConfig.secure,
            auth: {
              user: transportConfig.auth.user,
              pass: "********"
            }
          });
          
          const transporter = nodemailer.createTransport(transportConfig);

          console.log("Verifying SMTP connection...");
          try {
            await transporter.verify();
            console.log("✅ SMTP connection verified successfully");
          } catch (verifyError) {
            const errorLog = createErrorLog("SMTP_VERIFICATION", verifyError);
            
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
                method: 'smtp',
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
            
            if (isOutlookAuthError(emailError)) {
              const recommendation = getAlternativeSmtpRecommendation(emailSettings.smtp_host);
              errorLog.recommendation = recommendation;
            }
            
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
