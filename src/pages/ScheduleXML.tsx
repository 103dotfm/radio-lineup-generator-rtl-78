
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Helper function to escape XML special characters
const escapeXml = (unsafe: string): string => {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Helper function to calculate end time
const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, minutes] = startTime.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes + durationMinutes;
  
  // Handle overflow to next day
  totalMinutes = totalMinutes % (24 * 60);
  
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

const ScheduleXML: React.FC = () => {
  const [xmlContent, setXmlContent] = useState<string>('');
  
  // Generate the XML when the component mounts
  useEffect(() => {
    const generateScheduleXml = async () => {
      try {
        // Get current date info
        const today = new Date();
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)
        
        // Get next week's start date
        const nextWeekStart = new Date(currentWeekStart);
        nextWeekStart.setDate(currentWeekStart.getDate() + 7);
        
        // Format dates to ISO string (YYYY-MM-DD)
        const formatDate = (date: Date) => {
          return date.toISOString().split('T')[0];
        };
        
        // Fetch all schedule slots
        const { data: slots, error } = await supabase
          .from('schedule_slots')
          .select('*')
          .order('day_of_week')
          .order('start_time');
          
        if (error) {
          console.error('Error fetching schedule data:', error);
          throw error;
        }
        
        if (!slots || slots.length === 0) {
          console.warn('No schedule slots found');
          const errorXml = '<?xml version="1.0" encoding="UTF-8"?><schedule><error>No schedule data available</error></schedule>';
          setXmlContent(errorXml);
          return;
        }

        console.log(`Found ${slots.length} schedule slots`);
        
        // Generate XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<schedule>\n';
        
        // Current week
        xml += `  <week start="${formatDate(currentWeekStart)}">\n`;
        
        for (let day = 0; day < 7; day++) {
          const dayDate = new Date(currentWeekStart);
          dayDate.setDate(currentWeekStart.getDate() + day);
          
          xml += `    <day date="${formatDate(dayDate)}">\n`;
          
          const daySlots = slots.filter(slot => slot.day_of_week === day);
          
          for (const slot of daySlots) {
            const endTime = slot.end_time || calculateEndTime(slot.start_time, 60);
            const title = escapeXml(slot.show_name);
            const host = escapeXml(slot.host_name || '');
            const color = slot.color || '#59c9c6';
            
            xml += `      <show>\n`;
            xml += `        <title>${title}</title>\n`;
            xml += `        <host>${host}</host>\n`;
            xml += `        <start_time>${slot.start_time}</start_time>\n`;
            xml += `        <end_time>${endTime}</end_time>\n`;
            xml += `        <is_prerecorded>${slot.is_prerecorded ? 'true' : 'false'}</is_prerecorded>\n`;
            xml += `        <is_collection>${slot.is_collection ? 'true' : 'false'}</is_collection>\n`;
            xml += `        <color>${color}</color>\n`;
            xml += `      </show>\n`;
          }
          
          xml += `    </day>\n`;
        }
        
        xml += `  </week>\n`;
        
        // Next week
        xml += `  <week start="${formatDate(nextWeekStart)}">\n`;
        
        for (let day = 0; day < 7; day++) {
          const dayDate = new Date(nextWeekStart);
          dayDate.setDate(nextWeekStart.getDate() + day);
          
          xml += `    <day date="${formatDate(dayDate)}">\n`;
          
          const daySlots = slots.filter(slot => slot.day_of_week === day);
          
          for (const slot of daySlots) {
            const endTime = slot.end_time || calculateEndTime(slot.start_time, 60);
            const title = escapeXml(slot.show_name);
            const host = escapeXml(slot.host_name || '');
            const color = slot.color || '#59c9c6';
            
            xml += `      <show>\n`;
            xml += `        <title>${title}</title>\n`;
            xml += `        <host>${host}</host>\n`;
            xml += `        <start_time>${slot.start_time}</start_time>\n`;
            xml += `        <end_time>${endTime}</end_time>\n`;
            xml += `        <is_prerecorded>${slot.is_prerecorded ? 'true' : 'false'}</is_prerecorded>\n`;
            xml += `        <is_collection>${slot.is_collection ? 'true' : 'false'}</is_collection>\n`;
            xml += `        <color>${color}</color>\n`;
            xml += `      </show>\n`;
          }
          
          xml += `    </day>\n`;
        }
        
        xml += `  </week>\n`;
        xml += '</schedule>';
        
        // Save XML to database for the Express server to access
        await supabase
          .from('system_settings')
          .upsert({
            key: 'schedule_xml',
            value: xml,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'key'
          });
        
        setXmlContent(xml);
      } catch (error) {
        console.error('Failed to generate XML:', error);
        const errorXml = '<?xml version="1.0" encoding="UTF-8"?><schedule><error>Error generating schedule</error></schedule>';
        setXmlContent(errorXml);
      }
    };

    generateScheduleXml();
  }, []);

  // If xmlContent is set, render it with appropriate headers
  useEffect(() => {
    if (xmlContent) {
      // Create a Blob with the XML content and the correct MIME type
      const blob = new Blob([xmlContent], { type: 'application/xml' });
      
      // Create a temporary URL for the Blob
      const url = URL.createObjectURL(blob);
      
      // Redirect to the Blob URL
      window.location.href = url;
      
      // Clean up the URL when the component unmounts
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [xmlContent]);

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <p>Generating XML...</p>
    </div>
  );
};

export default ScheduleXML;
