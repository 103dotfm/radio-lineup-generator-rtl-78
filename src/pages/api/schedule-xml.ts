
import { Request, Response } from 'express';
import { supabase } from '@/lib/supabase';
import { getCombinedShowDisplay } from '@/utils/showDisplay';

export default async function handler(req: Request, res: Response) {
  try {
    console.log('API Route: Serving XML file');
    
    // Get XML content from system_settings
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'schedule_xml');
      
    if (error) {
      console.error('API Route: Error fetching XML:', error);
      throw error;
    }
    
    if (!data || data.length === 0 || !data[0]?.value) {
      console.log('API Route: No XML found, generating now');
      
      // If no XML is available, generate it by calling the Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-schedule-xml');
      
      if (functionError) {
        console.error('API Route: Error generating XML:', functionError);
        throw functionError;
      }
      
      console.log('API Route: XML generated successfully');
      // Set content type and return the XML
      res.setHeader('Content-Type', 'application/xml');
      return res.send(functionData);
    }
    
    // Process any showcombined tags if needed
    let xmlContent = data[0].value;
    
    console.log('API Route: XML found, serving:', xmlContent.substring(0, 100) + '...');
    // Set content type and return the XML
    res.setHeader('Content-Type', 'application/xml');
    return res.send(xmlContent);
  } catch (error) {
    console.error('API Route: Error serving XML:', error);
    res.status(500)
      .set('Content-Type', 'application/xml')
      .send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to serve schedule XML</error>');
  }
}
