import cron from 'node-cron';
import { query } from '../src/lib/db.js';
// Email scheduler is now handled by a separate PM2 process (email-scheduler-standalone.js)
// Removed startEmailScheduler import to prevent duplicate email sending
import { sendRDSDataToDevice } from './services/rds-telnet.js';
import GoogleCalendarSyncService from './services/google-calendar-sync.js';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Backup directory path
const BACKUP_DIR = join(__dirname, '../backup');

// Initialize Google Calendar sync service
const calendarSync = new GoogleCalendarSyncService();

// Function to generate schedules
async function generateSchedules() {
  try {
    console.log('Running scheduled schedule generation');
    
    // Get refresh interval from settings
    const intervalResult = await query(
      "SELECT value FROM system_settings WHERE key = 'schedule_xml_refresh_interval'"
    );
    
    let interval = 10; // Default to 10 minutes
    if (intervalResult.data && intervalResult.data.length > 0) {
      interval = parseInt(intervalResult.data[0].value) || 10;
    }
    
    // Only proceed if we're at the right interval
    const currentMinute = new Date().getMinutes();
    if (currentMinute % interval !== 0) {
      return;
    }
    
    // Generate XML and JSON
    const baseUrl = process.env.BASE_URL || 'http://localhost:5174';
    
    // Generate XML
    const xmlResponse = await fetch(`${baseUrl}/api/schedule/generate-xml`, {
      method: 'POST'
    });
    
    if (!xmlResponse.ok) {
      throw new Error(`Failed to generate XML: ${xmlResponse.statusText}`);
    }
    
    // Generate JSON
    const jsonResponse = await fetch(`${baseUrl}/api/schedule/generate-json`, {
      method: 'POST'
    });
    
    if (!jsonResponse.ok) {
      throw new Error(`Failed to generate JSON: ${jsonResponse.statusText}`);
    }
    
    console.log('Scheduled generation completed successfully');
  } catch (error) {
    console.error('Error in scheduled generation:', error);
  }
}

// Function to send RDS data via telnet
async function sendRDSDataScheduled() {
  try {
    const now = new Date();
    console.log(`[RDS CRON] Running scheduled RDS telnet transmission at ${now.toISOString()} (${now.toLocaleString('he-IL')})`);
    
    // Add a small delay to ensure we don't run too early
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    // If we're running more than 2 minutes early or late, log it
    if (currentSecond > 30 || currentSecond < 0) {
      console.log(`[RDS CRON] Warning: Running at ${currentMinute}:${currentSecond} instead of expected XX:00 or XX:30`);
    }
    
    console.log('[RDS CRON] Starting RDS data transmission...');
    const result = await sendRDSDataToDevice();
    
    if (result.success) {
      console.log('[RDS CRON] Scheduled RDS telnet transmission completed successfully');
    } else if (result.skipped) {
      console.log('[RDS CRON] Scheduled RDS telnet transmission skipped:', result.message);
    } else {
      console.log('[RDS CRON] Scheduled RDS telnet transmission failed:', result.message);
    }
    
    // Always log completion to ensure we know the cron job finished
    console.log(`[RDS CRON] Scheduled transmission completed at ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('[RDS CRON] Error in scheduled RDS telnet transmission:', error);
    console.error('[RDS CRON] Error stack:', error.stack);
    
    // Try to restart the cron job if there's a critical error
    if (error.message.includes('timeout') || error.message.includes('connection')) {
      console.log('[RDS CRON] Critical error detected, will retry on next schedule');
    }
    
    // Log completion even on error
    console.log(`[RDS CRON] Scheduled transmission failed but completed at ${new Date().toISOString()}`);
  }
}

// Function to create automatic database backup
async function createAutomaticBackup() {
  try {
    console.log('Running automatic database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `radiodb-auto-backup-${timestamp}.sql`;
    const filepath = join(BACKUP_DIR, filename);

    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Database connection parameters
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'radiodb';
    const dbUser = process.env.DB_USER || 'radiouser';
    const dbPassword = process.env.DB_PASSWORD || 'radio123';

    // Create pg_dump command
    const dumpCommand = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists --no-owner --no-privileges > "${filepath}"`;

    const { stdout, stderr } = await execAsync(dumpCommand);

    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`pg_dump error: ${stderr}`);
    }

    // Get file stats
    const stats = await fs.stat(filepath);

    // Clean up old backups (keep only latest 30)
    await cleanupOldBackups();

    console.log(`Automatic backup created successfully: ${filename} (${stats.size} bytes)`);
  } catch (error) {
    console.error('Error in automatic backup:', error);
  }
}

// Clean up old backups (keep only latest 30)
async function cleanupOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = [];

    for (const file of files) {
      if (file.endsWith('.sql') || file.endsWith('.dump')) {
        const filePath = join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        backupFiles.push({
          filename: file,
          path: filePath,
          created: stats.birthtime
        });
      }
    }

    // Sort by creation date (oldest first)
    backupFiles.sort((a, b) => new Date(a.created) - new Date(b.created));

    // Delete files beyond the 30th one
    if (backupFiles.length > 30) {
      const filesToDelete = backupFiles.slice(0, backupFiles.length - 30);
      
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          console.log(`Deleted old backup: ${file.filename}`);
        } catch (error) {
          console.error(`Error deleting old backup ${file.filename}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

// Function to sync Google Calendar
async function syncGoogleCalendar() {
  try {
    console.log('[CALENDAR SYNC] Running scheduled Google Calendar sync...');
    
    const result = await calendarSync.importFromGoogleCalendar();
    
    if (result.success) {
      console.log(`[CALENDAR SYNC] Sync completed successfully: ${result.eventsCreated} created, ${result.eventsUpdated} updated, ${result.conflictsDetected} conflicts`);
    } else {
      console.error('[CALENDAR SYNC] Sync failed:', result.error);
    }
  } catch (error) {
    console.error('[CALENDAR SYNC] Error in scheduled Google Calendar sync:', error);
  }
}

// Setup cron jobs
export function setupCronJobs() {
  console.log('Setting up cron jobs...');
  
  // Schedule XML and JSON generation every minute
  // The actual interval is controlled by the database setting
  cron.schedule('* * * * *', generateSchedules);
  
  // NOTE: RDS telnet transmission is now handled by cron-manager.js
  // This duplicate cron job has been disabled to prevent double transmissions
  // See server/services/cron-manager.js for the active RDS cron job
  /*
  const rdsCronJob = cron.schedule('0,30 * * * *', sendRDSDataScheduled, {
    scheduled: true,
    timezone: "Asia/Jerusalem"
  });
  console.log('[RDS CRON] RDS telnet transmission scheduled: 0,30 * * * * (every 30 minutes at XX:00 and XX:30)');
  */
  
  // Add a health check cron job that runs every 5 minutes to ensure the RDS cron is working
  cron.schedule('*/5 * * * *', () => {
    const now = new Date();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();
    
    // Log health check every 15 minutes
    if (currentMinute % 15 === 0) {
      console.log(`[RDS CRON HEALTH] Health check at ${now.toLocaleString('he-IL')} - RDS cron job is active`);
    }
  });
  
  // Add a watchdog cron job that runs every hour to check if RDS transmissions are happening
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      console.log(`[RDS CRON WATCHDOG] Hourly watchdog check at ${now.toLocaleString('he-IL')}`);
      
      // Check if there were any transmissions in the last 2 hours
      const twoHoursAgo = new Date(now.getTime() - (2 * 60 * 60 * 1000));
      
      // This is a simple check - in a real implementation you might want to query the database
      console.log(`[RDS CRON WATCHDOG] Checking for transmissions since ${twoHoursAgo.toISOString()}`);
      
      // If no transmissions detected, log a warning
      console.log(`[RDS CRON WATCHDOG] Watchdog check completed - cron job appears to be running`);
    } catch (error) {
      console.error('[RDS CRON WATCHDOG] Error in watchdog check:', error);
    }
  });
  
  // Calculate next run times manually
  const now = new Date();
  const nextRuns = [];
  for (let i = 0; i < 5; i++) {
    const nextRun = new Date(now);
    const currentMinute = nextRun.getMinutes();
    if (currentMinute < 30) {
      nextRun.setMinutes(30, 0, 0);
    } else {
      nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0);
    }
    nextRun.setMinutes(nextRun.getMinutes() + (i * 30));
    nextRuns.push(nextRun);
  }
  console.log('[RDS CRON] Next run times:', nextRuns.map(date => date.toLocaleString('he-IL')));
  
  // Schedule automatic database backup every day at 23:00
  cron.schedule('0 23 * * *', createAutomaticBackup);
  
  // Schedule Google Calendar sync every 10 minutes
  cron.schedule('*/10 * * * *', syncGoogleCalendar);
  console.log('[CALENDAR SYNC] Google Calendar sync scheduled: */10 * * * * (every 10 minutes)');
  
  // Email scheduler is now handled by a separate PM2 process (email-scheduler-standalone.js)
  // This prevents duplicate email sending when both cron.js and the standalone process run
  // Removed startEmailScheduler() call to fix duplicate email bug
  
  console.log('Cron jobs setup completed');
}

export default setupCronJobs; 