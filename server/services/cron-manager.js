import cron from 'node-cron';
import { sendRDSDataToDevice } from './rds-telnet.js';

// Global variables to track cron job status
let rdsCronJob = null;
let rdsCronStatus = {
  isRunning: false,
  lastRun: null,
  nextRun: null,
  totalRuns: 0,
  lastError: null,
  lastSuccess: null,
  startTime: null
};

// Function to calculate next run times
function calculateNextRuns() {
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
  
  return nextRuns;
}

// Enhanced RDS transmission function with better error handling
async function sendRDSDataScheduled() {
  const startTime = new Date();
  rdsCronStatus.lastRun = startTime;
  rdsCronStatus.totalRuns++;
  
  try {
    console.log(`[RDS CRON MANAGER] Running scheduled RDS telnet transmission at ${startTime.toISOString()} (${startTime.toLocaleString('he-IL')})`);
    
    const result = await sendRDSDataToDevice();
    
    if (result.success) {
      rdsCronStatus.lastSuccess = new Date();
      rdsCronStatus.lastError = null;
      console.log('[RDS CRON MANAGER] Scheduled RDS telnet transmission completed successfully');
    } else if (result.skipped) {
      console.log('[RDS CRON MANAGER] Scheduled RDS telnet transmission skipped:', result.message);
    } else {
      rdsCronStatus.lastError = result.message;
      console.log('[RDS CRON MANAGER] Scheduled RDS telnet transmission failed:', result.message);
    }
    
    // Update next run time
    rdsCronStatus.nextRun = calculateNextRuns()[0];
    
  } catch (error) {
    rdsCronStatus.lastError = error.message;
    console.error('[RDS CRON MANAGER] Error in scheduled RDS telnet transmission:', error);
    console.error('[RDS CRON MANAGER] Error stack:', error.stack);
  }
  
  console.log(`[RDS CRON MANAGER] Scheduled transmission completed at ${new Date().toISOString()}`);
}

// Function to start the RDS cron job
export function startRDSCron() {
  if (rdsCronJob && rdsCronJob.running) {
    console.log('[RDS CRON MANAGER] RDS cron job is already running');
    return { success: false, message: 'RDS cron job is already running' };
  }
  
  try {
    // Stop existing job if it exists
    if (rdsCronJob) {
      rdsCronJob.stop();
    }
    
    // Create new cron job
    rdsCronJob = cron.schedule('0,30 * * * *', sendRDSDataScheduled, {
      scheduled: true,
      timezone: "Asia/Jerusalem"
    });
    
    // Initialize status
    rdsCronStatus = {
      isRunning: true,
      lastRun: null,
      nextRun: calculateNextRuns()[0],
      totalRuns: 0,
      lastError: null,
      lastSuccess: null,
      startTime: new Date()
    };
    
    console.log('[RDS CRON MANAGER] RDS cron job started successfully');
    console.log('[RDS CRON MANAGER] Next run times:', calculateNextRuns().map(date => date.toLocaleString('he-IL')));
    
    return { success: true, message: 'RDS cron job started successfully' };
  } catch (error) {
    console.error('[RDS CRON MANAGER] Error starting RDS cron job:', error);
    return { success: false, message: error.message };
  }
}

// Function to stop the RDS cron job
export function stopRDSCron() {
  if (!rdsCronJob || !rdsCronJob.running) {
    console.log('[RDS CRON MANAGER] RDS cron job is not running');
    return { success: false, message: 'RDS cron job is not running' };
  }
  
  try {
    rdsCronJob.stop();
    rdsCronStatus.isRunning = false;
    console.log('[RDS CRON MANAGER] RDS cron job stopped successfully');
    return { success: true, message: 'RDS cron job stopped successfully' };
  } catch (error) {
    console.error('[RDS CRON MANAGER] Error stopping RDS cron job:', error);
    return { success: false, message: error.message };
  }
}

// Function to restart the RDS cron job
export function restartRDSCron() {
  console.log('[RDS CRON MANAGER] Restarting RDS cron job...');
  
  const stopResult = stopRDSCron();
  if (!stopResult.success && stopResult.message !== 'RDS cron job is not running') {
    return stopResult;
  }
  
  // Wait a moment before starting
  setTimeout(() => {
    const startResult = startRDSCron();
    console.log('[RDS CRON MANAGER] Restart result:', startResult);
  }, 1000);
  
  return { success: true, message: 'RDS cron job restart initiated' };
}

// Function to get cron status
export function getCronStatus() {
  const status = {
    ...rdsCronStatus,
    nextRuns: calculateNextRuns().map(date => date.toLocaleString('he-IL')),
    uptime: rdsCronStatus.startTime ? Math.floor((new Date() - rdsCronStatus.startTime) / 1000) : 0
  };
  
  return status;
}

// Function to manually trigger RDS transmission
export async function triggerManualRDSTransmission() {
  console.log('[RDS CRON MANAGER] Manual RDS transmission triggered');
  await sendRDSDataScheduled();
  return { success: true, message: 'Manual RDS transmission completed' };
}

// Initialize the cron job when the module is loaded
export function initializeCronManager() {
  console.log('[RDS CRON MANAGER] Initializing cron manager...');
  const result = startRDSCron();
  
  if (result.success) {
    console.log('[RDS CRON MANAGER] Cron manager initialized successfully');
  } else {
    console.error('[RDS CRON MANAGER] Failed to initialize cron manager:', result.message);
  }
  
  return result;
}
