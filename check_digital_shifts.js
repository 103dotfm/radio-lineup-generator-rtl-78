import { executeSelect } from './server/utils/db.js';

async function checkDigitalShifts() {
  try {
    console.log('=== Checking Digital Work Arrangements ===');
    
    // Get current week's arrangement
    const currentDate = new Date();
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    console.log('Current week start:', weekStartStr);
    
    // Check arrangements
    const arrangements = await executeSelect('digital_work_arrangements', {
      where: { week_start: weekStartStr }
    });
    
    console.log('Arrangements found:', arrangements.data?.length || 0);
    if (arrangements.data && arrangements.data.length > 0) {
      const arrangement = arrangements.data[0];
      console.log('Arrangement ID:', arrangement.id);
      
      // Check shifts
      const shifts = await executeSelect('digital_shifts', {
        where: { arrangement_id: arrangement.id }
      });
      
      console.log('Total shifts found:', shifts.data?.length || 0);
      
      if (shifts.data && shifts.data.length > 0) {
        console.log('\n=== Shifts Details ===');
        shifts.data.forEach(shift => {
          console.log(`- Section: ${shift.section_name}, Day: ${shift.day_of_week}, Type: ${shift.shift_type}, Worker: "${shift.person_name}", Hidden: ${shift.is_hidden}`);
        });
        
        // Check shifts with assigned workers
        const assignedShifts = shifts.data.filter(shift => 
          shift.person_name && shift.person_name.trim() !== '' && !shift.is_hidden
        );
        
        console.log('\n=== Shifts with Assigned Workers ===');
        console.log('Count:', assignedShifts.length);
        assignedShifts.forEach(shift => {
          console.log(`- Section: ${shift.section_name}, Day: ${shift.day_of_week}, Type: ${shift.shift_type}, Worker: "${shift.person_name}"`);
        });
        
        // Check by section
        const sections = ['digital_shifts', 'radio_north', 'transcription_shifts', 'live_social_shifts'];
        sections.forEach(section => {
          const sectionShifts = assignedShifts.filter(shift => shift.section_name === section);
          console.log(`\n${section}: ${sectionShifts.length} assigned shifts`);
        });
      }
    } else {
      console.log('No arrangements found for current week');
    }
    
  } catch (error) {
    console.error('Error checking digital shifts:', error);
  }
}

checkDigitalShifts(); 