import pg from 'pg';

const { Pool } = pg;

// Database configuration based on the ecosystem.config.js
const pool = new Pool({
  user: 'iteam',
  password: 'iteam',
  host: 'localhost',
  port: 5432,
  database: 'radio_lineup',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function fixDatabase() {
  console.log('Starting master schedule database fix...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log(`   Current time: ${result.rows[0].current_time}\n`);
    client.release();

    // Step 1: Add missing columns
    console.log('2. Adding missing columns...');
    await pool.query(`
      ALTER TABLE schedule_slots 
      ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS slot_date DATE,
      ADD COLUMN IF NOT EXISTS parent_slot_id UUID REFERENCES schedule_slots(id),
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
    `);
    console.log('✅ Missing columns added\n');

    // Step 2: Create indexes
    console.log('3. Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_master ON schedule_slots(is_master)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_schedule_slots_slot_date ON schedule_slots(slot_date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_schedule_slots_parent_slot_id ON schedule_slots(parent_slot_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_deleted ON schedule_slots(is_deleted)');
    console.log('✅ Indexes created\n');

    // Step 3: Update existing slots
    console.log('4. Updating existing slots...');
    await pool.query(`
      UPDATE schedule_slots 
      SET slot_date = (
        SELECT date_trunc('week', CURRENT_DATE)::date + (day_of_week * interval '1 day')
      )
      WHERE slot_date IS NULL
    `);
    console.log('✅ Existing slots updated\n');

    // Step 4: Mark existing slots as master
    console.log('5. Marking existing slots as master...');
    await pool.query(`
      UPDATE schedule_slots 
      SET is_master = true 
      WHERE is_master IS NULL OR is_master = false
    `);
    console.log('✅ Existing slots marked as master\n');

    // Step 5: Create weekly instances for existing master slots
    console.log('6. Creating weekly instances...');
    const masterSlots = await pool.query(`
      SELECT id, day_of_week, start_time, end_time, show_name, host_name, 
             color, is_recurring, is_collection, is_prerecorded, has_lineup
      FROM schedule_slots 
      WHERE is_master = true AND is_deleted = false
    `);
    
    if (masterSlots.rows && masterSlots.rows.length > 0) {
      console.log(`   Found ${masterSlots.rows.length} master slots to process`);
      
      for (const masterSlot of masterSlots.rows) {
        // Create instances for the next 12 weeks
        for (let weekOffset = 0; weekOffset <= 12; weekOffset++) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + (weekOffset * 7) + masterSlot.day_of_week);
          const formattedDate = futureDate.toISOString().split('T')[0];
          
          // Check if instance already exists
          const existingInstance = await pool.query(`
            SELECT 1 FROM schedule_slots 
            WHERE parent_slot_id = $1 
            AND slot_date = $2 
            AND is_deleted = false
          `, [masterSlot.id, formattedDate]);
          
          if (existingInstance.rows.length === 0) {
            await pool.query(`
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
      console.log('✅ Weekly instances created\n');
    } else {
      console.log('   No master slots found to process\n');
    }
    
    // Step 6: Verify the changes
    console.log('7. Verifying changes...');
    const verification = await pool.query(`
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
    
    console.log('✅ Verification complete:');
    verification.rows.forEach(row => {
      console.log(`   - ${row.type}: ${row.count}`);
    });

    console.log('\n🎉 Master schedule database fix completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart the application with: pm2 restart all');
    console.log('2. Test the master schedule functionality in the admin panel');
    console.log('3. Verify weekly schedule shows inherited slots');

  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if PostgreSQL is running');
    console.error('2. Verify database credentials');
    console.error('3. Ensure the database exists and is accessible');
  } finally {
    await pool.end();
  }
}

fixDatabase(); 