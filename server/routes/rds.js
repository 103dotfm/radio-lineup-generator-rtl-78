import express from 'express';
import { query } from '../../src/lib/db.js';
import { sendRDSDataToDevice, getRDSTransmissionLogs } from '../services/rds-telnet.js';
import { getCronStatus, restartRDSCron, triggerManualRDSTransmission } from '../services/cron-manager.js';

const router = express.Router();

// Get RDS settings
router.get('/settings', async (req, res) => {
  try {
    let result;
    try {
      result = await query(
        'SELECT * FROM rds_settings ORDER BY created_at DESC LIMIT 1'
      );
      
      // Ensure default_rt1 column exists (for backward compatibility)
      try {
        await query(`
          ALTER TABLE rds_settings 
          ADD COLUMN IF NOT EXISTS default_rt1 TEXT DEFAULT 'https://103.fm - Download our app from App Store & Play Store'
        `);
        // Update existing records if column was just added
        await query(`
          UPDATE rds_settings 
          SET default_rt1 = 'https://103.fm - Download our app from App Store & Play Store'
          WHERE default_rt1 IS NULL
        `);
        // Re-fetch after adding column
        result = await query(
          'SELECT * FROM rds_settings ORDER BY created_at DESC LIMIT 1'
        );
      } catch (alterError) {
        // Column might already exist, ignore error
        console.log('Column default_rt1 check:', alterError.message);
      }
    } catch (error) {
      console.log('RDS settings table not found, creating default settings');
      // Create the table and default settings
      await query(`
        CREATE TABLE IF NOT EXISTS rds_settings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          send_rds_on_program_change BOOLEAN DEFAULT true,
          rds_rt2 TEXT DEFAULT '',
          rds_rt3 TEXT DEFAULT '',
          default_rt1 TEXT DEFAULT 'https://103.fm - Download our app from App Store & Play Store',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create trigger for updated_at
      await query(`
        CREATE OR REPLACE FUNCTION update_rds_settings_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      
      await query(`
        DROP TRIGGER IF EXISTS update_rds_settings_updated_at ON rds_settings;
        CREATE TRIGGER update_rds_settings_updated_at
          BEFORE UPDATE ON rds_settings
          FOR EACH ROW
          EXECUTE FUNCTION update_rds_settings_updated_at()
      `);
      
      result = await query(
        'INSERT INTO rds_settings (send_rds_on_program_change, rds_rt2, rds_rt3, default_rt1) VALUES (true, \'\', \'\', \'https://103.fm - Download our app from App Store & Play Store\') RETURNING *'
      );
    }
    
    if (result && result.data && result.data.length > 0) {
      // Ensure default_rt1 has a value
      const settings = result.data[0];
      if (!settings.default_rt1) {
        settings.default_rt1 = 'https://103.fm - Download our app from App Store & Play Store';
      }
      res.json(settings);
    } else if (result && result.data && result.data.length === 0) {
      // Create default settings if none exist
      const defaultResult = await query(
        'INSERT INTO rds_settings (send_rds_on_program_change, rds_rt2, rds_rt3, default_rt1) VALUES (true, \'\', \'\', \'https://103.fm - Download our app from App Store & Play Store\') RETURNING *'
      );
      return res.json(defaultResult.data[0]);
    } else {
      res.status(500).json({ error: 'Failed to fetch RDS settings' });
    }
  } catch (error) {
    console.error('Error fetching RDS settings:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch RDS settings', details: error.message });
  }
});

// Update RDS settings
router.put('/settings', async (req, res) => {
  try {
    const { 
      send_rds_on_program_change, 
      rds_rt2, 
      rds_rt3, 
      default_rt1,
      override_enabled, 
      override_pty, 
      override_ms, 
      override_rt1 
    } = req.body;
    
    // Ensure default_rt1 column exists (for backward compatibility)
    try {
      await query(`
        ALTER TABLE rds_settings 
        ADD COLUMN IF NOT EXISTS default_rt1 TEXT DEFAULT 'https://103.fm - Download our app from App Store & Play Store'
      `);
      // Update existing records if column was just added
      await query(`
        UPDATE rds_settings 
        SET default_rt1 = 'https://103.fm - Download our app from App Store & Play Store'
        WHERE default_rt1 IS NULL
      `);
    } catch (alterError) {
      // Column might already exist, ignore error
      console.log('Column default_rt1 check:', alterError.message);
    }
    
    const result = await query(
      `UPDATE rds_settings 
       SET send_rds_on_program_change = $1, rds_rt2 = $2, rds_rt3 = $3, default_rt1 = $4,
           override_enabled = $5, override_pty = $6, override_ms = $7, override_rt1 = $8, 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM rds_settings ORDER BY created_at DESC LIMIT 1)
       RETURNING *`,
      [send_rds_on_program_change, rds_rt2, rds_rt3, default_rt1 || 'https://103.fm - Download our app from App Store & Play Store', override_enabled, override_pty, override_ms, override_rt1]
    );
    
    if (result.data.length === 0) {
      // Create new settings if none exist
      const createResult = await query(
        'INSERT INTO rds_settings (send_rds_on_program_change, rds_rt2, rds_rt3, default_rt1, override_enabled, override_pty, override_ms, override_rt1) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [send_rds_on_program_change, rds_rt2, rds_rt3, default_rt1 || 'https://103.fm - Download our app from App Store & Play Store', override_enabled, override_pty, override_ms, override_rt1]
      );
      return res.json(createResult.data[0]);
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating RDS settings:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to update RDS settings', details: error.message });
  }
});

// Get RDS data for a specific slot
router.get('/slot/:slotId', async (req, res) => {
  try {
    const { slotId } = req.params;
    
    const slotResult = await query(
      `SELECT s.rds_pty, s.rds_ms, s.rds_radio_text, s.rds_radio_text_translated, s.show_name, s.host_name
       FROM schedule_slots s
       WHERE s.id = $1`,
      [slotId]
    );
    
    if (slotResult.data.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    const settingsResult = await query(
      'SELECT rds_rt2, rds_rt3 FROM rds_settings ORDER BY created_at DESC LIMIT 1'
    );
    
    const slot = slotResult.data[0];
    const settings = settingsResult.data[0] || { rds_rt2: '', rds_rt3: '' };
    
    const rdsData = {
      pty: slot.rds_pty || 1,
      ms: slot.rds_ms || 0,
      radio_text: slot.rds_radio_text_translated || slot.rds_radio_text || '',
      rt2: settings.rds_rt2 || '',
      rt3: settings.rds_rt3 || ''
    };
    
    res.json(rdsData);
  } catch (error) {
    console.error('Error fetching RDS data for slot:', error);
    res.status(500).json({ error: 'Failed to fetch RDS data' });
  }
});

// Update RDS data for a specific slot
router.put('/slot/:slotId', async (req, res) => {
  try {
    const { slotId } = req.params;
    const { rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated } = req.body;
    
    const result = await query(
      `UPDATE schedule_slots 
       SET rds_pty = $1, rds_ms = $2, rds_radio_text = $3, rds_radio_text_translated = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated, slotId]
    );
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating RDS data for slot:', error);
    res.status(500).json({ error: 'Failed to update RDS data' });
  }
});

// Translation mappings endpoints
router.get('/translations', async (req, res) => {
  try {
    let result;
    try {
      result = await query('SELECT * FROM translation_mappings ORDER BY hebrew_text');
    } catch (error) {
      console.log('Translation mappings table not found, creating it');
      // Create the table
      await query(`
        CREATE TABLE IF NOT EXISTS translation_mappings (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          hebrew_text TEXT NOT NULL,
          english_text TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(hebrew_text)
        )
      `);
      
      // Create trigger for updated_at
      await query(`
        CREATE OR REPLACE FUNCTION update_translation_mappings_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      
      await query(`
        DROP TRIGGER IF EXISTS update_translation_mappings_updated_at ON translation_mappings;
        CREATE TRIGGER update_translation_mappings_updated_at
          BEFORE UPDATE ON translation_mappings
          FOR EACH ROW
          EXECUTE FUNCTION update_translation_mappings_updated_at()
      `);
      
      // Insert test data only if table was just created
      try {
        await query(`
          INSERT INTO translation_mappings (hebrew_text, english_text) VALUES
            ('עם', 'with'),
            ('ענת דוידוב', 'Anat Davidov'),
            ('אודי סגל', 'Udi Segal')
          ON CONFLICT (hebrew_text) DO NOTHING
        `);
      } catch (insertError) {
        console.log('Test data already exists or insert failed:', insertError.message);
      }
      
      result = await query('SELECT * FROM translation_mappings ORDER BY hebrew_text');
    }
    console.log('Translations result:', result.data);
    if (result && result.data) {
      res.json(result.data);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

router.post('/translations', async (req, res) => {
  try {
    const { hebrew_text, english_text } = req.body;
    
    if (!hebrew_text || !english_text) {
      return res.status(400).json({ error: 'Hebrew text and English text are required' });
    }
    
    let result = await query(
      'INSERT INTO translation_mappings (hebrew_text, english_text) VALUES ($1, $2) RETURNING *',
      [hebrew_text, english_text]
    );
    
    // Check if there was an error from the database layer
    if (result.error) {
      if (result.error.code === '42P01') { // Table doesn't exist
        console.log('Translation mappings table not found, creating it');
        // Create the table
        await query(`
          CREATE TABLE IF NOT EXISTS translation_mappings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            hebrew_text TEXT NOT NULL,
            english_text TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(hebrew_text)
          )
        `);
        
        // Create trigger for updated_at
        await query(`
          CREATE OR REPLACE FUNCTION update_translation_mappings_updated_at()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql
        `);
        
        await query(`
          DROP TRIGGER IF EXISTS update_translation_mappings_updated_at ON translation_mappings;
          CREATE TRIGGER update_translation_mappings_updated_at
            BEFORE UPDATE ON translation_mappings
            FOR EACH ROW
            EXECUTE FUNCTION update_translation_mappings_updated_at()
        `);
        
        // Now try the insert again
        result = await query(
          'INSERT INTO translation_mappings (hebrew_text, english_text) VALUES ($1, $2) RETURNING *',
          [hebrew_text, english_text]
        );
        
        // Check for duplicate key error in the retry
        if (result.error && result.error.code === '23505') {
          return res.status(409).json({ error: 'Translation mapping already exists' });
        }
      } else if (result.error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Translation mapping already exists' });
      } else {
        throw result.error;
      }
    }
    
    if (result && result.data && result.data[0]) {
      res.json(result.data[0]);
    } else {
      res.status(500).json({ error: 'Failed to create translation' });
    }
  } catch (error) {
    console.error('Error creating translation:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Translation mapping already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create translation' });
    }
  }
});

router.put('/translations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hebrew_text, english_text } = req.body;
    
    if (!hebrew_text || !english_text) {
      return res.status(400).json({ error: 'Hebrew text and English text are required' });
    }
    
    const result = await query(
      'UPDATE translation_mappings SET hebrew_text = $1, english_text = $2 WHERE id = $3 RETURNING *',
      [hebrew_text, english_text, id]
    );
    
    if (result.data && result.data.length === 0) {
      return res.status(404).json({ error: 'Translation mapping not found' });
    }
    
    res.json(result.data[0]);
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

router.delete('/translations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM translation_mappings WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.data && result.data.length === 0) {
      return res.status(404).json({ error: 'Translation mapping not found' });
    }
    
    res.json({ message: 'Translation mapping deleted successfully' });
  } catch (error) {
    console.error('Error deleting translation:', error);
    res.status(500).json({ error: 'Failed to delete translation' });
  }
});

// Generate translation using search and replace from translation mappings
router.post('/translate', async (req, res) => {
  try {
    const { show_name, host_name } = req.body;
    
    console.log('Translation request:', { show_name, host_name });
    
    if (!show_name) {
      return res.status(400).json({ error: 'Show name is required' });
    }
    
    // Prepare the text to translate
    let textToTranslate = show_name;
    if (host_name && host_name !== show_name) {
      textToTranslate = `${show_name} עם ${host_name}`;
    }
    
    console.log('Text to translate:', textToTranslate);
    
    // Get all translation mappings
    let translations = [];
    try {
      const translationsResult = await query('SELECT hebrew_text, english_text FROM translation_mappings ORDER BY LENGTH(hebrew_text) DESC');
      translations = translationsResult.data || [];
    } catch (error) {
      console.log('Translation mappings table not found, using empty array');
      translations = [];
    }
    
    let translatedText = textToTranslate;
    let allStringsFound = true;
    let foundStrings = [];
    
    // Apply translations (longest first to avoid partial matches)
    for (const mapping of translations) {
      if (translatedText.includes(mapping.hebrew_text)) {
        translatedText = translatedText.replace(new RegExp(mapping.hebrew_text, 'g'), mapping.english_text);
        foundStrings.push(mapping.hebrew_text);
      }
    }
    
    // Check if any Hebrew text remains (indicating untranslated strings)
    const hebrewRegex = /[\u0590-\u05FF]/; // Hebrew Unicode range
    if (hebrewRegex.test(translatedText)) {
      allStringsFound = false;
    }
    
    // Limit to 64 characters
    if (translatedText.length > 64) {
      translatedText = translatedText.substring(0, 64);
    }
    
    console.log(`Translation: "${textToTranslate}" -> "${translatedText}" (all found: ${allStringsFound})`);
    
    res.json({ 
      translated_text: translatedText,
      all_strings_found: allStringsFound,
      found_strings: foundStrings
    });
    
  } catch (error) {
    console.error('Error in translation endpoint:', error);
    res.status(500).json({ error: 'Failed to translate text' });
  }
});

// Get current RDS data (global settings + current slot data)
router.get('/current', async (req, res) => {
  try {
    // Get RDS settings (including override settings)
    const settingsResult = await query(
      'SELECT rds_rt2, rds_rt3, default_rt1, override_enabled, override_pty, override_ms, override_rt1 FROM rds_settings ORDER BY created_at DESC LIMIT 1'
    );
    
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
    
    console.log(`Current date (Local): ${currentDate}, Current time (Local): ${currentTime}, Day of week: ${dayOfWeek}`);
    
    // Get current slot data based on current date and time
    // Exclude master schedule slots (is_master = true) as they are templates, not actual scheduled shows
    // IMPORTANT: Only match slots with slot_date exactly equal to today's date
    // Handle both DATE and TIMESTAMP types by converting to date in Jerusalem timezone
    console.log(`[RDS QUERY] Searching for slot with slot_date = '${currentDate}' AND time between '${currentTime}'`);
    
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
    
    const settings = settingsResult.data?.[0] || { rds_rt2: '', rds_rt3: '', default_rt1: 'https://103.fm - Download our app from App Store & Play Store', override_enabled: false };
    const currentSlot = currentSlotResult.data?.[0] || null;
    
    console.log(`[RDS QUERY] Found current slot:`, currentSlot ? {
      show_name: currentSlot.show_name,
      slot_date: currentSlot.slot_date,
      slot_date_type: typeof currentSlot.slot_date,
      start_time: currentSlot.start_time,
      end_time: currentSlot.end_time,
      rds_radio_text: currentSlot.rds_radio_text,
      rds_radio_text_translated: currentSlot.rds_radio_text_translated
    } : 'No current slot found');
    
    // Debug: Check if there are any slots matching today's date and time (including wrong dates)
    const debugResult = await query(
      `SELECT show_name, slot_date, slot_date::text as slot_date_text, start_time, end_time, is_master
       FROM schedule_slots
       WHERE is_deleted = false 
         AND is_master = false
         AND start_time <= $1 
         AND end_time > $1
       ORDER BY slot_date DESC, start_time ASC
       LIMIT 10`,
      [currentTime]
    );
    console.log(`[DEBUG] All slots matching current time ${currentTime} (any date):`, debugResult.data);
    
    // Debug: Check what slots exist for today's date
    const todaySlotsResult = await query(
      `SELECT show_name, slot_date, slot_date::text as slot_date_text, start_time, end_time
       FROM schedule_slots
       WHERE is_deleted = false 
         AND is_master = false
         AND slot_date = $1::date
       ORDER BY start_time ASC`,
      [currentDate]
    );
    console.log(`[DEBUG] All slots for today's date (${currentDate}):`, todaySlotsResult.data);
    
    // Use override values if enabled, otherwise use slot values
    const useOverride = settings.override_enabled;
    
    // If no slot found and no override, use default values for night time
    let radioText = '';
    if (useOverride && settings.override_rt1) {
      radioText = settings.override_rt1;
    } else if (currentSlot) {
      radioText = currentSlot.rds_radio_text_translated || currentSlot.rds_radio_text || '';
    } else {
      // No show scheduled - use default night message from settings
      radioText = settings.default_rt1 || 'https://103.fm - Download our app from App Store & Play Store';
    }
    
    const rdsData = {
      pty: useOverride && settings.override_pty !== null ? settings.override_pty : (currentSlot?.rds_pty || 1),
      ms: useOverride && settings.override_ms !== null ? settings.override_ms : (currentSlot?.rds_ms || 0),
      radio_text: radioText,
      rt2: settings.rds_rt2 || '',
      rt3: settings.rds_rt3 || '',
      show_name: currentSlot?.show_name || '',
      host_name: currentSlot?.host_name || '',
      current_time: currentTime,
      current_date: currentDate,
      override_enabled: useOverride
    };
    
    res.json(rdsData);
  } catch (error) {
    console.error('Error getting current RDS data:', error);
    res.status(500).json({ error: 'Failed to get current RDS data' });
  }
});

// Send current RDS data to transmitter
router.post('/send-current', async (req, res) => {
  try {
    // Get current date and time in local timezone (Jerusalem/IDT)
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
    
    const currentDate = `${year}-${month}-${day}`; // YYYY-MM-DD format
    const currentTime = `${hour}:${minute}`; // HH:MM format
    
    // Get current RDS data based on current date and time
    // Exclude master schedule slots (is_master = true) as they are templates, not actual scheduled shows
    const currentDataResult = await query(
      `SELECT 
        s.rds_pty, s.rds_ms, s.rds_radio_text, s.rds_radio_text_translated, s.show_name, s.host_name,
        rs.rds_rt2, rs.rds_rt3
       FROM schedule_slots s
       CROSS JOIN (
         SELECT rds_rt2, rds_rt3 
         FROM rds_settings 
         ORDER BY created_at DESC 
         LIMIT 1
       ) rs
       WHERE s.is_deleted = false 
         AND s.is_master = false
         AND s.slot_date = $1::date
         AND s.start_time <= $2 
         AND s.end_time > $2
       ORDER BY s.start_time ASC
       LIMIT 1`,
      [currentDate, currentTime]
    );
    
    if (currentDataResult.data.length === 0) {
      return res.status(404).json({ error: 'No current slot data found for current time' });
    }
    
    const data = currentDataResult.data[0];
    
    const rdsData = {
      pty: data.rds_pty || 1,
      ms: data.rds_ms || 0,
      radio_text: data.rds_radio_text_translated || data.rds_radio_text || '',
      rt2: data.rds_rt2 || '',
      rt3: data.rds_rt3 || ''
    };
    
    // TODO: Implement actual RDS transmission via SSH/Telnet
    console.log('Current RDS data to send:', rdsData);
    
    // For now, just return success
    res.json({ 
      success: true, 
      message: 'Current RDS data sent to transmitter',
      data: rdsData 
    });
  } catch (error) {
    console.error('Error sending current RDS data:', error);
    res.status(500).json({ error: 'Failed to send current RDS data' });
  }
});

// Send RDS data to transmitter (placeholder for future implementation)
router.post('/send', async (req, res) => {
  try {
    const { slotId } = req.body;
    
    // Get RDS data for the slot
    const slotResult = await query(
      `SELECT s.rds_pty, s.rds_ms, s.rds_radio_text, s.rds_radio_text_translated, s.show_name, s.host_name
       FROM schedule_slots s
       WHERE s.id = $1`,
      [slotId]
    );
    
    if (slotResult.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    const settingsResult = await query(
      'SELECT rds_rt2, rds_rt3 FROM rds_settings ORDER BY created_at DESC LIMIT 1'
    );
    
    const slot = slotResult.rows[0];
    const settings = settingsResult.rows[0] || { rds_rt2: '', rds_rt3: '' };
    
    const rdsData = {
      pty: slot.rds_pty || 1,
      ms: slot.rds_ms || 0,
      radio_text: slot.rds_radio_text_translated || slot.rds_radio_text || '',
      rt2: settings.rds_rt2 || '',
      rt3: settings.rds_rt3 || ''
    };
    
    // TODO: Implement actual RDS transmission via SSH/Telnet
    console.log('RDS data to send:', rdsData);
    
    // For now, just return success
    res.json({ 
      success: true, 
      message: 'RDS data prepared for transmission',
      data: rdsData 
    });
  } catch (error) {
    console.error('Error sending RDS data:', error);
    res.status(500).json({ error: 'Failed to send RDS data' });
  }
});

// Generate and serve public RDS JSON file
router.get('/public-json', async (req, res) => {
  try {
    // Get current date and time in local timezone (Jerusalem/IDT)
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
    const jerusalemDateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const jerusalemTime = new Date(jerusalemDateStr + '+03:00'); // Approximate Jerusalem timezone offset
    const dayOfWeek = jerusalemTime.getUTCDay();
    
    // Get RDS settings
    const settingsResult = await query(
      'SELECT rds_rt2, rds_rt3 FROM rds_settings ORDER BY created_at DESC LIMIT 1'
    );
    
    // Get current slot data based on current date and time
    // Exclude master schedule slots (is_master = true) as they are templates, not actual scheduled shows
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
    
    const settings = settingsResult.data?.[0] || { rds_rt2: '', rds_rt3: '' };
    const currentSlot = currentSlotResult.data?.[0] || null;
    
    console.log(`[PUBLIC JSON] Current date: ${currentDate}, Current time: ${currentTime}`);
    console.log(`[PUBLIC JSON] Found slot:`, currentSlot ? {
      show_name: currentSlot.show_name,
      slot_date: currentSlot.slot_date,
      start_time: currentSlot.start_time,
      end_time: currentSlot.end_time
    } : 'No slot found');
    
    // Create the RDS JSON structure
    const rdsJson = {
      station: {
        name: "103fm"
      },
      rds_data: {
        pty: currentSlot?.rds_pty || 1,
        ms: currentSlot?.rds_ms || 0,
        radiotext: [
          {
            id: "RT1",
            message: currentSlot?.rds_radio_text_translated || currentSlot?.rds_radio_text || "",
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
        timestamp: now.toISOString(),
        language: "English"
      }
    };
    
    // Set CORS headers to allow public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    // Return the JSON
    res.json(rdsJson);
    
    console.log('Public RDS JSON generated:', {
      timestamp: rdsJson.metadata.timestamp,
      pty: rdsJson.rds_data.pty,
      ms: rdsJson.rds_data.ms,
      rt1: rdsJson.rds_data.radiotext[0].message,
      rt2: rdsJson.rds_data.radiotext[1].message,
      rt3: rdsJson.rds_data.radiotext[2].message
    });
    
  } catch (error) {
    console.error('Error generating public RDS JSON:', error);
    res.status(500).json({ error: 'Failed to generate RDS JSON' });
  }
});

// Send RDS data via telnet (manual trigger)
router.post('/send-via-telnet', async (req, res) => {
  try {
    console.log('Manual RDS telnet transmission requested...');
    
    const result = await sendRDSDataToDevice();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'RDS data sent successfully via telnet',
        data: result.data
      });
    } else if (result.skipped) {
      res.json({
        success: false,
        message: 'RDS telnet transmission skipped',
        reason: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'RDS telnet transmission failed',
        error: result.message
      });
    }
  } catch (error) {
    console.error('Error sending RDS data via telnet:', error);
    res.status(500).json({
      success: false,
      message: 'RDS telnet transmission failed',
      error: error.message
    });
  }
});

// Get RDS transmission logs
router.get('/transmission-logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await getRDSTransmissionLogs(limit);
    
    res.json({
      success: true,
      logs: logs
    });
  } catch (error) {
    console.error('Error getting RDS transmission logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get RDS transmission logs',
      error: error.message
    });
  }
});

// Get cron job status
router.get('/cron-status', async (req, res) => {
  try {
    const status = getCronStatus();
    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('Error getting cron status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cron status',
      error: error.message
    });
  }
});

// Restart RDS cron job
router.post('/restart-cron', async (req, res) => {
  try {
    const result = restartRDSCron();
    res.json({
      success: true,
      message: 'Cron job restart initiated',
      result: result
    });
  } catch (error) {
    console.error('Error restarting cron job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restart cron job',
      error: error.message
    });
  }
});

// Trigger manual RDS transmission
router.post('/trigger-transmission', async (req, res) => {
  try {
    const result = await triggerManualRDSTransmission();
    res.json({
      success: true,
      message: 'Manual transmission completed',
      result: result
    });
  } catch (error) {
    console.error('Error triggering manual transmission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger manual transmission',
      error: error.message
    });
  }
});

export default router;
