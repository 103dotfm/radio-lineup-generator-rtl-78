
import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const ScheduleXML = () => {
  const { toast } = useToast();

  useEffect(() => {
    const fetchXmlContent = async () => {
      try {
        console.log("Fetching XML content from system_settings");
        // Get XML content from system_settings
        const { data, error } = await supabase
          .from('system_settings')
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
          const { error: genError } = await supabase.functions.invoke('generate-schedule-xml');
          
          if (genError) {
            console.error("Error generating XML:", genError);
            toast({
              title: "Error generating XML",
              description: "There was a problem generating the schedule XML file.",
              variant: "destructive"
            });
          } else {
            toast({
              title: "XML Generated",
              description: "Schedule XML file has been generated successfully."
            });
          }
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    };
    
    fetchXmlContent();
  }, [toast]);
  
  return null; // This component doesn't render anything
};

export default ScheduleXML;
