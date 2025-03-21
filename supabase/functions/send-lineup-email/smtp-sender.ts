
import nodemailer from "npm:nodemailer@6.9.9";
import { EmailSettings } from "./utils.ts";
import { isOutlookAuthError, getAlternativeSmtpRecommendation, createErrorLog } from "./error-handler.ts";

export const sendViaSmtp = async (
  emailSettings: EmailSettings,
  recipientEmails: string[],
  subject: string,
  body: string
): Promise<any> => {
  console.log(`Using SMTP: ${emailSettings.smtp_host}:${emailSettings.smtp_port}`);
  
  try {
    console.log("Configuring email transport...");
    // Debug log SMTP details
    console.log("SMTP Details:", {
      host: emailSettings.smtp_host || 'Not set',
      port: emailSettings.smtp_port || 'Not set',
      user: emailSettings.smtp_user ? 'Set (hidden)' : 'Not set',
      password: emailSettings.smtp_password ? 'Set (hidden)' : 'Not set',
    });
    
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
      logger: true // Enable built-in logger
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
      console.error("SMTP verification error (full):", verifyError);
      // Add host information to the error for better recommendations
      if (verifyError) {
        // @ts-ignore
        verifyError.host = emailSettings.smtp_host;
      }
      
      const errorLog = createErrorLog("SMTP_VERIFICATION", verifyError);
      
      if (isOutlookAuthError(verifyError)) {
        const recommendation = getAlternativeSmtpRecommendation(emailSettings.smtp_host);
        errorLog.recommendation = recommendation;
      }
      
      throw { ...verifyError, errorLog };
    }

    console.log("Sending email...");
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

    return {
      success: true,
      method: 'smtp',
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected
    };
  } catch (error) {
    console.error("Error in SMTP sending (full):", error);
    
    // If the error was from SMTP verification, it already has the errorLog
    if (error.errorLog) {
      throw error;
    }
    
    // Add host information to the error for better recommendations
    if (error) {
      // @ts-ignore
      error.host = emailSettings.smtp_host;
    }
    
    const errorLog = createErrorLog("SENDING_EMAIL", error);
    
    if (isOutlookAuthError(error)) {
      const recommendation = getAlternativeSmtpRecommendation(emailSettings.smtp_host);
      errorLog.recommendation = recommendation;
    }
    
    throw { ...error, errorLog };
  }
};
