// Simple test script to verify master schedule functionality
const { Pool } = require('pg');

const pool = new Pool({
  user: 'iteam',
  password: 'iteam',
  host: 'localhost',
  port: 5432,
  database: 'radio_lineup'
});

async function testMasterSchedule() {
  console.log('Testing Master Schedule Functionality...\n');
  
  try {
    // 1. Check if required columns exist
    console.log('1. Checking database structure...');
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots'
    `);
    
    const columnNames = columns.rows.map(col => col.column_name);
    const requiredColumns = ['is_master', 'slot_date', 'parent_slot_id', 'is_deleted'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing columns: ${missingColumns.join(', ')}`);
      console.log('Please run the database migration first.');
      return;
    }
    console.log('✅ All required columns exist');
    
    // 2. Check current data
    console.log('\n2. Checking current data...');
    const counts = await pool.query(`
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
    
    counts.rows.forEach(row => {
      console.log(`   ${row.type}: ${row.count}`);
    });
    
    // 3. Test weekly schedule query
    console.log('\n3. Testing weekly schedule query...');
    const currentDate = new Date();
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const formattedStartDate = weekStart.toISOString().split('T')[0];
    const formattedEndDate = weekEnd.toISOString().split('T')[0];
    
    console.log(`   Testing week: ${formattedStartDate} to ${formattedEndDate}`);
    
    // Calculate week dates
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }
    
    // Test the query from the schedule route
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
    
    console.log(`   ✅ Query returned ${weeklySlots.rows.length} slots`);
    
    if (weeklySlots.rows.length > 0) {
      console.log('   Sample slots:');
      weeklySlots.rows.slice(0, 5).forEach(slot => {
        const isMaster = slot.is_master ? ' (Master)' : slot.parent_slot_id ? ' (Inherited)' : ' (Custom)';
        console.log(`     - ${slot.show_name}${isMaster} (${slot.slot_date}, ${slot.start_time}-${slot.end_time})`);
      });
    }
    
    // 4. Check if master slots are being inherited
    const inheritedSlots = weeklySlots.rows.filter(slot => slot.parent_slot_id);
    const customSlots = weeklySlots.rows.filter(slot => !slot.parent_slot_id && !slot.is_master);
    
    console.log(`\n4. Inheritance analysis:`);
    console.log(`   - Inherited slots: ${inheritedSlots.length}`);
    console.log(`   - Custom slots: ${customSlots.length}`);
    console.log(`   - Total slots: ${weeklySlots.rows.length}`);
    
    if (inheritedSlots.length > 0) {
      console.log('   ✅ Master schedule inheritance is working!');
    } else {
      console.log('   ⚠️  No inherited slots found. This might indicate:');
      console.log('      - No master slots exist');
      console.log('      - Master slots don\'t have proper day_of_week values');
      console.log('      - Weekly instances already exist for this week');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure PostgreSQL is running');
    console.error('2. Check database credentials');
    console.error('3. Verify the database exists');
    console.error('4. Run the database migration if needed');
  } finally {
    await pool.end();
  }
}

testMasterSchedule(); 