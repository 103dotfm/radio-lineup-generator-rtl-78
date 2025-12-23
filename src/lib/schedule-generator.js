import { query } from './db.js';

// Helper function to format date to YYYY-MM-DD
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Helper function to get the start of the current week (Sunday)
const getWeekStart = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  return new Date(now.setDate(diff));
};

// Helper function to get schedule slots for the week
const getWeeklySchedule = async () => {
  const weekStart = getWeekStart();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return formatDate(date);
  });

  // Get all schedule slots
  const { data: slots, error } = await query(
    'SELECT * FROM schedule_slots ORDER BY day_of_week, start_time'
  );

  if (error) {
    throw new Error('Failed to fetch schedule slots: ' + error.message);
  }

  return { weekDates, slots: slots || [] };
};

// Generate XML schedule
const generateXmlSchedule = async () => {
  try {
    const { weekDates, slots } = await getWeeklySchedule();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<schedule>\n';

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = weekDates[dayIndex];
      const daySlots = slots.filter(slot => slot.day_of_week === dayIndex);

      xml += `  <day date="${date}">\n`;
      for (const slot of daySlots) {
        xml += '    <show>\n';
        xml += `      <name>${slot.show_name}</name>\n`;
        xml += `      <start_time>${slot.start_time}</start_time>\n`;
        xml += `      <end_time>${slot.end_time}</end_time>\n`;
        if (slot.host_name) {
          xml += `      <host>${slot.host_name}</host>\n`;
        }
        xml += '    </show>\n';
      }
      xml += '  </day>\n';
    }

    xml += '</schedule>';
    return xml;
  } catch (error) {
    throw new Error('Failed to generate XML schedule: ' + error.message);
  }
};

// Generate JSON schedule
const generateJsonSchedule = async () => {
  try {
    const { weekDates, slots } = await getWeeklySchedule();

    const schedule = {
      week_start: weekDates[0],
      week_end: weekDates[6],
      days: weekDates.map((date, dayIndex) => ({
        date,
        day_of_week: dayIndex,
        shows: slots
          .filter(slot => slot.day_of_week === dayIndex)
          .map(slot => ({
            name: slot.show_name,
            start_time: slot.start_time,
            end_time: slot.end_time,
            host: slot.host_name || null,
            is_recurring: slot.is_recurring,
            is_prerecorded: slot.is_prerecorded,
            has_lineup: slot.has_lineup
          }))
      }))
    };

    return schedule;
  } catch (error) {
    throw new Error('Failed to generate JSON schedule: ' + error.message);
  }
};

export {
  generateXmlSchedule,
  generateJsonSchedule
}; 