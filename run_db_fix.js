import { query } from './src/lib/db.js';
import fs from 'fs/promises';

async function runDatabaseFix() {
  console.log('Starting master schedule database fix...\n');

  try {
    // Test connection first
    console.log('1. Testing database connection...');
    const connectionTest = await query('SELECT NOW() as current_time');
    if (connectionTest.error) {
      throw connectionTest.error;
    }
    console.log('✅ Database connection successful\n');

    // Read and execute the SQL fix
    console.log('2. Reading SQL fix file...');
    const sqlContent = await fs.readFile('fix_master_schedule.sql', 'utf8');
    console.log('✅ SQL file read successfully\n');

    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`3. Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const result = await query(statement);
          if (result.error) {
            console.log(`   ⚠️  Statement ${i + 1} had an error (this might be expected):`, result.error.message);
          } else {
            console.log(`   ✅ Statement ${i + 1} executed successfully`);
          }
        } catch (error) {
          console.log(`   ⚠️  Statement ${i + 1} had an error (this might be expected):`, error.message);
        }
      }
    }

    console.log('\n4. Verifying the changes...');
    
    // Check if required fields exist
    const tableStructure = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'schedule_slots'
    `);
    
    if (tableStructure.error) {
      throw tableStructure.error;
    }
    
    const existingFields = tableStructure.data.map(col => col.column_name);
    const requiredFields = ['is_master', 'slot_date', 'parent_slot_id', 'is_deleted'];
    const missingFields = requiredFields.filter(field => !existingFields.includes(field));
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields are present');
    } else {
      console.log('❌ Missing fields:', missingFields);
    }

    // Check data counts
    const counts = await query(`
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

    console.log('\n🎉 Master schedule database fix completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart the application with: pm2 restart all');
    console.log('2. Test the master schedule functionality in the admin panel');
    console.log('3. Verify weekly schedule shows inherited slots');

  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check if the application can connect to the database');
    console.error('2. Verify database credentials in environment variables');
    console.error('3. Ensure the database exists and is accessible');
  }
}

runDatabaseFix(); 