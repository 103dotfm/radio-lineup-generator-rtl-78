const testCurrentShow = async () => {
  console.log('Testing Current Show Detection...\n');

  try {
    // Test the updated endpoint
    const response = await fetch('http://localhost:5174/api/rds/current');
    const data = await response.json();
    
    console.log('✅ Current RDS Data:');
    console.log(`   Current Time: ${data.current_time}`);
    console.log(`   Current Day: ${data.current_day} (0=Sunday, 1=Monday, ..., 6=Saturday)`);
    console.log(`   Show Name: "${data.show_name}"`);
    console.log(`   Host Name: "${data.host_name}"`);
    console.log(`   PTY: ${data.pty}`);
    console.log(`   MS: ${data.ms}`);
    console.log(`   Radio Text: "${data.radio_text}"`);
    console.log(`   RT2: "${data.rt2}"`);
    console.log(`   RT3: "${data.rt3}"`);
    
    // Check if we found a current show
    if (data.show_name) {
      console.log('\n🎉 SUCCESS: Found currently airing show!');
      console.log(`   The system correctly identified: "${data.show_name}"`);
    } else {
      console.log('\n⚠️  WARNING: No currently airing show found');
      console.log('   This might be normal if there are no shows scheduled for this time');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testCurrentShow();





