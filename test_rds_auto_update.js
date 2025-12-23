import { query } from './src/lib/db.js';

async function testRDSAutoUpdate() {
  console.log('=== Testing RDS Auto-Update Logic ===\n');
  
  try {
    // Test 1: Check current RDS settings
    console.log('1. Checking current RDS settings...');
    const settingsResult = await query(
      'SELECT send_rds_on_program_change FROM rds_settings ORDER BY created_at DESC LIMIT 1'
    );
    
    const autoUpdateEnabled = settingsResult.data?.[0]?.send_rds_on_program_change || false;
    console.log(`   Auto-update enabled: ${autoUpdateEnabled}`);
    
    // Test 2: Simulate the shouldUpdateCache logic
    console.log('\n2. Testing shouldUpdateCache logic...');
    
    const now = new Date();
    const nowMinutes = now.getMinutes();
    const nowHalfHour = nowMinutes >= 30 ? 30 : 0;
    
    console.log(`   Current time: ${now.toISOString()}`);
    console.log(`   Current minutes: ${nowMinutes}`);
    console.log(`   Current half-hour: ${nowHalfHour}`);
    
    // Simulate cache time (30 minutes ago)
    const cacheTime = new Date(now.getTime() - (30 * 60 * 1000));
    const cacheMinutes = cacheTime.getMinutes();
    const cacheHalfHour = cacheMinutes >= 30 ? 30 : 0;
    
    console.log(`   Cache time: ${cacheTime.toISOString()}`);
    console.log(`   Cache minutes: ${cacheMinutes}`);
    console.log(`   Cache half-hour: ${cacheHalfHour}`);
    
    // Check if we've crossed into a new half-hour period
    const crossedHalfHour = nowHalfHour !== cacheHalfHour;
    console.log(`   Crossed half-hour boundary: ${crossedHalfHour}`);
    
    if (crossedHalfHour) {
      console.log(`   ✅ Would trigger update (auto-update: ${autoUpdateEnabled})`);
      if (autoUpdateEnabled) {
        console.log('   ✅ Auto-update is ENABLED - cache would be updated');
      } else {
        console.log('   ❌ Auto-update is DISABLED - cache would NOT be updated');
      }
    } else {
      console.log('   ⏸️  No half-hour boundary crossed - no update needed');
    }
    
    // Test 3: Check next update time
    console.log('\n3. Next update times:');
    const nextUpdate30 = nowHalfHour === 0 ? 'XX:30' : 'XX:00';
    const nextUpdate00 = nowHalfHour === 30 ? 'XX:00' : 'XX:30';
    
    console.log(`   Next update at: ${nextUpdate30} (if currently in first half)`);
    console.log(`   Next update at: ${nextUpdate00} (if currently in second half)`);
    
    // Test 4: Test with different settings
    console.log('\n4. Testing with different settings...');
    
    // Simulate enabled setting
    console.log('   With auto-update ENABLED:');
    if (crossedHalfHour && autoUpdateEnabled) {
      console.log('   ✅ Would update cache');
    } else if (crossedHalfHour && !autoUpdateEnabled) {
      console.log('   ❌ Would NOT update cache (setting disabled)');
    } else {
      console.log('   ⏸️  No update needed (no boundary crossed)');
    }
    
    console.log('\n=== Test Summary ===');
    console.log('🎯 RDS Auto-Update Logic:');
    console.log(`   - Current setting: ${autoUpdateEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   - Half-hour boundary: ${crossedHalfHour ? 'CROSSED' : 'NOT CROSSED'}`);
    console.log(`   - Would update: ${crossedHalfHour && autoUpdateEnabled ? 'YES' : 'NO'}`);
    console.log('');
    console.log('📝 To test automatic updates:');
    console.log('   - Wait for XX:00 or XX:30 boundary');
    console.log('   - Or change the setting in admin panel');
    console.log('   - Check server logs for update messages');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRDSAutoUpdate();
