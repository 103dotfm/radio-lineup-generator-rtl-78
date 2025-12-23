import net from 'net';
import { query } from '../../src/lib/db.js';

// Telnet configuration
const TELNET_SERVER = '82.81.38.216';
const TELNET_PORT = 10002;

// Function to get current RDS data
async function getCurrentRDSData() {
  try {
    // Get current date and time in local timezone (Jerusalem/IDT)
    // The database stores schedule times in local timezone
    const now = new Date();
    // Use Intl.DateTimeFormat to properly get Jerusalem date/time without timezone conversion issues
    const jerusalemFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = jerusalemFormatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;
    
    const currentDate = `${year}-${month}-${day}`; // YYYY-MM-DD format
    const currentTime = `${hour}:${minute}:${second}`; // HH:MM:SS format
    
    // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    // Create a date object in Jerusalem timezone for day of week calculation
    const jerusalemDateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const jerusalemTime = new Date(jerusalemDateStr + '+03:00'); // Approximate Jerusalem timezone offset
    const dayOfWeek = jerusalemTime.getUTCDay();
    
    console.log(`[RDS DATA] Getting RDS data for ${currentDate} at ${currentTime} (Local time), Day of week: ${dayOfWeek}`);
    
    // Get RDS settings (including override settings)
    const settingsResult = await query(
      'SELECT rds_rt2, rds_rt3, override_enabled, override_pty, override_ms, override_rt1, default_rt1 FROM rds_settings ORDER BY created_at DESC LIMIT 1'
    );
    
    // Get current slot data based on current date and time
    // Exclude master schedule slots (is_master = true) as they are templates, not actual scheduled shows
    // IMPORTANT: Only match slots with slot_date exactly equal to today's date
    console.log(`[RDS TELNET] Searching for slot with slot_date = '${currentDate}' AND time between '${currentTime}'`);
    
    const currentSlotResult = await query(
      `SELECT s.rds_pty, s.rds_ms, s.rds_radio_text, s.rds_radio_text_translated, s.show_name, s.host_name, s.start_time, s.end_time, s.slot_date
       FROM schedule_slots s
       WHERE s.is_deleted = false 
         AND s.is_master = false
         AND s.slot_date = $1::date
         AND s.start_time <= $2 
         AND s.end_time > $2
       ORDER BY s.start_time ASC
       LIMIT 1`,
      [currentDate, currentTime]
    );
    
    console.log(`[RDS TELNET] Found slot:`, currentSlotResult.data?.[0] ? {
      show_name: currentSlotResult.data[0].show_name,
      slot_date: currentSlotResult.data[0].slot_date,
      slot_date_type: typeof currentSlotResult.data[0].slot_date,
      start_time: currentSlotResult.data[0].start_time,
      end_time: currentSlotResult.data[0].end_time
    } : 'No slot found');
    
    const settings = settingsResult.data?.[0] || { rds_rt2: '', rds_rt3: '', override_enabled: false, default_rt1: 'https://103.fm - Download our app from App Store & Play Store' };
    const currentSlot = currentSlotResult.data?.[0] || null;
    
    console.log(`[RDS DATA] Found slot:`, currentSlot ? {
      show_name: currentSlot.show_name,
      rds_radio_text: currentSlot.rds_radio_text,
      rds_radio_text_translated: currentSlot.rds_radio_text_translated
    } : 'No slot found');
    
    // Use override values if enabled, otherwise use slot values
    const useOverride = settings.override_enabled;
    
    // If no slot found and no override, use default values for night time
    let rt1 = '';
    if (useOverride && settings.override_rt1) {
      rt1 = settings.override_rt1;
    } else if (currentSlot) {
      rt1 = currentSlot.rds_radio_text_translated || currentSlot.rds_radio_text || '';
    } else {
      // No show scheduled - use default night message from settings
      rt1 = settings.default_rt1 || 'https://103.fm - Download our app from App Store & Play Store';
    }
    
    const rdsData = {
      pty: useOverride && settings.override_pty !== null ? settings.override_pty : (currentSlot?.rds_pty || 1),
      ms: useOverride && settings.override_ms !== null ? settings.override_ms : (currentSlot?.rds_ms || 0),
      rt1: rt1,
      rt2: settings.rds_rt2 || '',
      rt3: settings.rds_rt3 || ''
    };
    
    console.log(`[RDS DATA] Final RDS data:`, rdsData);
    return rdsData;
  } catch (error) {
    console.error('Error getting current RDS data:', error);
    throw error;
  }
}

// Function to send RDS data via telnet
async function sendRDSDataViaTelnet(rdsData) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let connectionTimeout;
    let dataTimeout;
    
    // Set connection timeout
    connectionTimeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Telnet connection timeout'));
    }, 10000); // 10 seconds
    
    client.connect(TELNET_PORT, TELNET_SERVER, () => {
      console.log('Connected to RDS telnet server');
      clearTimeout(connectionTimeout);
      
      // Wait 3 seconds after connection
      setTimeout(() => {
        // Send enter key
        client.write('\r\n');
        
        // Send RDS data commands
        const commands = [
          `TEXT=${rdsData.rt1}`,
          `TEXT2=${rdsData.rt2}`,
          `TEXT3=${rdsData.rt3}`,
          `PTY=${rdsData.pty}`,
          `MS=${rdsData.ms}`
        ];
        
        let commandIndex = 0;
        
        const sendNextCommand = () => {
          if (commandIndex < commands.length) {
            const command = commands[commandIndex];
            console.log(`Sending command: ${command}`);
            client.write(command + '\r\n');
            commandIndex++;
            
            // Send next command after 1 second
            setTimeout(sendNextCommand, 1000);
          } else {
            // All commands sent, close connection
            setTimeout(() => {
              client.destroy();
              resolve({
                success: true,
                message: 'RDS data sent successfully via telnet',
                data: rdsData
              });
            }, 2000);
          }
        };
        
        // Start sending commands
        sendNextCommand();
      }, 3000);
    });
    
    client.on('data', (data) => {
      console.log('Received from telnet server:', data.toString());
    });
    
    client.on('error', (error) => {
      clearTimeout(connectionTimeout);
      clearTimeout(dataTimeout);
      console.error('Telnet connection error:', error);
      reject(error);
    });
    
    client.on('close', () => {
      clearTimeout(connectionTimeout);
      clearTimeout(dataTimeout);
      console.log('Telnet connection closed');
    });
  });
}

// Function to send RDS data (main function)
export async function sendRDSDataToDevice() {
  try {
    console.log('[RDS DEVICE] Starting RDS data transmission to device...');
    
    // Check if automatic RDS updates are enabled
    let autoUpdateEnabled = false;
    try {
      const settingsResult = await query(
        'SELECT send_rds_on_program_change FROM rds_settings ORDER BY created_at DESC LIMIT 1'
      );
      autoUpdateEnabled = settingsResult.data?.[0]?.send_rds_on_program_change || false;
    } catch (dbError) {
      console.error('[RDS DEVICE] Database error checking settings, assuming enabled:', dbError.message);
      autoUpdateEnabled = true; // Assume enabled if we can't check
    }
    
    if (!autoUpdateEnabled) {
      console.log('[RDS DEVICE] Automatic RDS updates disabled - skipping telnet transmission');
      return {
        success: false,
        message: 'Automatic RDS updates are disabled',
        skipped: true
      };
    }
    
    // Get current RDS data
    let rdsData;
    try {
      rdsData = await getCurrentRDSData();
    } catch (dataError) {
      console.error('[RDS DEVICE] Error getting RDS data, using fallback:', dataError.message);
      // Use fallback data if database query fails
      rdsData = {
        pty: 1,
        ms: 0,
        rt1: 'https://103.fm - Download our app from App Store & Play Store',
        rt2: 'Download our app from Play Store & App Store',
        rt3: 'Website: https://103fm.maariv.co.il | WhatsApp: 054-70-103-70'
      };
    }
    
    console.log('[RDS DEVICE] Sending data via telnet:', rdsData);
    
    // Send data via telnet with timeout protection
    const result = await Promise.race([
      sendRDSDataViaTelnet(rdsData),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Telnet operation timeout')), 30000)
      )
    ]);
    
    // Log the transmission
    try {
      await logRDSTransmission(rdsData, result.success, result.message);
    } catch (logError) {
      console.error('[RDS DEVICE] Error logging transmission (non-critical):', logError.message);
    }
    
    console.log('[RDS DEVICE] Transmission completed successfully');
    return result;
  } catch (error) {
    console.error('[RDS DEVICE] Error sending RDS data to device:', error);
    
    // Log the error
    try {
      await logRDSTransmission(null, false, error.message);
    } catch (logError) {
      console.error('[RDS DEVICE] Error logging RDS transmission:', logError);
    }
    
    // Return error instead of throwing to prevent cron job crashes
    return {
      success: false,
      message: error.message,
      error: true
    };
  }
}

// Function to log RDS transmission
async function logRDSTransmission(rdsData, success, message) {
  try {
    await query(
      `INSERT INTO rds_transmission_logs (
        transmission_time, 
        rds_data, 
        success, 
        message, 
        telnet_server, 
        telnet_port
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        new Date().toISOString(),
        rdsData ? JSON.stringify(rdsData) : null,
        success,
        message,
        TELNET_SERVER,
        TELNET_PORT
      ]
    );
  } catch (error) {
    console.error('Error logging RDS transmission:', error);
    // Don't throw error to avoid breaking the main function
  }
}

// Function to create RDS transmission logs table if it doesn't exist
export async function createRDSTransmissionLogsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS rds_transmission_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        transmission_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        rds_data JSONB,
        success BOOLEAN NOT NULL,
        message TEXT,
        telnet_server TEXT NOT NULL,
        telnet_port INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('RDS transmission logs table created/verified');
  } catch (error) {
    console.error('Error creating RDS transmission logs table:', error);
  }
}

// Function to get RDS transmission logs
export async function getRDSTransmissionLogs(limit = 50) {
  try {
    const result = await query(
      `SELECT * FROM rds_transmission_logs 
       ORDER BY transmission_time DESC 
       LIMIT $1`,
      [limit]
    );
    
    return result.data || [];
  } catch (error) {
    console.error('Error getting RDS transmission logs:', error);
    return [];
  }
}
