
import { Request, Response } from 'express';
import ftp from 'basic-ftp';

export default async function handler(req: Request, res: Response) {
  console.log('API Route: FTP connection test requested', JSON.stringify(req.body));
  try {
    const { server, port, username, password, passive } = req.body;
    
    // Validate required parameters
    if (!server || !port || !username || !password) {
      console.log('API Route: Missing FTP parameters:', { server, port, username, passwordProvided: !!password });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required FTP parameters' 
      });
    }
    
    console.log(`API Route: Attempting FTP connection to ${server}:${port} with user ${username}, passive mode: ${passive}`);
    
    // Set up FTP client
    const client = new ftp.Client();
    client.ftp.verbose = true; // For detailed logs
    
    try {
      // Connect to the FTP server
      await client.access({
        host: server,
        port: parseInt(port),
        user: username,
        password: password,
        secure: false,
        passive: passive === true
      });
      
      console.log('API Route: FTP connection successful. Listing directory content...');
      
      // List directory contents to verify connection
      const list = await client.list();
      console.log('API Route: Directory listing:', list.map(item => item.name).join(', '));
      
      return res.json({ 
        success: true, 
        message: 'FTP connection successful',
        directoryContents: list.length > 0 ? list.slice(0, 5).map(item => item.name) : []
      });
    } catch (ftpError) {
      console.error('API Route: FTP connection test error:', ftpError);
      return res.status(500).json({ 
        success: false, 
        message: 'FTP connection failed',
        error: ftpError.message,
        stack: ftpError.stack
      });
    } finally {
      client.close();
      console.log('API Route: FTP client closed');
    }
  } catch (error) {
    console.error('API Route: Server error testing FTP connection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error processing FTP test request',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
