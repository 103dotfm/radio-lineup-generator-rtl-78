
import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const ScheduleXML = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Identify if this page is being accessed directly for XML content
    const isXmlRequest = window.location.pathname.endsWith('.xml');
    
    if (isXmlRequest) {
      fetchAndServeXml();
    } else {
      checkXmlStatus();
    }
    
    async function fetchAndServeXml() {
      try {
        // Get XML content from system_settings
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'schedule_xml')
          .maybeSingle();
          
        if (error) {
          console.error("Error fetching XML:", error);
          document.body.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><error>Failed to fetch XML data</error>';
          return;
        }
        
        if (!data || !data.value) {
          console.log("No XML found, generating now");
          
          // Try to generate it if it doesn't exist
          const { data: genData, error: genError } = await supabase.functions.invoke('generate-schedule-xml');
          
          if (genError) {
            console.error("Error generating XML:", genError);
            document.body.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate XML data</error>';
            return;
          }
          
          // Set the content type via a meta tag
          const xmlContent = genData || '<?xml version="1.0" encoding="UTF-8"?><schedule></schedule>';
          serveXmlContent(xmlContent);
        } else {
          // Set the content type and serve the XML
          serveXmlContent(data.value);
        }
      } catch (error) {
        console.error("Unexpected error serving XML:", error);
        document.body.innerHTML = '<?xml version="1.0" encoding="UTF-8"?><error>Unexpected error occurred</error>';
      }
    }
    
    function serveXmlContent(xmlContent) {
      // Create a text/xml meta tag
      const metaTag = document.createElement('meta');
      metaTag.httpEquiv = 'Content-Type';
      metaTag.content = 'text/xml; charset=UTF-8';
      document.head.appendChild(metaTag);
      
      // Replace the entire document with XML content
      document.body.innerHTML = xmlContent;
      
      // Set plain text styling to preserve XML formatting
      document.body.style.whiteSpace = 'pre';
      document.body.style.fontFamily = 'monospace';
    }
    
    async function checkXmlStatus() {
      try {
        console.log("Checking XML status");
        // Get XML content from system_settings
        const { data, error } = await supabase
          .from('system_settings')
          .select('value, updated_at')
          .eq('key', 'schedule_xml')
          .maybeSingle();
        
        if (error) {
          console.error("Error checking XML status:", error);
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
            description: `XML file is available (${data.value.length} characters). Last updated: ${lastUpdated}`
          });
        } else {
          console.log("No XML content found, triggering generation");
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
              description: "Schedule XML file has been generated successfully."
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
    }
  }, [toast]);
  
  return null; // Component doesn't render anything by default
};

export default ScheduleXML;
