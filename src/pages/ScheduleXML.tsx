
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
          toast({
            title: "Error checking XML status",
            description: "Could not verify XML file status.",
            variant: "destructive"
          });
          return;
        }
        
        if (data && data.value) {
          console.log("XML content found, length:", data.value.length);
          // We could store the XML in state if needed, but we're handling it via API routes
        } else {
          console.log("No XML content found, triggering generation");
          // Try to generate it if it doesn't exist
          toast({
            title: "Generating XML",
            description: "XML file not found, generating now...",
          });
          
          const { data: genData, error: genError } = await supabase.functions.invoke('generate-schedule-xml');
          
          if (genError) {
            console.error("Error generating XML:", genError);
            toast({
              title: "Error generating XML",
              description: "There was a problem generating the schedule XML file.",
              variant: "destructive"
            });
          } else {
            console.log("XML generated successfully:", genData ? "length: " + String(genData).length : "No data returned");
            toast({
              title: "XML Generated",
              description: "Schedule XML file has been generated successfully. It should be available at /schedule.xml"
            });
          }
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast({
          title: "Error processing XML",
          description: "An unexpected error occurred while processing the XML file.",
          variant: "destructive"
        });
      }
    };
    
    fetchXmlContent();
  }, [toast]);
  
  return null; // This component doesn't render anything
};

export default ScheduleXML;
