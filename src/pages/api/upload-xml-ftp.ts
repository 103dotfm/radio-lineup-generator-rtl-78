
import { Request, Response } from 'express';
import { supabase } from '@/lib/supabase';
import ftp from 'basic-ftp';
import path from 'path';
import fs from 'fs';
import os from 'os';

export default async function handler(req: Request, res: Response) {
  console.log('API Route: FTP upload requested', JSON.stringify(req.body));
  try {
    const { server, port, username, password, remotePath, passive, fileType = 'xml' } = req.body;
    
    // Validate required parameters
    if (!server || !port || !username || !password) {
      console.log('API Route: Missing FTP upload parameters:', { server, port, username, passwordProvided: !!password });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required FTP parameters' 
      });
    }
    
    // Determine file type and settings key
    const settingsKey = fileType === 'json' ? 'schedule_json' : 'schedule_xml';
    const filename = fileType === 'json' ? 'schedule.json' : 'schedule.xml';
    const contentType = fileType === 'json' ? 'application/json' : 'application/xml';
    
    console.log(`API Route: Preparing to upload ${fileType.toUpperCase()} file '${filename}' to ${server}:${port}`);
    
    // Get the file content
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', settingsKey)
      .single();
      
    if (error || !data || !data.value) {
      console.error(`API Route: Failed to retrieve ${fileType.toUpperCase()} content:`, error);
      return res.status(500).json({ 
        success: false, 
        message: `Failed to retrieve ${fileType.toUpperCase()} content`,
        error: error?.message || `No ${fileType.toUpperCase()} content found`
      });
    }
    
    console.log(`API Route: Retrieved ${fileType.toUpperCase()} content (${data.value.length} bytes)`);
    
    // Set up FTP client
    const client = new ftp.Client();
    client.ftp.verbose = true; // For detailed logs
    
    try {
      console.log(`API Route: Connecting to FTP server ${server}:${port}`);
      
      // Connect to the FTP server
      // Create the access options object with correct typing
      const accessOptions: ftp.AccessOptions = {
        host: server,
        port: parseInt(port),
        user: username,
        password: password,
        secure: false
      };
      
      // Set passive mode separately as it's not part of the type definition
      if (passive === true) {
        // @ts-ignore - We need to ignore the TypeScript error as passive is supported by the library
        // but not included in the TypeScript definition
        accessOptions.passive = true;
      }
      
      await client.access(accessOptions);
      
      console.log('API Route: FTP connection successful');
      
      // Create a temp file with the content
      const tempFilePath = path.join(os.tmpdir(), filename);
      fs.writeFileSync(tempFilePath, data.value);
      console.log(`API Route: Temporary file created at ${tempFilePath}`);
      
      // Upload the file
      const uploadPath = remotePath || '/';
      console.log(`API Route: Ensuring directory exists: ${uploadPath}`);
      await client.ensureDir(uploadPath);
      
      const uploadFilePath = path.join(uploadPath, filename);
      console.log(`API Route: Uploading file to ${uploadFilePath}`);
      await client.uploadFrom(tempFilePath, uploadFilePath);
      
      // Clean up the temp file
      fs.unlinkSync(tempFilePath);
      console.log('API Route: Temporary file deleted');
      
      // Log the success
      console.log(`API Route: ${fileType.toUpperCase()} file uploaded successfully to FTP server`);
      
      return res.json({ 
        success: true, 
        message: `${fileType.toUpperCase()} file uploaded successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (ftpError) {
      console.error('API Route: FTP upload error:', ftpError);
      return res.status(500).json({ 
        success: false, 
        message: 'FTP upload failed',
        error: ftpError.message,
        stack: ftpError.stack
      });
    } finally {
      client.close();
      console.log('API Route: FTP client closed');
    }
  } catch (error) {
    console.error('API Route: Server error handling FTP upload:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error processing FTP upload request',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
