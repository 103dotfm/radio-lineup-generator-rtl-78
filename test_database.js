import { query } from './src/lib/db.js';

async function testDatabase() {
  console.log('Testing database connection and schema...\n');

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const connectionTest = await query('SELECT NOW() as current_time');
    if (connectionTest.error) {
      throw connectionTest.error;
    }
    console.log('✅ Database connection successful');
    console.log(`   Current time: ${connectionTest.data[0].current_time}\n`);

    // Check table structure
    console.log('2. Checking schedule_slots table structure...');
    const tableStructure = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots' 
      ORDER BY ordinal_position
    `);
    
    if (tableStructure.error) {
      throw tableStructure.error;
    }
    
    console.log('✅ Table structure retrieved');
    console.log('   Columns found:');
    tableStructure.data.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log();

    // Check for required fields
    console.log('3. Checking for required fields...');
    const requiredFields = ['is_master', 'slot_date', 'parent_slot_id', 'is_deleted'];
    const existingFields = tableStructure.data.map(col => col.column_name);
    
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields exist');
    } else {
      console.log('❌ Missing required fields:', missingFields);
      console.log('   Run fix_master_schedule.sql to add missing fields');
    }
    console.log();

    // Check data counts
    console.log('4. Checking data counts...');
    const counts = await query(`
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
    
    if (counts.error) {
      throw counts.error;
    }
    
    console.log('✅ Data counts:');
    counts.data.forEach(row => {
      console.log(`   - ${row.type}: ${row.count}`);
    });
    console.log();

    // Test master schedule query
    console.log('5. Testing master schedule query...');
    const masterSlots = await query(`
      SELECT id, show_name, day_of_week, start_time, end_time
      FROM schedule_slots
      WHERE is_master = true AND is_deleted = false
      ORDER BY day_of_week, start_time
      LIMIT 5
    `);
    
    if (masterSlots.error) {
      throw masterSlots.error;
    }
    
    console.log('✅ Master schedule query successful');
    console.log(`   Found ${masterSlots.data.length} master slots`);
    if (masterSlots.data.length > 0) {
      console.log('   Sample master slots:');
      masterSlots.data.forEach(slot => {
        console.log(`   - ${slot.show_name} (Day ${slot.day_of_week}, ${slot.start_time}-${slot.end_time})`);
      });
    }
    console.log();

    console.log('🎉 Database test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. If any required fields are missing, run: psql -h localhost -U radiouser -d radiodb -f fix_master_schedule.sql');
    console.log('2. Start the application: npm start');
    console.log('3. Test the master schedule functionality in the admin panel');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if PostgreSQL is running');
    console.error('2. Verify database credentials in .env file');
    console.error('3. Ensure database "radiodb" exists');
    console.error('4. Check if user "radiouser" has proper permissions');
  }
}

testDatabase(); 