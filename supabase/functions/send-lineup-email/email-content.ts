
import { ShowData } from "./utils.ts";

export const prepareEmailContent = (
  show: ShowData, 
  formattedDate: string, 
  lineupLink: string, 
  emailSettings: any
): { subject: string, body: string } => {
  // Create interviewees list
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

  // Create email subject
  let subject = emailSettings.subject_template.replace(/{{show_name}}/g, show.name);
  subject = subject.replace(/{{show_date}}/g, formattedDate);
  subject = subject.replace(/{{show_time}}/g, show.time || "");
  
  // Create a properly formatted button HTML
  const viewLineupButton = `<div style="text-align: center; margin-top: 30px;">
    <a href="${lineupLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">לצפייה בליינאפ</a>
  </div>`;
  
  // Process the body template
  let processedBody = emailSettings.body_template
    .replace(/{{show_name}}/g, show.name)
    .replace(/{{show_date}}/g, formattedDate)
    .replace(/{{show_time}}/g, show.time || "")
    .replace(/{{interviewees_list}}/g, intervieweesList)
    .replace(/{{lineup_link}}/g, viewLineupButton);
  
  // Create email body with enhanced RTL and Hebrew support
  const body = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    .link-section {
      margin-top: 30px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="content">
    ${processedBody}
  </div>
</body>
</html>
  `;

  return { subject, body };
};
