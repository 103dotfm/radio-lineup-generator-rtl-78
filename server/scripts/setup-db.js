import { query } from '../../src/lib/db.js';

async function setupDatabase() {
  try {
    // Create tables if they don't exist
    await query(`
      CREATE TABLE IF NOT EXISTS schedule_slots_old (
        id SERIAL PRIMARY KEY,
        day_of_week INTEGER NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        show_name TEXT NOT NULL,
        host_name TEXT,
        has_lineup BOOLEAN DEFAULT false,
        color TEXT DEFAULT 'green',
        is_prerecorded BOOLEAN DEFAULT false,
        is_collection BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS shows_backup (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        date DATE,
        time TIME,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS show_items (
        id SERIAL PRIMARY KEY,
        show_id INTEGER REFERENCES shows_backup(id),
        name TEXT NOT NULL,
        title TEXT,
        details TEXT,
        position INTEGER,
        is_break BOOLEAN DEFAULT false,
        is_note BOOLEAN DEFAULT false,
        is_divider BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS email_settings (
        id SERIAL PRIMARY KEY,
        email_method TEXT DEFAULT 'smtp',
        smtp_host TEXT,
        smtp_port INTEGER,
        smtp_user TEXT,
        smtp_password TEXT,
        sender_name TEXT,
        sender_email TEXT,
        subject_template TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS email_recipients (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS show_email_logs (
        id SERIAL PRIMARY KEY,
        show_id INTEGER REFERENCES shows_backup(id),
        success BOOLEAN NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS producer_roles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        username TEXT,
        full_name TEXT,
        is_admin BOOLEAN DEFAULT false,
        role TEXT REFERENCES producer_roles(name),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert default system settings if they don't exist
    await query(`
      INSERT INTO system_settings (key, value)
      VALUES 
        ('schedule_xml_refresh_interval', '10'),
        ('schedule_data_offset', '0')
      ON CONFLICT (key) DO NOTHING;
    `);

    // Insert default producer roles if they don't exist
    await query(`
      INSERT INTO producer_roles (name, description)
      VALUES 
        ('admin', 'Administrator with full access'),
        ('producer', 'Regular producer with standard access'),
        ('guest', 'Guest user with limited access')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Insert default admin user if it doesn't exist
    await query(`
      INSERT INTO users (id, email, username, full_name, is_admin, role)
      VALUES 
        ('1', 'admin@example.com', 'admin', 'System Administrator', true, 'admin')
      ON CONFLICT (id) DO NOTHING;
    `);
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase(); 