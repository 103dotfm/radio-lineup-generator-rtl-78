
import { Request, Response } from 'express';
import { supabase } from '@/lib/supabase';

export default async function handler(req: Request, res: Response) {
  try {
    // Get XML content from system_settings
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'schedule_xml')
      .single();
      
    if (error) {
      throw error;
    }
    
    if (!data || !data.value) {
      // If no XML is available, generate it by calling the Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-schedule-xml');
      
      if (functionError) {
        throw functionError;
      }
      
      // Set content type and return the XML
      res.setHeader('Content-Type', 'application/xml');
      return res.send(functionData);
    }
    
    // Set content type and return the XML
    res.setHeader('Content-Type', 'application/xml');
    return res.send(data.value);
  } catch (error) {
    console.error('Error serving XML:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Failed to serve schedule XML</error>');
  }
}
