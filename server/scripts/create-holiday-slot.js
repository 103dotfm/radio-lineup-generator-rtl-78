#!/usr/bin/env node

/**
 * Holiday Slot Creation Script
 * 
 * This script helps create holiday slots with proper RDS data to ensure
 * the RDS module works correctly for special programming days.
 * 
 * Usage:
 * node server/scripts/create-holiday-slot.js [options]
 * 
 * Options:
 * --date YYYY-MM-DD     The date for the holiday slot (required)
 * --show-name "Name"    The show name (required)
 * --host-name "Name"    The host name (optional)
 * --start-time HH:MM    Start time (default: 06:00)
 * --end-time HH:MM      End time (default: 23:59)
 * --rds-text "Text"     RDS radio text (optional)
 * --pty NUMBER          RDS PTY code (default: 26 for music)
 * --ms NUMBER           RDS MS code (default: 1 for music programming)
 * --dry-run             Show what would be created without actually creating
 */

import { query } from '../../src/lib/db.js';
import { format, parseISO, getDay } from 'date-fns';

const DEFAULT_CONFIG = {
  startTime: '06:00:00',
  endTime: '23:59:00',
  pty: 26, // Music programming
  ms: 1,   // Music programming
  color: 'green',
  isPrerecorded: false,
  isCollection: false,
  isMaster: false,
  isRecurring: false,
  isDeleted: false,
  hasLineup: false
};

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--date':
        config.date = args[++i];
        break;
      case '--show-name':
        config.showName = args[++i];
        break;
      case '--host-name':
        config.hostName = args[++i];
        break;
      case '--start-time':
        config.startTime = args[++i] + ':00'; // Add seconds if not provided
        break;
      case '--end-time':
        config.endTime = args[++i] + ':00'; // Add seconds if not provided
        break;
      case '--rds-text':
        config.rdsText = args[++i];
        break;
      case '--pty':
        config.pty = parseInt(args[++i]);
        break;
      case '--ms':
        config.ms = parseInt(args[++i]);
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return config;
}

function showHelp() {
  console.log(`
Holiday Slot Creation Script

Usage: node server/scripts/create-holiday-slot.js [options]

Options:
  --date YYYY-MM-DD     The date for the holiday slot (required)
  --show-name "Name"    The show name (required)
  --host-name "Name"    The host name (optional)
  --start-time HH:MM    Start time (default: 06:00)
  --end-time HH:MM      End time (default: 23:59)
  --rds-text "Text"     RDS radio text (optional)
  --pty NUMBER          RDS PTY code (default: 26 for music)
  --ms NUMBER           RDS MS code (default: 1 for music programming)
  --dry-run             Show what would be created without actually creating
  --help                Show this help message

Examples:
  # Create a holiday music slot for Rosh Hashanah
  node server/scripts/create-holiday-slot.js \\
    --date 2025-09-23 \\
    --show-name "מוזיקה לחג" \\
    --host-name "עורך: יואב חנני" \\
    --rds-text "Welcome new year! The best Israeli music, edited by Yoav Hanani"

  # Create a Yom Kippur slot
  node server/scripts/create-holiday-slot.js \\
    --date 2025-10-02 \\
    --show-name "מוזיקה ליום הכיפורים" \\
    --rds-text "Gmar Hatima Tova! Israeli music for Yom Kippur"

RDS PTY Codes:
  1  = NEWS
  4  = SPORTS  
  21 = PHONE-IN
  26 = NATIONAL MUSIC
  17 = FINANCE
  0  = NONE

RDS MS Codes:
  0 = SPEECH ONLY
  1 = MUSIC PROGRAMMING
`);
}

function validateConfig(config) {
  const errors = [];
  
  if (!config.date) {
    errors.push('--date is required');
  } else {
    try {
      const date = parseISO(config.date);
      if (isNaN(date.getTime())) {
        errors.push('--date must be a valid date in YYYY-MM-DD format');
      }
    } catch (e) {
      errors.push('--date must be a valid date in YYYY-MM-DD format');
    }
  }
  
  if (!config.showName) {
    errors.push('--show-name is required');
  }
  
  if (errors.length > 0) {
    console.error('Validation errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nUse --help for usage information');
    process.exit(1);
  }
}

async function checkExistingSlots(config) {
  console.log(`Checking for existing slots on ${config.date}...`);
  
  const result = await query(
    `SELECT id, show_name, start_time, end_time, is_deleted 
     FROM schedule_slots 
     WHERE slot_date = $1 AND is_deleted = false`,
    [config.date]
  );
  
  if (result.error) {
    console.error('Error checking existing slots:', result.error);
    process.exit(1);
  }
  
  if (result.data && result.data.length > 0) {
    console.log('Existing slots found:');
    result.data.forEach(slot => {
      console.log(`  - ${slot.show_name}: ${slot.start_time} - ${slot.end_time}`);
    });
    
    console.log('\nWarning: Creating a new slot may conflict with existing slots.');
    console.log('Consider using --dry-run first to check for conflicts.');
  } else {
    console.log('No existing slots found for this date.');
  }
  
  return result.data || [];
}

async function createHolidaySlot(config) {
  const date = parseISO(config.date);
  const dayOfWeek = getDay(date);
  
  const slotData = {
    slot_date: config.date,
    day_of_week: dayOfWeek,
    start_time: config.startTime,
    end_time: config.endTime,
    show_name: config.showName,
    host_name: config.hostName || '',
    has_lineup: config.hasLineup,
    color: config.color,
    is_prerecorded: config.isPrerecorded,
    is_collection: config.isCollection,
    is_master: config.isMaster,
    is_recurring: config.isRecurring,
    is_deleted: config.isDeleted,
    rds_pty: config.pty,
    rds_ms: config.ms,
    rds_radio_text: config.rdsText || '',
    rds_radio_text_translated: ''
  };
  
  console.log('\nHoliday slot configuration:');
  console.log(`  Date: ${slotData.slot_date} (Day of week: ${dayOfWeek})`);
  console.log(`  Time: ${slotData.start_time} - ${slotData.end_time}`);
  console.log(`  Show: ${slotData.show_name}`);
  console.log(`  Host: ${slotData.host_name || '(none)'}`);
  console.log(`  RDS Text: ${slotData.rds_radio_text || '(none)'}`);
  console.log(`  RDS PTY: ${slotData.rds_pty} (${getPTYDescription(slotData.rds_pty)})`);
  console.log(`  RDS MS: ${slotData.rds_ms} (${getMSDescription(slotData.rds_ms)})`);
  
  if (config.dryRun) {
    console.log('\n[DRY RUN] Would create slot with the above configuration.');
    return;
  }
  
  console.log('\nCreating holiday slot...');
  
  const result = await query(
    `INSERT INTO schedule_slots (
      slot_date, day_of_week, start_time, end_time, show_name, host_name,
      has_lineup, color, is_prerecorded, is_collection,
      is_master, is_recurring, is_deleted, created_at, updated_at,
      rds_pty, rds_ms, rds_radio_text, rds_radio_text_translated
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $14, $15, $16, $17)
    RETURNING id, show_name, start_time, end_time, rds_radio_text`,
    [
      slotData.slot_date, slotData.day_of_week, slotData.start_time, slotData.end_time,
      slotData.show_name, slotData.host_name, slotData.has_lineup, slotData.color,
      slotData.is_prerecorded, slotData.is_collection, slotData.is_master,
      slotData.is_recurring, slotData.is_deleted, slotData.rds_pty, slotData.rds_ms,
      slotData.rds_radio_text, slotData.rds_radio_text_translated
    ]
  );
  
  if (result.error) {
    console.error('Error creating holiday slot:', result.error);
    process.exit(1);
  }
  
  const createdSlot = result.data[0];
  console.log('\n✅ Holiday slot created successfully!');
  console.log(`  ID: ${createdSlot.id}`);
  console.log(`  Show: ${createdSlot.show_name}`);
  console.log(`  Time: ${createdSlot.start_time} - ${createdSlot.end_time}`);
  console.log(`  RDS Text: ${createdSlot.rds_radio_text}`);
  
  console.log('\nThe RDS module should now display this slot data for the specified date and time.');
}

function getPTYDescription(pty) {
  const descriptions = {
    0: 'NONE',
    1: 'NEWS',
    4: 'SPORTS',
    17: 'FINANCE',
    21: 'PHONE-IN',
    26: 'NATIONAL MUSIC'
  };
  return descriptions[pty] || 'UNKNOWN';
}

function getMSDescription(ms) {
  return ms === 0 ? 'SPEECH ONLY' : ms === 1 ? 'MUSIC PROGRAMMING' : 'UNKNOWN';
}

async function main() {
  try {
    const config = parseArgs();
    validateConfig(config);
    
    await checkExistingSlots(config);
    await createHolidaySlot(config);
    
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

main();

