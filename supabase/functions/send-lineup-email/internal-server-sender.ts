import nodemailer from "npm:nodemailer@6.9.9";
import { EmailSettings } from "./utils.ts";

export const sendViaInternalServer = async (
  emailSettings: EmailSettings,
  recipientEmails: string[],
  subject: string,
  body: string
): Promise<any> => {
  console.log("Using internal server SMTP (localhost)");
  
  try {
    console.log("Configuring internal server email transport...");
    
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
    
    console.log("Internal server transport config:", {
      host: transportConfig.host,
      port: transportConfig.port,
      secure: transportConfig.secure
    });
    
    const transporter = nodemailer.createTransport(transportConfig);

    console.log("Verifying internal server SMTP connection...");
    try {
      await transporter.verify();
      console.log("Internal server SMTP connection verified successfully");
    } catch (verifyError) {
      console.error("Failed to verify internal server SMTP connection:", verifyError);
      throw {
        message: "Internal server SMTP connection failed",
        code: "SMTP_VERIFICATION_FAILED",
        details: verifyError,
        errorLog: {
          stage: "INTERNAL_SERVER_SMTP_VERIFICATION",
          message: verifyError.message || "SMTP verification failed",
          code: verifyError.code || "UNKNOWN",
          additionalInfo: "Internal server SMTP service may not be running or configured"
        }
      };
    }

    console.log("Sending email via internal server...");
    console.log("Recipients:", recipientEmails);
    console.log("Subject:", subject);
    
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
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      method: 'internal_server'
    };
    
  } catch (error) {
    console.error("Error sending email via internal server:", error);
    
    const errorDetails = {
      stage: "INTERNAL_SERVER_SEND",
      message: error.message || "Unknown error occurred",
      code: error.code || "UNKNOWN",
      additionalInfo: "Internal server SMTP may not be properly configured or running"
    };
    
    throw {
      message: `Failed to send email via internal server: ${error.message}`,
      code: error.code || "INTERNAL_SERVER_ERROR",
      details: error,
      errorLog: errorDetails
    };
  }
}; 