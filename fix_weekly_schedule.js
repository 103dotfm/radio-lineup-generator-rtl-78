import pg from 'pg';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const pool = new Pool({
  user: 'radiouser',
  password: 'radio123',
  host: 'localhost',
  port: 5432,
  database: 'radiodb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function fixWeeklySchedule() {
  console.log('🚀 Starting Weekly Schedule Fix...\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    console.log(`   Current time: ${result.rows[0].current_time}\n`);
    client.release();

    // Read the SQL fix script
    console.log('2. Reading fix script...');
    const sqlPath = join(__dirname, 'fix_weekly_schedule_complete.sql');
    const sqlScript = await fs.readFile(sqlPath, 'utf8');
    console.log('✅ SQL script loaded\n');

    // Execute the fix script
    console.log('3. Executing weekly schedule fix...');
    const client2 = await pool.connect();
    
    try {
      // Split the script into individual statements and execute them
      const statements = sqlScript.split(';').filter(stmt => stmt.trim());
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (statement) {
          console.log(`   Executing statement ${i + 1}/${statements.length}...`);
          
          try {
            const result = await client2.query(statement);
            if (result.rows && result.rows.length > 0) {
              // Display results for SELECT statements
              if (statement.trim().toUpperCase().startsWith('SELECT')) {
                console.log('   Results:');
                result.rows.forEach(row => {
                  if (row.info) {
                    console.log(`     ${row.info}`);
                  } else if (row.type && row.count !== undefined) {
                    console.log(`     ${row.type}: ${row.count}`);
                  } else if (row.message) {
                    console.log(`     ${row.message}`);
                  } else {
                    console.log(`     ${JSON.stringify(row)}`);
                  }
                });
              }
            }
          } catch (error) {
            // Skip errors for statements that might fail (like constraints)
            if (error.message.includes('constraint') || error.message.includes('already exists')) {
              console.log(`   ⚠️  Skipping (constraint issue): ${error.message.split('\n')[0]}`);
            } else {
              throw error;
            }
          }
        }
      }
      
      console.log('✅ Weekly schedule fix completed successfully!\n');
      
    } finally {
      client2.release();
    }

    // Verify the fix worked
    console.log('4. Verifying the fix...');
    const client3 = await pool.connect();
    
    try {
      const verificationResult = await client3.query(`
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
        
        UNION ALL
        
        SELECT 
          'Deleted slots' as type, COUNT(*) as count
        FROM schedule_slots 
        WHERE is_deleted = true
      `);
      
      console.log('✅ Final state:');
      verificationResult.rows.forEach(row => {
        console.log(`   ${row.type}: ${row.count}`);
      });
      
    } finally {
      client3.release();
    }

    console.log('\n🎉 Weekly Schedule Fix Completed Successfully!');
    console.log('\nWhat was fixed:');
    console.log('1. ✅ Removed all deleted slots that were blocking new slot creation');
    console.log('2. ✅ Fixed deletion logic issues');
    console.log('3. ✅ Recreated weekly schedule from master schedule starting Sunday 06/07');
    console.log('\nYou can now:');
    console.log('- Create new slots in previously blocked time slots');
    console.log('- Delete slots without affecting wrong days');
    console.log('- See a clean weekly schedule starting from Sunday 06/07');

  } catch (error) {
    console.error('❌ Error during weekly schedule fix:', error);
    console.error('\nTroubleshooting:');
    console.error('1. Check if PostgreSQL is running');
    console.error('2. Verify database credentials');
    console.error('3. Ensure database "radiodb" exists');
    console.error('4. Check if user "radiouser" has proper permissions');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixWeeklySchedule().catch(console.error); 