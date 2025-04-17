
import React, { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const ScheduleXML = () => {
  const { toast } = useToast();

  useEffect(() => {
    // This component doesn't render anything for browser views
    // For direct XML requests, the server.js handles the response
    
    // Show toast if accessed directly in browser
    toast({
      title: "XML Availability",
      description: "The schedule XML is available at /schedule.xml",
    });
  }, []);

  return null;
};

export default ScheduleXML;
