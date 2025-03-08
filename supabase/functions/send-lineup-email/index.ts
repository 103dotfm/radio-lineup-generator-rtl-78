
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { format } from "https://deno.land/std@0.178.0/datetime/mod.ts";
import nodemailer from "npm:nodemailer@6.9.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { showId, testEmail } = await req.json();
    
    if (!showId) {
      return new Response(
        JSON.stringify({ error: "Show ID is required" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Get show details
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

    if (showError || !show) {
      console.error("Error fetching show:", showError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch show" }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Get email settings
    const { data: emailSettings, error: settingsError } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError || !emailSettings) {
      console.error("Error fetching email settings:", settingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch email settings" }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Get recipient emails if not a test
    let recipientEmails: string[] = [];
    if (testEmail) {
      recipientEmails = [testEmail];
    } else {
      const { data: recipients, error: recipientsError } = await supabase
        .from("email_recipients")
        .select("email");

      if (recipientsError) {
        console.error("Error fetching recipients:", recipientsError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch recipients" }),
          { 
            status: 500, 
            headers: { "Content-Type": "application/json", ...corsHeaders } 
          }
        );
      }
      
      recipientEmails = recipients.map(r => r.email);
    }

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipient emails found" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Format date for display
    const formattedDate = show.date ? new Date(show.date).toLocaleDateString('he-IL') : "";
    
    // Create lineup link
    const lineupLink = `${supabaseUrl.replace('.supabase.co', '.app')}/print/${show.id}?minutes=false`;
    
    // Generate interviewees list
    let intervieweesList = "<ul>";
    const uniqueInterviewees = new Set();
    
    show.items.forEach(item => {
      if (item.interviewees && item.interviewees.length > 0) {
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
    
    intervieweesList += "</ul>";

    // Replace placeholders in templates
    let subject = emailSettings.subject_template.replace("{{show_name}}", show.name);
    
    let body = emailSettings.body_template
      .replace(/{{show_name}}/g, show.name)
      .replace(/{{show_date}}/g, formattedDate)
      .replace(/{{show_time}}/g, show.time || "")
      .replace(/{{interviewees_list}}/g, intervieweesList)
      .replace(/{{lineup_link}}/g, lineupLink);

    // Configure email transport
    const transporter = nodemailer.createTransport({
      host: emailSettings.smtp_host,
      port: emailSettings.smtp_port,
      secure: emailSettings.smtp_port === 465,
      auth: {
        user: emailSettings.smtp_user,
        pass: emailSettings.smtp_password,
      },
    });

    // Send email
    try {
      const info = await transporter.sendMail({
        from: `"${emailSettings.sender_name}" <${emailSettings.sender_email}>`,
        to: recipientEmails.join(", "),
        subject: subject,
        html: body,
        headers: {
          'Content-Type': 'text/html; charset=UTF-8'
        }
      });

      console.log("Email sent:", info);

      // Log the email in the database if not a test
      if (!testEmail) {
        await supabase
          .from("show_email_logs")
          .upsert({
            show_id: show.id,
            success: true,
            error_message: null
          });
      }

      return new Response(
        JSON.stringify({ success: true, messageId: info.messageId }),
        { 
          status: 200, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      
      // Log the email error in the database if not a test
      if (!testEmail) {
        await supabase
          .from("show_email_logs")
          .upsert({
            show_id: show.id,
            success: false,
            error_message: emailError.message
          });
      }

      return new Response(
        JSON.stringify({ error: `Failed to send email: ${emailError.message}` }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }
  } catch (error) {
    console.error("Error in send-lineup-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
