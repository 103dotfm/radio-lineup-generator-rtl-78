
import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const ScheduleXML = () => {
  useEffect(() => {
    const refreshXml = async () => {
      try {
        console.log("ScheduleXML component: Checking XML status");
        
        // First check if XML exists in the database
        const { data, error } = await supabase
          .from('system_settings')
          .select('value, updated_at')
          .eq('key', 'schedule_xml')
          .maybeSingle();
        
        if (error) {
          console.error("Error checking XML existence:", error);
          return;
        }
        
        // If XML doesn't exist or is older than 1 hour, regenerate it
        const shouldRefresh = !data || !data.value || 
          (data.updated_at && new Date(data.updated_at).getTime() < Date.now() - 3600000);
        
        if (shouldRefresh) {
          console.log("ScheduleXML component: Regenerating XML");
          const { data: xmlData, error: xmlError } = await supabase.functions.invoke('generate-schedule-xml');
          
          if (xmlError) {
            console.error("Error generating XML:", xmlError);
            toast.error("שגיאה בהכנת קובץ ה-XML");
          } else {
            console.log("XML regenerated successfully, length:", xmlData?.length || 0);
            toast.success("קובץ ה-XML עודכן בהצלחה");
          }
        } else {
          console.log("XML is up to date, length:", data.value.length);
        }
      } catch (e) {
        console.error("Unexpected error in ScheduleXML component:", e);
      }
    };
    
    refreshXml();
  }, []);
  
  return null; // This component doesn't render anything
};

export default ScheduleXML;
