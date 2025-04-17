
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { format, startOfWeek, addDays, addWeeks } from 'date-fns';

const ScheduleXML = () => {
  const { toast } = useToast();
  const [xmlContent, setXmlContent] = useState<string | null>(null);

  useEffect(() => {
    // Generate and show XML for browser preview
    generateScheduleXml().then(xml => {
      setXmlContent(xml);
      
      // Show toast if accessed in browser
      toast({
        title: "XML Schedule",
        description: "The XML schedule is also available at /schedule.xml",
      });
    }).catch(error => {
      console.error("Error generating XML:", error);
      toast({
        title: "Error",
        description: "Failed to generate XML schedule",
        variant: "destructive"
      });
    });
  }, []);

  // Function to generate XML from schedule data
  const generateScheduleXml = async (): Promise<string> => {
    try {
      // Get today's date and start of week
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
      const nextWeekStart = addWeeks(currentWeekStart, 1);
      
      // Fetch schedule data
      const { data: slots, error } = await supabase
        .from('schedule_slots')
        .select('*')
        .gte('day_of_week', 0)
        .lte('day_of_week', 6)
        .order('day_of_week')
        .order('start_time');
        
      if (error) {
        console.error('Error fetching schedule data:', error);
        throw error;
      }
      
      // Start building XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<schedule>\n';
      
      // Generate XML for current week
      xml += `  <week start="${format(currentWeekStart, 'yyyy-MM-dd')}">\n`;
      for (let day = 0; day < 7; day++) {
        const dayDate = addDays(currentWeekStart, day);
        const daySlots = slots.filter(slot => slot.day_of_week === day);
        
        xml += `    <day date="${format(dayDate, 'yyyy-MM-dd')}">\n`;
        
        for (const slot of daySlots) {
          const endTime = slot.end_time || calculateEndTime(slot.start_time, 60);
          
          xml += `      <show>\n`;
          xml += `        <title>${escapeXml(slot.show_name)}</title>\n`;
          xml += `        <host>${escapeXml(slot.host_name || '')}</host>\n`;
          xml += `        <start_time>${slot.start_time}</start_time>\n`;
          xml += `        <end_time>${endTime}</end_time>\n`;
          xml += `        <is_prerecorded>${slot.is_prerecorded ? 'true' : 'false'}</is_prerecorded>\n`;
          xml += `        <is_collection>${slot.is_collection ? 'true' : 'false'}</is_collection>\n`;
          xml += `        <color>${slot.color || '#59c9c6'}</color>\n`;
          xml += `      </show>\n`;
        }
        
        xml += `    </day>\n`;
      }
      xml += `  </week>\n`;
      
      // Generate XML for next week
      xml += `  <week start="${format(nextWeekStart, 'yyyy-MM-dd')}">\n`;
      for (let day = 0; day < 7; day++) {
        const dayDate = addDays(nextWeekStart, day);
        const daySlots = slots.filter(slot => slot.day_of_week === day);
        
        xml += `    <day date="${format(dayDate, 'yyyy-MM-dd')}">\n`;
        
        for (const slot of daySlots) {
          const endTime = slot.end_time || calculateEndTime(slot.start_time, 60);
          
          xml += `      <show>\n`;
          xml += `        <title>${escapeXml(slot.show_name)}</title>\n`;
          xml += `        <host>${escapeXml(slot.host_name || '')}</host>\n`;
          xml += `        <start_time>${slot.start_time}</start_time>\n`;
          xml += `        <end_time>${endTime}</end_time>\n`;
          xml += `        <is_prerecorded>${slot.is_prerecorded ? 'true' : 'false'}</is_prerecorded>\n`;
          xml += `        <is_collection>${slot.is_collection ? 'true' : 'false'}</is_collection>\n`;
          xml += `        <color>${slot.color || '#59c9c6'}</color>\n`;
          xml += `      </show>\n`;
        }
        
        xml += `    </day>\n`;
      }
      xml += `  </week>\n`;
      
      // Close XML
      xml += '</schedule>';
      
      // Save XML to database for server-side access
      await supabase
        .from('system_settings')
        .upsert({
          key: 'schedule_xml',
          value: xml,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });
        
      return xml;
    } catch (error) {
      console.error('Error generating XML:', error);
      throw error;
    }
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

  // Helper function to escape XML special characters
  const escapeXml = (unsafe: string | null): string => {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Schedule XML</h1>
      <div className="bg-gray-800 p-4 rounded-lg text-green-400 font-mono text-sm overflow-x-auto mb-4">
        <pre>{xmlContent}</pre>
      </div>
      <p className="text-sm text-muted-foreground">
        This XML is also available at: <code>{window.location.origin}/schedule.xml</code>
      </p>
    </div>
  );
};

export default ScheduleXML;
