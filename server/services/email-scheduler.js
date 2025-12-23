import { query } from '../../src/lib/db.js';
import nodemailer from 'nodemailer';

// Helper function to validate email settings
const validateEmailSettings = (settings) => {
  const requiredFields = ['sender_email', 'sender_name'];
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (!settings[field]) {
      missingFields.push(field);
    }
  }
  
  if (settings.email_method === 'smtp') {
    const smtpFields = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password'];
    for (const field of smtpFields) {
      if (!settings[field]) {
        missingFields.push(field);
      }
    }
  } else if (settings.email_method === 'gmail_api') {
    if (!settings.gmail_refresh_token) {
      missingFields.push('gmail_authentication');
    }
  } else if (settings.email_method === 'mailgun') {
    if (!settings.mailgun_api_key) {
      missingFields.push('mailgun_api_key');
    }
    if (!settings.mailgun_domain) {
      missingFields.push('mailgun_domain');
    }
  }
  
  return missingFields;
};

// Helper function to create interviewees list HTML
const createIntervieweesList = (showItems) => {
  let intervieweesList = "<ul style='direction: rtl; text-align: right; padding-right: 20px; margin-right: 0;'>";
  const uniqueInterviewees = new Set();
  
  if (Array.isArray(showItems)) {
    showItems.forEach(item => {
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
  }
  
  intervieweesList += "</ul>";
  return intervieweesList;
};

// Helper function to create lineup link button
const createLineupLink = async (showId) => {
  // Use the correct domain for email links
  const baseUrl = 'http://l.103.fm:8080';
  
  const lineupUrl = `${baseUrl}/print/${showId}`;
  return `
    <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
      <a href="${lineupUrl}" style="display: inline-block; background-color: #5e0e1c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">לצפייה בליינאפ</a>
    </div>`;
};

// Helper function to process email template
const processEmailTemplate = (template, show, showItems, formattedDate, lineupLink) => {
  const intervieweesList = createIntervieweesList(showItems);
  
  let processedTemplate = template
    .replace(/{{show_name}}/g, show.name || '')
    .replace(/{{show_date}}/g, formattedDate || '')
    .replace(/{{show_time}}/g, show.time || '')
    .replace(/{{interviewees_list}}/g, intervieweesList)
    .replace(/{{lineup_link}}/g, lineupLink);
  
  return processedTemplate;
};

// Helper function to create full email HTML
const createEmailHtml = (processedBody, subject) => {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>${subject}</title>
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      direction: rtl;
      text-align: right;
      font-family: Arial, sans-serif;
    }
    body {
      margin: 0;
      padding: 0;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }
    a {
      color: #0000FF;
    }
    .content {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 20px;
    }
    .interviewees {
      margin-bottom: 20px;
    }
    .button-container {
      margin-top: 30px;
      text-align: center;
    }
    .button {
      display: inline-block;
      background-color: #5e0e1c;
      color: white !important;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="content">
    ${processedBody}
  </div>
</body>
</html>
  `.trim();
};

// Helper function to send email via Mailgun
const sendViaMailgun = async (emailSettings, recipientEmails, subject, body) => {
  const isEuRegion = emailSettings.is_eu_region || false;
  const mailgunApiBase = isEuRegion ? "https://api.eu.mailgun.net/v3" : "https://api.mailgun.net/v3";
  
  const apiKey = emailSettings.mailgun_api_key;
  const domain = emailSettings.mailgun_domain;
  
  if (!apiKey) {
    throw new Error("Mailgun API key is required");
  }
  
  if (!domain) {
    throw new Error("Mailgun domain is required");
  }
  
  console.log(`Sending email via Mailgun (${isEuRegion ? 'EU' : 'US'} region) to domain: ${domain}`);
  
  const headers = new Headers({
    "Authorization": `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
    "Content-Type": "application/x-www-form-urlencoded",
  });
  
  const formData = new URLSearchParams();
  formData.append("from", `${emailSettings.sender_name} <${emailSettings.sender_email}>`);
  formData.append("to", recipientEmails[0]); // First recipient goes in TO
  if (recipientEmails.length > 1) {
    formData.append("bcc", recipientEmails.slice(1).join(",")); // Rest go in BCC
  }
  formData.append("subject", subject);
  formData.append("html", body);
  
  const response = await fetch(`${mailgunApiBase}/${domain}/messages`, {
    method: "POST",
    headers,
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailgun API error: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  
  return {
    success: true,
    method: 'mailgun',
    messageId: result.id,
    response: result.message
  };
};

// Helper function to send email via Gmail API
const sendViaGmailApi = async (emailSettings, recipientEmails, subject, body) => {
  // This would require Google OAuth2 implementation
  // For now, we'll throw an error indicating it's not implemented locally
  throw new Error("Gmail API is not implemented in local server. Please use SMTP or Mailgun.");
};

// Helper function to send email via SMTP
const sendViaSmtp = async (emailSettings, recipientEmails, subject, body) => {
  console.log(`Using SMTP: ${emailSettings.smtp_host}:${emailSettings.smtp_port}`);
  
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
    debug: true,
    logger: true
  };
  
  const transporter = nodemailer.createTransport(transportConfig);

  console.log("Verifying SMTP connection...");
  await transporter.verify();
  console.log("✅ SMTP connection verified successfully");

  console.log("Sending email...");
  
  // For SMTP, use the authenticated user's email as the sender to avoid domain mismatch
  const senderEmail = emailSettings.smtp_user;
  const senderName = emailSettings.sender_name;
  
  console.log(`Using sender: "${senderName}" <${senderEmail}>`);
  
  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: recipientEmails[0], // First recipient goes in TO
    subject: subject,
    html: body,
    bcc: recipientEmails.length > 1 ? recipientEmails.slice(1).join(",") : undefined,
    encoding: 'utf-8',
    headers: {
      'Content-Type': 'text/html; charset=UTF-8'
    }
  };
  
  const info = await transporter.sendMail(mailOptions);

  console.log("✅ Email sent successfully:", {
    messageId: info.messageId,
    response: info.response,
    accepted: info.accepted,
    rejected: info.rejected
  });

  return {
    success: true,
    method: 'smtp',
    messageId: info.messageId,
    response: info.response,
    accepted: info.accepted,
    rejected: info.rejected
  };
};

// Helper function to send email via internal server
const sendViaInternalServer = async (emailSettings, recipientEmails, subject, body) => {
  console.log("Using internal server SMTP (localhost)");
  
  const transportConfig = {
    host: 'localhost',
    port: 25,
    secure: false,
    tls: {
      rejectUnauthorized: false
    },
    debug: true,
    logger: true
  };
  
  const transporter = nodemailer.createTransport(transportConfig);

  console.log("Verifying internal server SMTP connection...");
  await transporter.verify();
  console.log("Internal server SMTP connection verified successfully");

  console.log("Sending email via internal server...");
  
  const mailOptions = {
    from: `"${emailSettings.sender_name}" <${emailSettings.sender_email}>`,
    to: recipientEmails.join(', '),
    subject: subject,
    html: body,
    headers: {
      'X-Mailer': 'Radio Lineup Generator - Internal Server',
      'X-Priority': '3'
    }
  };

  const info = await transporter.sendMail(mailOptions);
  
  console.log("Email sent successfully via internal server");
  
  return {
    success: true,
    messageId: info.messageId,
    response: info.response,
    method: 'internal_server'
  };
};

// Main function to send lineup email
const sendLineupEmail = async (showId) => {
  try {
    console.log(`[Email Scheduler] Processing show ID: ${showId}`);
    
    // Get show data
    const showResult = await query(
      'SELECT id, name, date, time, notes FROM shows WHERE id = $1',
      [showId]
    );
    
    if (!showResult.data || showResult.data.length === 0) {
      console.log(`[Email Scheduler] Show not found: ${showId}`);
      return { success: false, error: 'Show not found' };
    }
    
    const show = showResult.data[0];
    
    // Get show items with interviewees
    const itemsResult = await query(
      `SELECT 
        si.*,
        json_agg(
          json_build_object(
            'name', i.name,
            'title', i.title
          )
        ) FILTER (WHERE i.id IS NOT NULL) as interviewees
      FROM show_items si
      LEFT JOIN interviewees i ON si.id = i.item_id
      WHERE si.show_id = $1
      GROUP BY si.id, si.show_id, si.position, si.name, si.title, si.details, si.phone, si.duration, si.is_break, si.is_note, si.is_divider, si.created_at
      ORDER BY si.position`,
      [showId]
    );
    
    if (itemsResult.error) {
      throw itemsResult.error;
    }
    
    const showItems = itemsResult.data;
    
    // Get email settings
    const settingsResult = await query('SELECT * FROM email_settings LIMIT 1');
    
    if (!settingsResult.data || settingsResult.data.length === 0) {
      console.log(`[Email Scheduler] Email settings not found for show: ${showId}`);
      return { success: false, error: 'Email settings not found' };
    }
    
    const emailSettings = settingsResult.data[0];
    
    // Get recipients
    const recipientsResult = await query('SELECT email FROM email_recipients');
    
    if (recipientsResult.error) {
      throw recipientsResult.error;
    }
    
    const recipients = recipientsResult.data.map(row => row.email);
    
    if (recipients.length === 0) {
      console.log(`[Email Scheduler] No recipients found for show: ${showId}`);
      return { success: false, error: 'No recipients found' };
    }
    
    // Format date
    let formattedDate = "";
    if (show.date) {
      try {
        const showDate = new Date(show.date);
        formattedDate = showDate.toLocaleDateString('he-IL');
      } catch (dateError) {
        console.error("Error formatting date:", dateError);
        formattedDate = show.date || "";
      }
    }
    
    // Generate lineup link
    const lineupLink = await createLineupLink(show.id);
    
    // Process email templates
    const subject = processEmailTemplate(
      emailSettings.subject_template, 
      show, 
      showItems, 
      formattedDate, 
      lineupLink
    );
    
    const processedBody = processEmailTemplate(
      emailSettings.body_template, 
      show, 
      showItems, 
      formattedDate, 
      lineupLink
    );
    
    // Create full HTML email
    const html = createEmailHtml(processedBody, subject);
    
    // Validate email settings
    const missingSettings = validateEmailSettings(emailSettings);
    
    if (missingSettings.length > 0) {
      const errorMessage = `Missing required email settings: ${missingSettings.join(", ")}`;
      console.error(`[Email Scheduler] ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
    
    // Send email based on method
    let emailResult;
    
    if (emailSettings.email_method === 'mailgun') {
      emailResult = await sendViaMailgun(emailSettings, recipients, subject, html);
    } else if (emailSettings.email_method === 'gmail_api') {
      emailResult = await sendViaGmailApi(emailSettings, recipients, subject, html);
    } else if (emailSettings.email_method === 'internal_server') {
      emailResult = await sendViaInternalServer(emailSettings, recipients, subject, html);
    } else if (emailSettings.email_method === 'smtp') {
      emailResult = await sendViaSmtp(emailSettings, recipients, subject, html);
    } else {
      return { success: false, error: `Unsupported email method: ${emailSettings.email_method}` };
    }
    
    // Log the email sending
    await query(
      'INSERT INTO show_email_logs (show_id, success) VALUES ($1, $2)',
      [showId, true]
    );
    
    console.log(`[Email Scheduler] ✅ Email sent successfully for show: ${show.name} (${showId})`);
    return { 
      success: true,
      messageId: emailResult.messageId,
      method: emailResult.method
    };
    
  } catch (error) {
    console.error(`[Email Scheduler] Error sending lineup email for show ${showId}:`, error);
    
    // Log the error
    await query(
      'INSERT INTO show_email_logs (show_id, success, error_message) VALUES ($1, $2, $3)',
      [showId, false, error.message]
    );
    
    return { 
      success: false,
      error: error.message
    };
  }
};

// Global lock to prevent multiple instances
let isRunning = false;

// Main scheduler function
const checkAndSendEmails = async () => {
  // Prevent multiple instances from running simultaneously
  if (isRunning) {
    console.log(`[Email Scheduler] ⚠️ Another email check is already running - skipping this run`);
    return;
  }
  
  isRunning = true;
  
  try {
    console.log(`[Email Scheduler] Checking for shows that need emails... (${new Date().toISOString()})`);
    
    // Get current time (server is already in Israel timezone)
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Use the current date
    const currentDate = now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
    
    console.log(`[Email Scheduler] Current time: ${now.toISOString()}`);
    console.log(`[Email Scheduler] Current hour: ${currentHour}, minute: ${currentMinute}`);
    
    // Find shows that:
    // 1. Are scheduled for today
    // 2. Have a time that matches current time (within 30 minutes)
    // 3. Haven't had emails sent yet
    const showsResult = await query(`
      SELECT DISTINCT s.id, s.name, s.date, s.time
      FROM shows s
      WHERE s.date = $1
      AND s.time IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM show_email_logs sel 
        WHERE sel.show_id = s.id 
        AND sel.success = true
      )
      AND EXISTS (
        SELECT 1 FROM show_items si 
        WHERE si.show_id = s.id
      )
    `, [currentDate]);
    
    if (showsResult.error) {
      throw showsResult.error;
    }
    
    const shows = showsResult.data || [];
    console.log(`[Email Scheduler] Found ${shows.length} shows for today`);
    
    for (const show of shows) {
      try {
        // Parse show time
        const [showHour, showMinute] = show.time.split(':').map(Number);
        
        // Check if it's time to send (at the exact show time)
        const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (showHour * 60 + showMinute));
        
        if (timeDiff <= 5) { // Send within 5 minutes of show time
          console.log(`[Email Scheduler] Sending email for show: ${show.name} at ${show.time}`);
          
          // Use database advisory lock to prevent multiple processes from sending the same email
          // This lock is process-safe and will prevent race conditions
          // Use hashtext to convert UUID string to a numeric key for the advisory lock
          try {
            // Try to acquire advisory lock (non-blocking)
            const lockResult = await query(
              `SELECT pg_try_advisory_lock(hashtext($1)::bigint) as locked`,
              [`email_${show.id}`]
            );
            
            if (!lockResult.data || !lockResult.data[0] || !lockResult.data[0].locked) {
              console.log(`[Email Scheduler] ⚠️ Could not acquire lock for show: ${show.name} - another process is handling it`);
              continue;
            }
            
            try {
              // Double-check that email hasn't been sent (race condition protection)
              const duplicateCheck = await query(
                `SELECT 1 FROM show_email_logs WHERE show_id = $1 AND success = true LIMIT 1`,
                [show.id]
              );
              
              if (duplicateCheck.data && duplicateCheck.data.length > 0) {
                console.log(`[Email Scheduler] ⚠️ Email already sent for show: ${show.name} - skipping to prevent duplicate`);
                continue;
              }
              
              // Additional protection: Check if email was sent in the last 10 minutes
              const recentEmailCheck = await query(
                `SELECT 1 FROM show_email_logs 
                 WHERE show_id = $1 AND success = true 
                 AND sent_at > NOW() - INTERVAL '10 minutes' 
                 LIMIT 1`,
                [show.id]
              );
              
              if (recentEmailCheck.data && recentEmailCheck.data.length > 0) {
                console.log(`[Email Scheduler] ⚠️ Email sent recently for show: ${show.name} - skipping to prevent duplicate`);
                continue;
              }
              
              const result = await sendLineupEmail(show.id);
              
              if (result.success) {
                console.log(`[Email Scheduler] ✅ Successfully sent email for show: ${show.name}`);
              } else {
                console.error(`[Email Scheduler] ❌ Failed to send email for show: ${show.name} - ${result.error}`);
              }
            } finally {
              // Always release the advisory lock
              await query(
                `SELECT pg_advisory_unlock(hashtext($1)::bigint)`,
                [`email_${show.id}`]
              );
            }
          } catch (lockError) {
            console.error(`[Email Scheduler] Error with advisory lock for show ${show.id}:`, lockError);
            // Continue to next show if lock fails
            continue;
          }
        } else {
          console.log(`[Email Scheduler] Show ${show.name} at ${show.time} is not ready for email (time diff: ${timeDiff} minutes)`);
        }
      } catch (showError) {
        console.error(`[Email Scheduler] Error processing show ${show.id}:`, showError);
      }
    }
    
    console.log(`[Email Scheduler] Check completed at ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('[Email Scheduler] Error in checkAndSendEmails:', error);
  } finally {
    // Always release the lock
    isRunning = false;
  }
};

// Start the scheduler
let schedulerInterval;

const startEmailScheduler = () => {
  console.log('[Email Scheduler] Starting email scheduler...');
  
  // Run immediately on startup
  checkAndSendEmails();
  
  // Calculate time until next XX:00 or XX:30
  const now = new Date();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();
  
  let minutesUntilNext;
  if (currentMinute < 30) {
    // Next run at XX:30
    minutesUntilNext = 30 - currentMinute;
  } else {
    // Next run at (XX+1):00
    minutesUntilNext = 60 - currentMinute;
  }
  
  // Convert to milliseconds and subtract seconds
  const msUntilNext = (minutesUntilNext * 60 - currentSecond) * 1000;
  
  console.log(`[Email Scheduler] Next run in ${minutesUntilNext} minutes and ${60 - currentSecond} seconds`);
  
  // Schedule first run at XX:00 or XX:30
  setTimeout(() => {
    checkAndSendEmails();
    
    // Then run every 30 minutes at XX:00 and XX:30
    schedulerInterval = setInterval(checkAndSendEmails, 30 * 60 * 1000);
  }, msUntilNext);
  
  console.log('[Email Scheduler] Email scheduler started - will check at XX:00 and XX:30 of every hour');
};

const stopEmailScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    console.log('[Email Scheduler] Email scheduler stopped');
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[Email Scheduler] Received SIGINT, stopping scheduler...');
  stopEmailScheduler();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Email Scheduler] Received SIGTERM, stopping scheduler...');
  stopEmailScheduler();
  process.exit(0);
});

export { startEmailScheduler, stopEmailScheduler, checkAndSendEmails };
