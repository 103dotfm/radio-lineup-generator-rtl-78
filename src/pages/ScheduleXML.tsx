
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';
import { getScheduleSlots } from '@/lib/supabase/schedule';
import { supabase } from '@/lib/supabase';

const ScheduleXML = () => {
  const { toast } = useToast();
  const [xmlGenerated, setXmlGenerated] = useState(false);

  useEffect(() => {
    // Identify if this page is being accessed directly for XML content
    const isXmlRequest = window.location.pathname.endsWith('.xml');
    
    if (isXmlRequest) {
      generateAndServeXml();
    } else {
      checkXmlStatus();
    }
  }, []);

  async function generateAndServeXml() {
    try {
      // Generate fresh XML
      const xmlContent = await generateScheduleXml();
      
      // Set XML content type
      const metaTag = document.createElement('meta');
      metaTag.httpEquiv = 'Content-Type';
      metaTag.content = 'text/xml; charset=UTF-8';
      document.head.appendChild(metaTag);
      
      // Replace document content with XML
      document.body.innerHTML = xmlContent;
      document.body.style.whiteSpace = 'pre';
      document.body.style.fontFamily = 'monospace';
      
      // Save to database for caching
      await saveXmlToDatabase(xmlContent);
    } catch (error) {
      console.error("Error generating XML:", error);
      document.body.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate XML data</error>';
    }
  }
  
  async function generateScheduleXml() {
    // Get today's date and start of week
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    
    // Generate XML for current and next week
    const currentWeekXml = await generateWeekXml(currentWeekStart);
    const nextWeekXml = await generateWeekXml(addWeeks(currentWeekStart, 1));

    // Combine into full schedule XML
    return `<?xml version="1.0" encoding="UTF-8"?>
<schedule>
  <week start="${format(currentWeekStart, 'yyyy-MM-dd')}">
    ${currentWeekXml}
  </week>
  <week start="${format(addWeeks(currentWeekStart, 1), 'yyyy-MM-dd')}">
    ${nextWeekXml}
  </week>
</schedule>`;
  }
  
  async function generateWeekXml(weekStart) {
    let weekXml = '';
    
    // Get schedule data for the entire week
    const scheduleSlots = await getScheduleSlots(weekStart, false);
    
    // Group by day and sort by time
    const slotsByDay = {};
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const dayFormatted = format(dayDate, 'yyyy-MM-dd');
      slotsByDay[dayFormatted] = scheduleSlots.filter(slot => slot.day_of_week === i)
        .sort((a, b) => {
          // Sort by start time
          const timeA = a.start_time.split(':').map(Number);
          const timeB = b.start_time.split(':').map(Number);
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        });
    }
    
    // Generate XML for each day
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      const dayFormatted = format(dayDate, 'yyyy-MM-dd');
      const daySlots = slotsByDay[dayFormatted] || [];
      
      weekXml += `<day date="${dayFormatted}">\n`;
      
      // Add each show
      for (const slot of daySlots) {
        const endTime = calculateEndTime(slot.start_time, slot.duration || 60);
        
        weekXml += `  <show>
    <title>${escapeXml(slot.show_name)}</title>
    <host>${escapeXml(slot.host_name)}</host>
    <start_time>${slot.start_time}</start_time>
    <end_time>${endTime}</end_time>
    <is_prerecorded>${slot.is_prerecorded ? 'true' : 'false'}</is_prerecorded>
    <is_collection>${slot.is_collection ? 'true' : 'false'}</is_collection>
    <color>${slot.color || '#59c9c6'}</color>
  </show>\n`;
      }
      
      weekXml += `</day>\n`;
    }
    
    return weekXml;
  }
  
  function calculateEndTime(startTime, durationMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number);
    let totalMinutes = hours * 60 + minutes + durationMinutes;
    
    // Handle overflow to next day
    totalMinutes = totalMinutes % (24 * 60);
    
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }
  
  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  async function saveXmlToDatabase(xmlContent) {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'schedule_xml',
          value: xmlContent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });
        
      if (error) {
        console.error("Error saving XML to database:", error);
      } else {
        console.log("XML saved to database successfully");
        setXmlGenerated(true);
      }
    } catch (error) {
      console.error("Unexpected error saving XML:", error);
    }
  }
  
  async function checkXmlStatus() {
    try {
      // Check if XML exists in database
      const { data, error } = await supabase
        .from('system_settings')
        .select('value, updated_at')
        .eq('key', 'schedule_xml')
        .maybeSingle();
      
      if (error) {
        toast({
          title: "Error checking XML status",
          description: "Could not verify XML file status.",
          variant: "destructive"
        });
        return;
      }
      
      if (data && data.value) {
        const lastUpdated = data.updated_at ? new Date(data.updated_at).toLocaleString() : 'unknown';
        toast({
          title: "XML File Status",
          description: `XML file is available (${data.value.length} characters). Last updated: ${lastUpdated}`,
        });
        setXmlGenerated(true);
      } else {
        toast({
          title: "Generating XML",
          description: "XML file not found, generating now...",
        });
        
        // Generate and save XML
        const xmlContent = await generateScheduleXml();
        await saveXmlToDatabase(xmlContent);
        
        toast({
          title: "XML Generated",
          description: "Schedule XML file has been generated successfully. Access at /schedule.xml"
        });
      }
    } catch (error) {
      console.error("Error checking XML status:", error);
      toast({
        title: "Error processing XML",
        description: "An unexpected error occurred while checking XML status.",
        variant: "destructive"
      });
    }
  }

  // This component doesn't render anything for regular page views
  return null;
};

export default ScheduleXML;
