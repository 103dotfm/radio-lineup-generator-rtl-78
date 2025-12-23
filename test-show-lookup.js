import { query } from './src/lib/db.js';

async function testShowLookup() {
  try {
    console.log('Testing show lookup for ID: 901d2e93-d0c2-4558-b447-c3ef7d473a66');
    
    // Test shows table first
    console.log('\n1. Checking shows table...');
    let showResult = await query(
      'SELECT id, name, date, time, notes FROM shows WHERE id = $1',
      ['901d2e93-d0c2-4558-b447-c3ef7d473a66']
    );
    
    if (showResult.data && showResult.data.length > 0) {
      console.log('✅ Found in shows table:', showResult.data[0]);
    } else {
      console.log('❌ Not found in shows table');
      
      // Try shows_backup table
      console.log('\n2. Checking shows_backup table...');
      showResult = await query(
        'SELECT id, name, date, time, notes FROM shows_backup WHERE id = $1',
        ['901d2e93-d0c2-4558-b447-c3ef7d473a66']
      );
      
      if (showResult.data && showResult.data.length > 0) {
        console.log('✅ Found in shows_backup table:', showResult.data[0]);
      } else {
        console.log('❌ Not found in shows_backup table either');
      }
    }
    
    // Check what shows exist in both tables
    console.log('\n3. Checking what shows exist...');
    const showsCount = await query('SELECT COUNT(*) as count FROM shows');
    const showsBackupCount = await query('SELECT COUNT(*) as count FROM shows_backup');
    
    console.log(`Shows table has ${showsCount.data[0].count} records`);
    console.log(`Shows_backup table has ${showsBackupCount.data[0].count} records`);
    
    // Show a few examples from each table
    const showsSample = await query('SELECT id, name FROM shows ORDER BY created_at DESC LIMIT 3');
    const showsBackupSample = await query('SELECT id, name FROM shows_backup ORDER BY created_at DESC LIMIT 3');
    
    console.log('\nSample from shows table:');
    showsSample.data.forEach(show => console.log(`  ${show.id}: ${show.name}`));
    
    console.log('\nSample from shows_backup table:');
    showsBackupSample.data.forEach(show => console.log(`  ${show.id}: ${show.name}`));
    
  } catch (error) {
    console.error('❌ Error testing show lookup:', error);
  }
}

testShowLookup(); 