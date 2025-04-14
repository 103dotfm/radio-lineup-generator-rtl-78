
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const ScheduleXML = () => {
  const [xmlContent, setXmlContent] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchXmlContent = async () => {
      try {
        // Get XML content from system_settings
        const { data, error } = await supabase
          .from('system_settings')
          .select('value, updated_at')
          .eq('key', 'schedule_xml')
          .single();
        
        if (error) {
          console.error("Error fetching XML content:", error);
          setXmlContent('<?xml version="1.0" encoding="UTF-8"?><error>Failed to load schedule data</error>');
          return;
        }
        
        if (data) {
          setXmlContent(data.value);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        setXmlContent('<?xml version="1.0" encoding="UTF-8"?><error>An unexpected error occurred</error>');
      }
    };
    
    fetchXmlContent();
  }, []);
  
  return null; // This component doesn't render anything
};

export default ScheduleXML;
