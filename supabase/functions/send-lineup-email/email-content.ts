
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
  
  // Create email body
  let body = `<div dir="rtl" style="direction: rtl; text-align: right; font-family: Arial, sans-serif;">
    ${emailSettings.body_template
      .replace(/{{show_name}}/g, show.name)
      .replace(/{{show_date}}/g, formattedDate)
      .replace(/{{show_time}}/g, show.time || "")
      .replace(/{{interviewees_list}}/g, intervieweesList)
      .replace(/{{lineup_link}}/g, lineupLink)}
  </div>`;
  
  // Apply RTL styling to all elements
  const rtlElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span', 'a', 'li', 'ul', 'ol', 'table', 'tr', 'td', 'th'];
  rtlElements.forEach(element => {
    const regex = new RegExp(`<${element}(\\s[^>]*|)>`, 'g');
    body = body.replace(regex, `<${element}$1 style="direction: rtl; text-align: right;">`);
  });

  return { subject, body };
};
