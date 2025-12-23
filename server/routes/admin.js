import express from 'express';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, switchDatabase } from '../../src/lib/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Endpoint to switch database type (admin only)
router.post('/database/switch', requireAdmin, async (req, res) => {
  const { type, config } = req.body;
  
  try {
    if (!type || !['local', 'supabase'].includes(type)) {
      throw new Error('Invalid database type. Must be either "local" or "supabase"');
    }

    if (type === 'local' && (!config || !config.host)) {
      throw new Error('Local database configuration is required');
    }

    if (type === 'supabase' && (!config || !config.connectionString)) {
      throw new Error('Supabase connection string is required');
    }
    
    // Prepare new environment variables
    const envConfig = type === 'local' ? {
      DB_TYPE: 'local',
      DB_HOST: config.host,
      DB_PORT: config.port || '5432',
      DB_NAME: config.database || 'radiodb',
      DB_USER: config.username || 'radiouser',
      DB_PASSWORD: config.password || 'radio123',
      DATABASE_URL: '' // Clear Supabase URL
    } : {
      DB_TYPE: 'supabase',
      DATABASE_URL: config.connectionString,
      // Clear local DB settings
      DB_HOST: '',
      DB_PORT: '',
      DB_NAME: '',
      DB_USER: '',
      DB_PASSWORD: ''
    };

    // Update process.env
    Object.entries(envConfig).forEach(([key, value]) => {
      if (value) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });

    // Try to switch database
    const result = await switchDatabase(type);
    if (!result.success) {
      throw new Error(result.error);
    }

    // Only save to .env if switch was successful
    const envPath = join(__dirname, '../../.env');
    const envContent = Object.entries(envConfig)
      .filter(([_, value]) => value) // Only save non-empty values
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    await fs.writeFile(envPath, envContent, 'utf8');

    res.json({ 
      success: true, 
      message: `Successfully switched to ${type} database`,
      config: envConfig
    });
  } catch (error) {
    console.error('Error switching database:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack 
    });
  }
});

// Endpoint to execute database schema (SECURE - only predefined schema, admin only)
router.post('/database/schema', requireAdmin, async (req, res) => {
  try {
    // Only allow predefined schema creation - no arbitrary SQL execution
    const predefinedSchema = `
      -- Create required tables if they don't exist
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        username TEXT,
        role TEXT DEFAULT 'user',
        is_admin BOOLEAN DEFAULT FALSE,
        title TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
      );

      CREATE TABLE IF NOT EXISTS shows (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        date DATE,
        time TEXT,
        slot_id UUID,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS show_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        show_id UUID REFERENCES shows(id),
        position INTEGER NOT NULL,
        name TEXT NOT NULL,
        title TEXT,
        details TEXT,
        phone TEXT,
        duration INTEGER,
        is_break BOOLEAN DEFAULT FALSE,
        is_note BOOLEAN DEFAULT FALSE,
        is_divider BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS interviewees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        title TEXT,
        phone TEXT,
        duration INTEGER,
        item_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schedule_slots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        day_of_week SMALLINT NOT NULL,
        start_time TIME WITHOUT TIME ZONE NOT NULL,
        end_time TIME WITHOUT TIME ZONE NOT NULL,
        show_name TEXT NOT NULL,
        host_name TEXT,
        color TEXT DEFAULT 'green',
        is_recurring BOOLEAN DEFAULT TRUE,
        is_collection BOOLEAN DEFAULT FALSE,
        is_prerecorded BOOLEAN DEFAULT FALSE,
        has_lineup BOOLEAN DEFAULT FALSE,
        is_modified BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
      );

      CREATE TABLE IF NOT EXISTS day_notes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date TEXT NOT NULL,
        note TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS email_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_name TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        subject_template TEXT NOT NULL DEFAULT 'ליינאפ תוכנית {{show_name}}',
        body_template TEXT NOT NULL,
        email_method TEXT DEFAULT 'smtp',
        smtp_host TEXT NOT NULL,
        smtp_port INTEGER NOT NULL,
        smtp_user TEXT NOT NULL,
        smtp_password TEXT NOT NULL,
        gmail_client_id TEXT DEFAULT '',
        gmail_client_secret TEXT DEFAULT '',
        gmail_redirect_uri TEXT DEFAULT '',
        gmail_refresh_token TEXT DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS email_recipients (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS work_arrangements (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type TEXT NOT NULL,
        week_start DATE NOT NULL,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS show_email_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        show_id UUID NOT NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        success BOOLEAN NOT NULL,
        error_message TEXT
      );

      -- Create trigger functions for updated_at timestamps
      CREATE OR REPLACE FUNCTION handle_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = timezone('utc'::text, now());
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create triggers
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'handle_schedule_slots_updated_at') THEN
          CREATE TRIGGER handle_schedule_slots_updated_at
          BEFORE UPDATE ON schedule_slots
          FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'day_notes_updated_at') THEN
          CREATE TRIGGER day_notes_updated_at
          BEFORE UPDATE ON day_notes
          FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at') THEN
          CREATE TRIGGER set_updated_at
          BEFORE UPDATE ON email_settings
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_system_settings_updated_at') THEN
          CREATE TRIGGER set_system_settings_updated_at
          BEFORE UPDATE ON system_settings
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `;
    
    const result = await query(predefinedSchema);
    if (result.error) {
      throw result.error;
    }
    
    res.json({ success: true, message: 'Database schema created successfully' });
  } catch (error) {
    console.error('Error creating database schema:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add database fix endpoint
router.post('/fix-master-schedule', async (req, res) => {
  try {
    console.log('Running master schedule database fix...');
    
    // Step 1: Add missing columns
    console.log('Adding missing columns...');
    await query(`
      ALTER TABLE schedule_slots 
      ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS slot_date DATE,
      ADD COLUMN IF NOT EXISTS parent_slot_id UUID REFERENCES schedule_slots(id),
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
    `);
    
    // Step 2: Create indexes
    console.log('Creating indexes...');
    await query('CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_master ON schedule_slots(is_master)');
    await query('CREATE INDEX IF NOT EXISTS idx_schedule_slots_slot_date ON schedule_slots(slot_date)');
    await query('CREATE INDEX IF NOT EXISTS idx_schedule_slots_parent_slot_id ON schedule_slots(parent_slot_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_deleted ON schedule_slots(is_deleted)');
    
    // Step 3: Update existing slots
    console.log('Updating existing slots...');
    await query(`
      UPDATE schedule_slots 
      SET slot_date = (
        SELECT date_trunc('week', CURRENT_DATE)::date + (day_of_week * interval '1 day')
      )
      WHERE slot_date IS NULL
    `);
    
    // Step 4: Mark existing slots as master
    console.log('Marking existing slots as master...');
    await query(`
      UPDATE schedule_slots 
      SET is_master = true 
      WHERE is_master IS NULL OR is_master = false
    `);
    
    // Step 5: Create weekly instances for existing master slots
    console.log('Creating weekly instances...');
    const masterSlots = await query(`
      SELECT id, day_of_week, start_time, end_time, show_name, host_name, 
             color, is_recurring, is_collection, is_prerecorded, has_lineup
      FROM schedule_slots 
      WHERE is_master = true AND is_deleted = false
    `);
    
    if (masterSlots.data && masterSlots.data.length > 0) {
      for (const masterSlot of masterSlots.data) {
        // Create instances for the next 12 weeks
        for (let weekOffset = 0; weekOffset <= 12; weekOffset++) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + (weekOffset * 7) + masterSlot.day_of_week);
          const formattedDate = futureDate.toISOString().split('T')[0];
          
          // Check if instance already exists
          const existingInstance = await query(`
            SELECT 1 FROM schedule_slots 
            WHERE parent_slot_id = $1 
            AND slot_date = $2 
            AND is_deleted = false
          `, [masterSlot.id, formattedDate]);
          
          if (!existingInstance.data || existingInstance.data.length === 0) {
            await query(`
              INSERT INTO schedule_slots (
                slot_date, start_time, end_time, show_name, host_name,
                has_lineup, color, is_prerecorded, is_collection,
                is_master, day_of_week, parent_slot_id, is_recurring, is_deleted,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10, $11, $12, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              formattedDate,
              masterSlot.start_time,
              masterSlot.end_time,
              masterSlot.show_name,
              masterSlot.host_name,
              masterSlot.has_lineup,
              masterSlot.color,
              masterSlot.is_prerecorded,
              masterSlot.is_collection,
              masterSlot.day_of_week,
              masterSlot.id,
              masterSlot.is_recurring
            ]);
          }
        }
      }
    }
    
    // Step 6: Verify the changes
    console.log('Verifying changes...');
    const verification = await query(`
      SELECT 
        'Master slots' as type, COUNT(*) as count
      FROM schedule_slots 
      WHERE is_master = true AND is_deleted = false
      
      UNION ALL
      
      SELECT 
        'Weekly instances' as type, COUNT(*) as count
      FROM schedule_slots 
      WHERE is_master = false AND parent_slot_id IS NOT NULL AND is_deleted = false
      
      UNION ALL
      
      SELECT 
        'Custom weekly slots' as type, COUNT(*) as count
      FROM schedule_slots 
      WHERE is_master = false AND parent_slot_id IS NULL AND is_deleted = false
    `);
    
    console.log('Master schedule database fix completed successfully!');
    
    res.json({
      success: true,
      message: 'Master schedule database fix completed successfully',
      data: verification.data
    });
    
  } catch (error) {
    console.error('Error running master schedule fix:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run master schedule fix',
      details: error.message
    });
  }
});

export default router; 