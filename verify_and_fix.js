import pg from 'pg';

const { Pool } = pg;

// Database configuration
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

async function verifyAndFix() {
  console.log('🔍 Verifying and fixing master schedule functionality...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log(`   Current time: ${result.rows[0].current_time}\n`);
    client.release();

    // Check table structure
    console.log('2. Checking schedule_slots table structure...');
    const tableStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Table structure retrieved');
    const existingFields = tableStructure.rows.map(col => col.column_name);
    console.log('   Existing columns:', existingFields.join(', '));
    
    // Check for required fields
    const requiredFields = ['is_master', 'slot_date', 'parent_slot_id', 'is_deleted'];
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    if (missingFields.length > 0) {
      console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
      console.log('   Adding missing fields...');
      
      // Add missing fields
      for (const field of missingFields) {
        let alterQuery = '';
        switch (field) {
          case 'is_master':
            alterQuery = 'ADD COLUMN is_master BOOLEAN DEFAULT FALSE';
            break;
          case 'slot_date':
            alterQuery = 'ADD COLUMN slot_date DATE';
            break;
          case 'parent_slot_id':
            alterQuery = 'ADD COLUMN parent_slot_id UUID REFERENCES schedule_slots(id)';
            break;
          case 'is_deleted':
            alterQuery = 'ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE';
            break;
        }
        
        if (alterQuery) {
          await pool.query(`ALTER TABLE schedule_slots ${alterQuery}`);
          console.log(`   ✅ Added ${field}`);
        }
      }
    } else {
      console.log('✅ All required fields exist');
    }
    console.log();

    // Create indexes if they don't exist
    console.log('3. Creating/verifying indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_master ON schedule_slots(is_master)',
      'CREATE INDEX IF NOT EXISTS idx_schedule_slots_slot_date ON schedule_slots(slot_date)',
      'CREATE INDEX IF NOT EXISTS idx_schedule_slots_parent_slot_id ON schedule_slots(parent_slot_id)',
      'CREATE INDEX IF NOT EXISTS idx_schedule_slots_is_deleted ON schedule_slots(is_deleted)'
    ];
    
    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    console.log('✅ Indexes created/verified');
    console.log();

    // Update existing slots
    console.log('4. Updating existing slots...');
    
    // Set slot_date for slots that don't have it
    const updateSlotDate = await pool.query(`
      UPDATE schedule_slots 
      SET slot_date = (
        SELECT date_trunc('week', CURRENT_DATE)::date + (day_of_week * interval '1 day')
      )
      WHERE slot_date IS NULL
    `);
    console.log(`   ✅ Updated ${updateSlotDate.rowCount} slots with slot_date`);
    
    // Mark existing slots as master
    const updateMaster = await pool.query(`
      UPDATE schedule_slots 
      SET is_master = true 
      WHERE is_master IS NULL OR is_master = false
    `);
    console.log(`   ✅ Updated ${updateMaster.rowCount} slots as master slots`);
    console.log();

    // Check current data
    console.log('5. Checking current data...');
    const dataCounts = await pool.query(`
      SELECT 
        'Total slots' as type, COUNT(*) as count
      FROM schedule_slots 
      WHERE is_deleted = false
      
      UNION ALL
      
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
    
    console.log('✅ Current data counts:');
    dataCounts.rows.forEach(row => {
      console.log(`   - ${row.type}: ${row.count}`);
    });
    console.log();

    // Create weekly instances for master slots if they don't exist
    console.log('6. Creating weekly instances for master slots...');
    const masterSlots = await pool.query(`
      SELECT id, day_of_week, start_time, end_time, show_name, host_name, 
             color, is_recurring, is_collection, is_prerecorded, has_lineup
      FROM schedule_slots 
      WHERE is_master = true AND is_deleted = false
    `);
    
    if (masterSlots.rows.length > 0) {
      console.log(`   Found ${masterSlots.rows.length} master slots to process`);
      let instancesCreated = 0;
      
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
            instancesCreated++;
          }
        }
      }
      console.log(`   ✅ Created ${instancesCreated} weekly instances`);
    } else {
      console.log('   No master slots found to process');
    }
    console.log();

    // Test the weekly schedule query
    console.log('7. Testing weekly schedule query...');
    const currentDate = new Date();
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const formattedStartDate = weekStart.toISOString().split('T')[0];
    const formattedEndDate = weekEnd.toISOString().split('T')[0];
    
    console.log(`   Testing week: ${formattedStartDate} to ${formattedEndDate}`);
    
    // Calculate week dates for each day of the week
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }
    
    // Test the weekly schedule query
    const weeklySlots = await pool.query(`
      WITH week_slots AS (
        SELECT 
          s.id, s.slot_date, s.start_time, s.end_time, s.show_name, s.host_name,
          s.has_lineup, s.color, s.is_prerecorded, s.is_collection, s.is_master,
          s.parent_slot_id, s.day_of_week, s.is_recurring, s.created_at, s.updated_at
        FROM schedule_slots s
        WHERE s.is_deleted = false 
        AND s.slot_date BETWEEN $1::date AND $2::date
      ),
      master_slots AS (
        SELECT 
          m.id, m.start_time, m.end_time, m.show_name, m.host_name,
          m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
          m.day_of_week, m.is_recurring, m.created_at, m.updated_at
        FROM schedule_slots m
        WHERE m.is_deleted = false 
        AND m.is_master = true
      ),
      master_instances_for_week AS (
        SELECT 
          'temp_' || m.id || '_' || $3::date as id,
          $3::date as slot_date,
          m.start_time, m.end_time, m.show_name, m.host_name,
          m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
          false as is_master,
          m.id as parent_slot_id, m.day_of_week, m.is_recurring,
          m.created_at, m.updated_at
        FROM master_slots m
        WHERE m.day_of_week = 0
        AND NOT EXISTS (
          SELECT 1 FROM week_slots w 
          WHERE w.parent_slot_id = m.id AND w.slot_date = $3::date
        )
        
        UNION ALL
        
        SELECT 
          'temp_' || m.id || '_' || $4::date as id,
          $4::date as slot_date,
          m.start_time, m.end_time, m.show_name, m.host_name,
          m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
          false as is_master,
          m.id as parent_slot_id, m.day_of_week, m.is_recurring,
          m.created_at, m.updated_at
        FROM master_slots m
        WHERE m.day_of_week = 1
        AND NOT EXISTS (
          SELECT 1 FROM week_slots w 
          WHERE w.parent_slot_id = m.id AND w.slot_date = $4::date
        )
        
        UNION ALL
        
        SELECT 
          'temp_' || m.id || '_' || $5::date as id,
          $5::date as slot_date,
          m.start_time, m.end_time, m.show_name, m.host_name,
          m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
          false as is_master,
          m.id as parent_slot_id, m.day_of_week, m.is_recurring,
          m.created_at, m.updated_at
        FROM master_slots m
        WHERE m.day_of_week = 2
        AND NOT EXISTS (
          SELECT 1 FROM week_slots w 
          WHERE w.parent_slot_id = m.id AND w.slot_date = $5::date
        )
        
        UNION ALL
        
        SELECT 
          'temp_' || m.id || '_' || $6::date as id,
          $6::date as slot_date,
          m.start_time, m.end_time, m.show_name, m.host_name,
          m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
          false as is_master,
          m.id as parent_slot_id, m.day_of_week, m.is_recurring,
          m.created_at, m.updated_at
        FROM master_slots m
        WHERE m.day_of_week = 3
        AND NOT EXISTS (
          SELECT 1 FROM week_slots w 
          WHERE w.parent_slot_id = m.id AND w.slot_date = $6::date
        )
        
        UNION ALL
        
        SELECT 
          'temp_' || m.id || '_' || $7::date as id,
          $7::date as slot_date,
          m.start_time, m.end_time, m.show_name, m.host_name,
          m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
          false as is_master,
          m.id as parent_slot_id, m.day_of_week, m.is_recurring,
          m.created_at, m.updated_at
        FROM master_slots m
        WHERE m.day_of_week = 4
        AND NOT EXISTS (
          SELECT 1 FROM week_slots w 
          WHERE w.parent_slot_id = m.id AND w.slot_date = $7::date
        )
        
        UNION ALL
        
        SELECT 
          'temp_' || m.id || '_' || $8::date as id,
          $8::date as slot_date,
          m.start_time, m.end_time, m.show_name, m.host_name,
          m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
          false as is_master,
          m.id as parent_slot_id, m.day_of_week, m.is_recurring,
          m.created_at, m.updated_at
        FROM master_slots m
        WHERE m.day_of_week = 5
        AND NOT EXISTS (
          SELECT 1 FROM week_slots w 
          WHERE w.parent_slot_id = m.id AND w.slot_date = $8::date
        )
        
        UNION ALL
        
        SELECT 
          'temp_' || m.id || '_' || $9::date as id,
          $9::date as slot_date,
          m.start_time, m.end_time, m.show_name, m.host_name,
          m.has_lineup, m.color, m.is_prerecorded, m.is_collection,
          false as is_master,
          m.id as parent_slot_id, m.day_of_week, m.is_recurring,
          m.created_at, m.updated_at
        FROM master_slots m
        WHERE m.day_of_week = 6
        AND NOT EXISTS (
          SELECT 1 FROM week_slots w 
          WHERE w.parent_slot_id = m.id AND w.slot_date = $9::date
        )
      )
      SELECT * FROM (
        SELECT * FROM week_slots
        UNION ALL
        SELECT * FROM master_instances_for_week
      ) combined_slots
      ORDER BY slot_date, start_time
    `, [formattedStartDate, formattedEndDate, ...weekDates]);
    
    console.log(`   ✅ Weekly schedule query returned ${weeklySlots.rows.length} slots`);
    if (weeklySlots.rows.length > 0) {
      console.log('   Sample slots:');
      weeklySlots.rows.slice(0, 3).forEach(slot => {
        console.log(`     - ${slot.show_name} (${slot.slot_date}, ${slot.start_time}-${slot.end_time})`);
      });
    }
    console.log();

    // Final verification
    console.log('8. Final verification...');
    const finalCounts = await pool.query(`
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
    
    console.log('✅ Final data counts:');
    finalCounts.rows.forEach(row => {
      console.log(`   - ${row.type}: ${row.count}`);
    });

    console.log('\n🎉 Master schedule verification and fix completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart the application with: pm2 restart all');
    console.log('2. Test the master schedule functionality in the admin panel');
    console.log('3. Verify weekly schedule shows inherited slots');
    console.log('4. Check that master schedule changes affect future weeks only');

  } catch (error) {
    console.error('❌ Verification and fix failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if PostgreSQL is running');
    console.error('2. Verify database credentials');
    console.error('3. Ensure the database exists and is accessible');
  } finally {
    await pool.end();
  }
}

verifyAndFix(); 