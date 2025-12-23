import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ScheduleXML = () => {
  useEffect(() => {
    const fetchXmlContent = async () => {
      try {
        console.log("Fetching XML content from system-settings");
        // Get XML content from system-settings
        const { data, error } = await supabase
          .from('system-settings')
          .select('value, updated_at')
          .eq('key', 'schedule_xml')
          .maybeSingle();
        
        if (error) {
          console.error("Error fetching XML content:", error);
          return;
        }
        
        if (data && data.value) {
          console.log("XML content found, length:", data.value.length);
          // We could store the XML in state if needed, but we're handling it via API routes
        } else {
          console.log("No XML content found, triggering generation");
          // Try to generate it if it doesn't exist
          await supabase.functions.invoke('generate-schedule-xml');
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    };
    
    fetchXmlContent();
  }, []);
  
  return null; // This component doesn't render anything
};

export default ScheduleXML;
