import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import fs from 'fs-extra';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { pool } from '../src/lib/db.js';
import storageRoutes from './routes/storage.js';
import adminRoutes from './routes/admin.js';
import scheduleRoutes from './routes/schedule.js';
import emailRoutes from './routes/email.js';
import databaseRoutes from './routes/database.js';
import producerRolesRoutes from './routes/producer-roles.js';
import producerAssignmentsRoutes from './routes/producer-assignments.js';
import producerAssignmentSkipsRoutes from './routes/producer-assignment-skips.js';
import producerWorkArrangementsRoutes from './routes/producer-work-arrangements.js';
import workArrangementsRoutes from './routes/work-arrangements.js';
import authRoutes from './routes/auth.js';
import dayNotesRoutes from './routes/day-notes.js';
import digitalWorkArrangementsRoutes from './routes/digital-work-arrangements.js';
import digitalShiftsRoutes from './routes/digital-shifts.js';
import digitalShiftCustomRowsRoutes from './routes/digital-shift-custom-rows.js';
import systemSettingsRoutes from './routes/system-settings.js';
import showItemsRoutes from './routes/show-items.js';
import showsRoutes from './routes/shows.js';
import showsBackupRoutes from './routes/shows-backup.js';
import showItemsSearchRoutes from './routes/show-items-search.js';
import intervieweesRoutes from './routes/interviewees.js';
import workerDivisionsRoutes from './routes/worker-divisions.js';
import divisionsRoutes from './routes/divisions.js';
import debugRoutes from './routes/debug.js';
import setupCronJobs from './cron.js';
import workersRoutes from './routes/workers.js';
import fixWeeklyRoutes from './routes/fix-weekly.js';
import studioScheduleRoutes from './routes/studio-schedule.js';
import studioScheduleEnhancedRoutes from './routes/studio-schedule-enhanced.js';
import studioScheduleV2Routes from './routes/studio-schedule-v2.js';
import engineerWorkArrangementsRoutes from './routes/engineer-work-arrangements.js';
import backupRoutes from './routes/backup.js';
import rdsRoutes from './routes/rds.js';
import prizesRoutes from './routes/prizes.js';
import storageManagementRoutes from './routes/storage-management.js';
import lineupImportRoutes from './routes/lineup-import.js';

// Load environment variables
dotenv.config();

// Log all environment variables (excluding sensitive data)
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_TYPE: process.env.DB_TYPE,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  HOST: process.env.HOST
});

const app = express();
const PORT = process.env.PORT || 5174;

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Global request logger
app.use((req, res, next) => {
  console.log('INCOMING:', req.method, req.url);
  next();
});

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://192.168.10.121:5173',
  'http://192.168.10.121:5174',
  'http://192.168.10.121:5175',
  'http://192.168.10.121:1',  // Allow requests from this special port
  'http://192.168.10.121',  // Local network access
  'http://212.179.162.102:8080',  // Remote access IP
  'http://logger.103.fm:8080',  // Remote access domain
  'https://l.103.fm:8080',  // Remote access domain
  'http://l.103.fm:8080',  // Remote access domain (http)
  'http://212.179.162.102',  // Remote access IP without port
  'http://logger.103.fm',  // Remote access domain without port
  'http://l.103.fm'  // Remote access domain without port
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('Request with no origin');
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('Blocked origin:', origin);
      return callback(null, false);
    }
    console.log('Allowed origin:', origin);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));

// Enable JSON parsing for all HTTP methods, including DELETE
app.use(express.json({ type: 'application/json' }));

app.use(cookieParser());

// Serve static files from storage directory
app.use('/storage', express.static(join(__dirname, '../storage-new')));
// Also serve at /storage-new for compatibility with existing URLs
app.use('/storage-new', express.static(join(__dirname, '../storage-new')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', {
    error: err,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Configure storage for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const bucket = req.params.bucket || 'lovable';
    const dir = join(__dirname, '../storage', bucket);
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/producer-roles', producerRolesRoutes);
app.use('/api/producer-assignments', producerAssignmentsRoutes);
app.use('/api/producer-assignment-skips', producerAssignmentSkipsRoutes);
app.use('/api/producer-work-arrangements', producerWorkArrangementsRoutes);
app.use('/api/work-arrangements', workArrangementsRoutes);
app.use('/api/day-notes', dayNotesRoutes);
app.use('/api/digital-work-arrangements', digitalWorkArrangementsRoutes);
app.use('/api/digital-shifts', digitalShiftsRoutes);
app.use('/api/digital-shift-custom-rows', digitalShiftCustomRowsRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
// Backward-compatible alias to support underscore endpoint used by the frontend supabase-like client
app.use('/api/system_settings', systemSettingsRoutes);
app.use('/api/show-items', showItemsRoutes);
app.use('/api/shows', showsRoutes);
app.use('/api/shows-backup', showsBackupRoutes);
app.use('/api/show-items-search', showItemsSearchRoutes);
app.use('/api/interviewees', intervieweesRoutes);
app.use('/api/worker-divisions', workerDivisionsRoutes);
app.use('/api/divisions', divisionsRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/fix-weekly', fixWeeklyRoutes);
app.use('/api/studio-schedule', studioScheduleRoutes);
app.use('/api/studio-schedule-enhanced', studioScheduleEnhancedRoutes);
app.use('/api/studio-schedule-v2', studioScheduleV2Routes);
app.use('/api/engineer-work-arrangements', engineerWorkArrangementsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/rds', rdsRoutes);
app.use('/api/prizes', prizesRoutes);
app.use('/api/storage-management', storageManagementRoutes);
app.use('/api/lineup-import', lineupImportRoutes);

// Import RDS telnet service
import { sendRDSDataToDevice, createRDSTransmissionLogsTable } from './services/rds-telnet.js';
import { initializeCronManager } from './services/cron-manager.js';

// Global cache for RDS JSON data
let rdsJsonCache = null;
let rdsJsonCacheTime = null;

// Function to check if cache should be updated (every 30 minutes at XX:00 and XX:30)
async function shouldUpdateCache() {
  if (!rdsJsonCacheTime) return true;
  
  const now = new Date();
  const cacheTime = new Date(rdsJsonCacheTime);
  const timeDiff = now - cacheTime;
  
  // Update if more than 30 minutes have passed
  if (timeDiff > 30 * 60 * 1000) return true;
  
  // Update at XX:00 and XX:30
  const nowMinutes = now.getMinutes();
  const cacheMinutes = cacheTime.getMinutes();
  
  // Determine which half-hour we're in (0-29 = first half, 30-59 = second half)
  const nowHalfHour = nowMinutes >= 30 ? 30 : 0;
  const cacheHalfHour = cacheMinutes >= 30 ? 30 : 0;
  
  // Update if we've crossed into a new half-hour period
  if (nowHalfHour !== cacheHalfHour) {
    console.log(`Cache update triggered: crossed from ${cacheHalfHour} to ${nowHalfHour} minute mark`);
    
    // Check if automatic RDS updates are enabled
    try {
      const { query } = await import('../src/lib/db.js');
      const settingsResult = await query(
        'SELECT send_rds_on_program_change FROM rds_settings ORDER BY created_at DESC LIMIT 1'
      );
      
      const autoUpdateEnabled = settingsResult.data?.[0]?.send_rds_on_program_change || false;
      
      if (autoUpdateEnabled) {
        console.log('Automatic RDS updates enabled - proceeding with cache update');
        return true;
      } else {
        console.log('Automatic RDS updates disabled - skipping cache update');
        return false;
      }
    } catch (error) {
      console.error('Error checking RDS auto-update setting:', error);
      // If we can't check the setting, default to updating (safe fallback)
      return true;
    }
  }
  
  return false;
}

// Function to generate RDS JSON data
async function generateRDSJson() {
  try {
    // Import the query function
    const { query } = await import('../src/lib/db.js');
    
    // Get current date and time (same as /api/rds/current endpoint)
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    
    console.log(`Generating RDS JSON for ${currentDate} at ${currentTime} (UTC time)`);
    
    // Get RDS settings (including override settings)
    const settingsResult = await query(
      'SELECT rds_rt2, rds_rt3, default_rt1, override_enabled, override_pty, override_ms, override_rt1 FROM rds_settings ORDER BY created_at DESC LIMIT 1'
    );
    
    // Get current slot data based on current date and time
    const currentSlotResult = await query(
      `SELECT s.rds_pty, s.rds_ms, s.rds_radio_text, s.rds_radio_text_translated, s.show_name, s.host_name, s.start_time, s.end_time
       FROM schedule_slots s
       WHERE s.is_deleted = false 
         AND s.slot_date = $1
         AND s.start_time <= $2 
         AND s.end_time > $2
       ORDER BY s.start_time ASC
       LIMIT 1`,
      [currentDate, currentTime]
    );
    
    const settings = settingsResult.data?.[0] || { rds_rt2: '', rds_rt3: '', default_rt1: 'https://103.fm - Download our app from App Store & Play Store', override_enabled: false };
    const currentSlot = currentSlotResult.data?.[0] || null;
    
    // Use override values if enabled, otherwise use slot values
    const useOverride = settings.override_enabled;
    
    // Determine RT1 message
    let rt1Message = '';
    if (useOverride && settings.override_rt1) {
      rt1Message = settings.override_rt1;
    } else if (currentSlot) {
      rt1Message = currentSlot.rds_radio_text_translated || currentSlot.rds_radio_text || '';
    } else {
      // No show scheduled - use default night message from settings
      rt1Message = settings.default_rt1 || 'https://103.fm - Download our app from App Store & Play Store';
    }
    
    // Create the RDS JSON structure with Israel timezone timestamp
    const israelTime = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours for Israel time
    
    const rdsJson = {
      station: {
        name: "103fm"
      },
      rds_data: {
        pty: useOverride && settings.override_pty !== null ? settings.override_pty : (currentSlot?.rds_pty || 1),
        ms: useOverride && settings.override_ms !== null ? settings.override_ms : (currentSlot?.rds_ms || 0),
        radiotext: [
          {
            id: "RT1",
            message: rt1Message,
            priority: 1
          },
          {
            id: "RT2",
            message: settings.rds_rt2 || "",
            priority: 2
          },
          {
            id: "RT3",
            message: settings.rds_rt3 || "",
            priority: 3
          }
        ]
      },
      metadata: {
        timestamp: israelTime.toISOString(),
        language: "English"
      }
    };
    
    return rdsJson;
  } catch (error) {
    console.error('Error generating RDS JSON:', error);
    throw error;
  }
}

// Public RDS JSON endpoint with caching
app.get('/rds.json', async (req, res) => {
  try {
    // Check if cache should be updated
    const shouldUpdate = await shouldUpdateCache();
    if (shouldUpdate) {
      console.log('Updating RDS JSON cache...');
      rdsJsonCache = await generateRDSJson();
      rdsJsonCacheTime = new Date();
      console.log('RDS JSON cache updated at:', rdsJsonCacheTime.toISOString());
    } else {
      console.log('Serving RDS JSON from cache (last updated:', rdsJsonCacheTime?.toISOString(), ')');
    }
    
    // Set CORS headers to allow public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    // Set cache headers for 30 minutes
    res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 minutes
    res.setHeader('Expires', new Date(Date.now() + 30 * 60 * 1000).toUTCString());
    
    // Return the cached JSON
    res.json(rdsJsonCache);
    
    // Check if we should update again for the log message
    const willUpdateNextTime = await shouldUpdateCache();
    
    console.log('Public RDS JSON served:', {
      timestamp: rdsJsonCache.metadata.timestamp,
      pty: rdsJsonCache.rds_data.pty,
      ms: rdsJsonCache.rds_data.ms,
      rt1: rdsJsonCache.rds_data.radiotext[0].message,
      rt2: rdsJsonCache.rds_data.radiotext[1].message,
      rt3: rdsJsonCache.rds_data.radiotext[2].message,
      fromCache: !shouldUpdate
    });
    
  } catch (error) {
    console.error('Error serving public RDS JSON:', error);
    res.status(500).json({ error: 'Failed to generate RDS JSON' });
  }
});

// Cache invalidation endpoint for manual updates
app.post('/api/rds/invalidate-cache', async (req, res) => {
  try {
    console.log('Invalidating RDS JSON cache...');
    
    // Force cache update
    rdsJsonCache = await generateRDSJson();
    rdsJsonCacheTime = new Date();
    
    console.log('RDS JSON cache invalidated and updated at:', rdsJsonCacheTime.toISOString());
    
    // Send RDS data via telnet for manual update
    try {
      console.log('Sending RDS data via telnet (manual update)...');
      const telnetResult = await sendRDSDataToDevice();
      if (telnetResult.success) {
        console.log('RDS data sent successfully via telnet (manual update):', telnetResult.message);
      } else if (telnetResult.skipped) {
        console.log('RDS telnet transmission skipped (manual update):', telnetResult.message);
      } else {
        console.log('RDS telnet transmission failed (manual update):', telnetResult.message);
      }
    } catch (telnetError) {
      console.error('Error sending RDS data via telnet (manual update):', telnetError);
    }
    
    res.json({ 
      success: true, 
      message: 'RDS JSON cache invalidated and updated',
      timestamp: rdsJsonCache.metadata.timestamp
    });
    
  } catch (error) {
    console.error('Error invalidating RDS JSON cache:', error);
    res.status(500).json({ error: 'Failed to invalidate RDS JSON cache' });
  }
});

// Legacy API endpoints
app.get('/schedule.xml', (req, res) => {
  res.redirect(301, '/api/schedule/xml');
});

app.get('/schedule.json', (req, res) => {
  res.redirect(301, '/api/schedule/json');
});

// API root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Radio Lineup Generator API Server' });
});

// Test database connection
const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Database connection successful');
    const result = await client.query('SELECT NOW()');
    console.log('Database query successful:', result.rows[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection error:', {
      error,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return false;
  }
};

// Start server
const startServer = () => {
  return new Promise(async (resolve, reject) => {
    // Test database connection before starting server
    const dbConnected = await testDbConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Not starting server.');
      reject(new Error('Database connection failed'));
      return;
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`API Server is running on port ${PORT}`);
      console.log(`Local: http://localhost:${PORT}`);
      console.log(`Network: http://192.168.10.121:${PORT}`);
      
      // Setup cron jobs
      setupCronJobs();
      
      // Initialize RDS cron manager
      initializeCronManager();
      
      // Initialize RDS transmission logs table
      createRDSTransmissionLogsTable().then(() => {
        console.log('RDS transmission logs table initialized');
      }).catch(error => {
        console.error('Error initializing RDS transmission logs table:', error);
      });
      
      resolve(server);
    });

    server.on('error', (error) => {
      console.error('Server error:', {
        error,
        message: error.message,
        stack: error.stack,
        code: error.code
      });

      if (error.syscall !== 'listen') {
        reject(error);
        return;
      }

      switch (error.code) {
        case 'EACCES':
          reject(new Error(`Port ${PORT} requires elevated privileges`));
          break;
        case 'EADDRINUSE':
          reject(new Error(`Port ${PORT} is already in use`));
          break;
        default:
          reject(error);
      }
    });
  });
};

// Start the server
startServer()
  .then(server => {
    process.on('SIGTERM', () => {
      console.log('Received SIGTERM. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  })
  .catch(error => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

export default app;
