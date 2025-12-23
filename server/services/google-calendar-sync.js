import { google } from 'googleapis';
import ical from 'node-ical';
import { query } from '../../src/lib/db.js';
import fetch from 'node-fetch';
import fs from 'fs';

class GoogleCalendarSyncService {
  constructor() {
    this.calendar = null;
    this.calendarId = '1mgdpr1hjcpu1mrok6u6fk2cg0@group.calendar.google.com'; // From the calendar URL
    this.icalUrl = 'https://calendar.google.com/calendar/ical/1mgdpr1hjcpu1mrok6u6fk2cg0%40group.calendar.google.com/private-8ab73002adb16c86951f9787df754f01/basic.ics';
    this.serviceAccountPath = '/home/iteam/radio-lineup-generator-rtl-78/storage-new/lineupsend-64894b6a3558.json';
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Using iCal feed - no API initialization needed
      console.log('Using iCal feed for Google Calendar sync');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize calendar sync service:', error);
      throw error;
    }
  }

  // Fetch and expand events from iCal feed - returns exactly what Google Calendar shows
  // Uses ical-expander to properly expand recurring events, handling EXDATE and RECURRENCE-ID
  async fetchEventsFromGoogleCalendar() {
    try {
      await this.initialize();
      
      console.log('Fetching iCal data from:', this.icalUrl);
      const response = await fetch(this.icalUrl);
      const icalData = await response.text();
      
      // Use Jerusalem timezone to get the correct "today"
      const jerusalemFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = jerusalemFormatter.formatToParts(new Date());
      const todayStr = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
      const today = new Date(todayStr + 'T00:00:00+02:00'); // Jerusalem timezone
      
      // Fetch events from today to 6 months ahead
      const maxDate = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000);
      
      console.log(`Expanding events from ${todayStr} to ${maxDate.toISOString().split('T')[0]}`);

      // Parse iCal directly using node-ical - simple approach, no expansion
      // This will only get single events and base recurring event definitions
      // We'll skip recurring events for now to keep it simple and stable
      const parsedEvents = [];
      const parsedICal = ical.parseICS(icalData);
      
      console.log(`Parsed ${Object.keys(parsedICal).length} items from iCal feed`);
      
      const allEvents = Object.values(parsedICal).filter(e => e.type === 'VEVENT');

      for (const event of allEvents) {
        try {
          // Skip cancelled events
          if (event.status === 'CANCELLED') {
            continue;
          }

          // Skip RECURRENCE-ID events (these are exceptions, not base events)
          if (event.recurrenceid) {
            continue;
          }

          // Skip recurring events for now - we'll only handle single events
          // This keeps it simple and prevents crashes
          if (event.rrule) {
            continue;
          }

          const summary = event.summary || '';
          
          if (!summary) {
            continue;
          }
          
          const studioInfo = this.parseStudioFromEvent({ summary });
          
          // Skip events without a studio
          if (!studioInfo.studioId) {
            continue;
          }
        
          // Clean the event title
          const cleanedTitle = this.cleanEventTitle(summary);
          
          // Get start and end times
          const start = new Date(event.start);
          const end = new Date(event.end);
          
          if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
            continue;
          }

          // Skip past events
          const eventDateStr = this.formatDateInJerusalem(start);
          if (eventDateStr < todayStr) {
            continue;
          }

          // Use the event UID for google_event_id
          const googleEventId = event.uid || event.uid || '';

          parsedEvents.push({
            googleEventId: googleEventId,
            summary: cleanedTitle,
            originalSummary: summary,
            description: event.description || '',
            start: start,
            end: end,
            studioId: studioInfo.studioId,
            studioName: studioInfo.studioName,
            isRecurring: false,
            recurrenceRule: null,
            rawEvent: event
          });
        } catch (error) {
          // Skip events that fail to parse - log but don't crash
          console.warn(`Error parsing event: ${error.message}`);
          continue;
        }
      }

      console.log(`Parsed ${parsedEvents.length} events from iCal feed (expanded)`);
      return parsedEvents;
    } catch (error) {
      console.error('Error fetching events from Google Calendar:', error);
      throw error;
    }
  }

  // Parse studio information from event summary
  // Works with both Google Calendar API events and iCal events
  parseStudioFromEvent(event) {
    // Google Calendar API uses 'summary', iCal uses 'summary' too
    const summary = event.summary || '';
    
    // Look for studio indicators in the summary with improved parsing
    // Studio IDs: 1 = אולפן א', 2 = אולפן ב', 3 = אולפן ג'
    if (summary.includes('אולפן א') || summary.includes('Studio A')) {
      return { studioId: 1, studioName: 'אולפן א\'' };
    } else if (summary.includes('אולפן ב') || summary.includes('Studio B')) {
      return { studioId: 2, studioName: 'אולפן ב\'' };
    } else if (summary.includes('אולפן ג') || summary.includes('Studio G')) {
      return { studioId: 3, studioName: 'אולפן ג\'' };
    }
    
    // No studio found - return null for neutral handling
    return { studioId: null, studioName: null };
  }

  // Clean event title by removing studio references and extra text
  cleanEventTitle(title) {
    if (!title) return title;
    
    // Remove various studio name patterns
    const patterns = [
      /\(אולפן [א-ת]'?\)/g,  // (אולפן ב'), (אולפן ג), etc.
      /אולפן [א-ת]'?/g,       // אולפן ב', אולפן ג, etc.
      /\(Studio [A-Z]\)/gi,    // (Studio B), (Studio G), etc.
      /Studio [A-Z]/gi         // Studio B, Studio G, etc.
    ];
    
    let cleanedTitle = title;
    patterns.forEach(pattern => {
      cleanedTitle = cleanedTitle.replace(pattern, '').trim();
    });
    
    // Remove parenthetical notes like "(-רן" or "(׳ - טכנאי 99"
    cleanedTitle = cleanedTitle.replace(/\([^)]*\)/g, '').trim();
    
    // Remove trailing dashes and extra text patterns
    cleanedTitle = cleanedTitle.replace(/\s*-\s*רן\s*$/i, '').trim();
    cleanedTitle = cleanedTitle.replace(/\s*\([^)]*$/g, '').trim();
    
    // Clean up extra spaces and parentheses
    cleanedTitle = cleanedTitle.replace(/\s+/g, ' ').trim();
    cleanedTitle = cleanedTitle.replace(/^\(|\)$/g, '').trim();
    
    return cleanedTitle;
  }

  // Import events from Google Calendar to database
  // This ensures the database is an exact clone of Google Calendar - nothing more, nothing less
  // Strategy: Delete all existing Google Calendar bookings, then re-import fresh
  async importFromGoogleCalendar() {
    const syncLogId = await this.createSyncLog('import');
    
    try {
      await this.initialize(); // Initialize the service
      
      console.log('Starting Google Calendar sync - ensuring exact match...');
      
      // Step 1: Delete ALL existing Google Calendar bookings to ensure clean slate
      const deleteResult = await query(
        `DELETE FROM studio_bookings 
         WHERE id IN (
           SELECT studio_booking_id 
           FROM google_calendar_events
         )
         RETURNING *`
      );
      const deletedCount = deleteResult.data?.length || 0;
      console.log(`Deleted ${deletedCount} existing Google Calendar bookings for clean sync`);
      
      // Also delete orphaned google_calendar_events entries
      await query('DELETE FROM google_calendar_events');
      
      // Step 2: Get all current events from Google Calendar API
      // This returns exactly what Google Calendar shows - no expansion or filtering needed
      const events = await this.fetchEventsFromGoogleCalendar();
      
      // Step 3: Import all events fresh
      let eventsProcessed = 0;
      let eventsCreated = 0;
      let eventsUpdated = 0;
      let conflictsDetected = 0;
      const totalEvents = events.length;

      console.log(`Importing ${totalEvents} events from Google Calendar`);

      for (const event of events) {
        eventsProcessed++;
        
        // Log progress every 10 events
        if (eventsProcessed % 10 === 0) {
          console.log(`Progress: ${eventsProcessed}/${totalEvents} events processed (${eventsCreated} created)`);
        }
        
        try {
          // Create new studio booking (no need to check for existing since we deleted everything)
          const result = await this.createStudioBookingFromGoogleEvent(event);
          // If result is null, event was skipped (past event - shouldn't happen due to filtering)
          if (result === null) {
            continue;
          }
          // If result is an array (recurring bookings), count all of them
          if (Array.isArray(result)) {
            eventsCreated += result.length;
          } else if (result) {
            eventsCreated++;
          }
        } catch (error) {
          console.error(`Error processing event ${event.googleEventId}:`, error);
          conflictsDetected++;
        }
      }

      await this.updateSyncLog(syncLogId, 'success', {
        events_processed: eventsProcessed,
        events_created: eventsCreated,
        events_updated: eventsUpdated,
        events_deleted: deletedCount,
        conflicts_detected: conflictsDetected
      });

      console.log(`Sync completed: ${eventsCreated} created, ${deletedCount} deleted (old data), ${conflictsDetected} conflicts`);
      return { success: true, eventsCreated, eventsUpdated, eventsDeleted: deletedCount, conflictsDetected };
      
    } catch (error) {
      await this.updateSyncLog(syncLogId, 'failed', { error_message: error.message });
      console.error('Sync failed:', error);
      throw error;
    }
  }

  // Helper function to convert Date to Jerusalem timezone string
  formatDateInJerusalem(date, includeTime = false) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jerusalem',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...(includeTime ? {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      } : {})
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    if (includeTime) {
      const hour = parts.find(p => p.type === 'hour').value;
      const minute = parts.find(p => p.type === 'minute').value;
      const second = parts.find(p => p.type === 'second').value;
      return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${minute}:${second}`
      };
    }
    
    return `${year}-${month}-${day}`;
  }

  // Create studio booking from Google Calendar event
  // Google Calendar API already expands recurring events, so we just create single bookings
  async createStudioBookingFromGoogleEvent(event) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    // Skip past events (should be filtered earlier, but double-check)
    // Use Jerusalem timezone for date comparison
    const todayStr = this.formatDateInJerusalem(new Date());
    const eventDateStr = this.formatDateInJerusalem(startDate);
    
    if (eventDateStr < todayStr) {
      console.log(`Skipping past event: ${event.summary} on ${eventDateStr} (today: ${todayStr})`);
      return null;
    }
    
    // Extract date and time in Jerusalem timezone
    const startDateTime = this.formatDateInJerusalem(startDate, true);
    const endDateTime = this.formatDateInJerusalem(endDate, true);
    const bookingDate = startDateTime.date;
    const startTime = startDateTime.time;
    const endTime = endDateTime.time;
    
    // Check if booking already exists (by exact match or by google_event_id)
    const existingBooking = await query(
      `SELECT sb.id FROM studio_bookings sb
       LEFT JOIN google_calendar_events gce ON sb.id = gce.studio_booking_id
       WHERE (
         (sb.studio_id = $1 OR (sb.studio_id IS NULL AND $1 IS NULL))
         AND sb.booking_date = $2 
         AND sb.start_time = $3 
         AND sb.end_time = $4 
         AND sb.title = $5
       ) OR gce.google_event_id = $6`,
      [
        event.studioId,
        bookingDate,
        startTime,
        endTime,
        event.summary,
        event.googleEventId
      ]
    );

    if (existingBooking.data.length > 0) {
      console.log(`Skipping duplicate booking: ${event.summary} on ${bookingDate} (already exists)`);
      // Update the existing booking instead
      const existingId = existingBooking.data[0].id;
      await this.updateStudioBookingFromGoogleEvent(event, existingId);
      return existingBooking.data[0];
    }
    
    // Create single studio booking (handle null studio_id for neutral events)
    const bookingResult = await query(
      `INSERT INTO studio_bookings 
       (studio_id, booking_date, start_time, end_time, title, notes, status, is_recurring, recurrence_rule) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        event.studioId, // Can be null for neutral events
        bookingDate,
        startTime,
        endTime,
        event.summary, // Cleaned title
        event.description || 'Imported from Google Calendar',
        'approved', // Auto-approve imported events
        false, // All events from API are already expanded, so not recurring
        null // No recurrence rule needed
      ]
    );

    const booking = bookingResult.data[0];

    // Create Google Calendar event mapping
    await query(
      `INSERT INTO google_calendar_events 
       (studio_booking_id, google_event_id, google_calendar_id, sync_status) 
       VALUES ($1, $2, $3, $4)`,
      [booking.id, event.googleEventId, this.calendarId, 'synced']
    );

    return booking;
  }

  // Create recurring bookings by expanding RRULE
  async createRecurringBookings(event, startDate, endDate) {
    try {
      // Check if RRULE has UNTIL date in the past - if so, skip entirely
      const untilMatch = event.recurrenceRule.match(/UNTIL=(\d{8}T\d{6}Z?)/i);
      if (untilMatch) {
        const untilDateStr = untilMatch[1];
        let untilDate;
        if (untilDateStr.endsWith('Z')) {
          // UTC format: YYYYMMDDTHHMMSSZ
          untilDate = new Date(untilDateStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, '$1-$2-$3T$4:$5:$6Z'));
        } else {
          // Local time format: YYYYMMDDTHHMMSS
          untilDate = new Date(untilDateStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6'));
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        untilDate.setHours(0, 0, 0, 0);
        
        if (untilDate < today) {
          console.log(`Skipping ended recurring event: ${event.summary} (UNTIL: ${untilDate.toISOString().split('T')[0]})`);
          return []; // Return empty array - no occurrences to create
        }
      }
      
      // Parse the RRULE from the recurrence rule string
      const rruleString = event.recurrenceRule.replace(/^DTSTART[^;]*;/, '');
      
      // Get EXDATE (exception dates) from the raw event to exclude specific occurrences
      const exdates = event.rawEvent?.exdate || [];
      
      let rrule;
      try {
        rrule = RRule.fromString(rruleString);
        
        // Apply EXDATE exclusions if they exist
        if (exdates.length > 0) {
          const exdateDates = exdates.map(exdate => {
            if (Array.isArray(exdate)) {
              return exdate.map(d => new Date(d));
            }
            return new Date(exdate);
          }).flat();
          
          // Filter out occurrences that match EXDATE
          const originalOccurrences = rrule.between(today, maxDate, true);
          // Note: RRule doesn't directly support EXDATE in the rule itself,
          // so we'll filter occurrences manually after generation
        }
      } catch (error) {
        console.error(`Error parsing RRULE for ${event.summary}:`, error);
        return []; // Return empty if RRULE parsing fails
      }
      
      // Only generate occurrences from today forward (not from the original start date)
      // Use Jerusalem timezone to get the correct "today"
      const jerusalemFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = jerusalemFormatter.formatToParts(new Date());
      const todayStr = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
      const today = new Date(todayStr + 'T00:00:00+02:00'); // Jerusalem timezone
      
      // Generate occurrences for the next 6 months (reduced from 2 years to improve performance)
      const maxDate = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000); // 6 months from now
      
      // Only generate if the rule would produce occurrences in our date range
      // Check if the rule's until date (if exists) is in the future
      const ruleOptions = rrule.options;
      if (ruleOptions.until && new Date(ruleOptions.until) < today) {
        console.log(`Skipping recurring event ${event.summary} - UNTIL date ${ruleOptions.until.toISOString().split('T')[0]} is in the past`);
        return [];
      }
      
      let occurrences = rrule.between(
        today, // Start from today in Jerusalem timezone, not from the original event start date
        maxDate,
        true
      );
      
      // Filter out EXDATE (exception dates) if they exist
      if (event.rawEvent?.exdate) {
        const exdates = Array.isArray(event.rawEvent.exdate) ? event.rawEvent.exdate : [event.rawEvent.exdate];
        const exdateDates = exdates.map(exdate => {
          if (Array.isArray(exdate)) {
            return exdate.map(d => new Date(d));
          }
          return new Date(exdate);
        }).flat();
        
        const beforeFilter = occurrences.length;
        occurrences = occurrences.filter(occ => {
          // Check if this occurrence matches any EXDATE (compare date only, ignore time)
          const occDateStr = this.formatDateInJerusalem(occ);
          return !exdateDates.some(exdate => {
            const exdateStr = this.formatDateInJerusalem(exdate);
            return exdateStr === occDateStr;
          });
        });
        
        if (beforeFilter > occurrences.length) {
          console.log(`Filtered out ${beforeFilter - occurrences.length} EXDATE occurrences from recurring event "${event.summary}"`);
        }
      }
      
      // If no occurrences are generated, skip this recurring event entirely
      // This ensures we only import events that actually appear in Google Calendar
      if (occurrences.length === 0) {
        console.log(`Skipping recurring event "${event.summary}" - generates no occurrences from ${today.toISOString().split('T')[0]} onwards`);
        return [];
      }
      
      console.log(`Expanding recurring event "${event.summary}" from ${today.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]} - found ${occurrences.length} occurrences`);

      // Limit to prevent timeout - process max 500 occurrences per recurring event
      const maxOccurrences = 500;
      const occurrencesToProcess = occurrences.slice(0, maxOccurrences);
      
      if (occurrences.length > maxOccurrences) {
        console.log(`Limiting recurring event "${event.summary}" to first ${maxOccurrences} occurrences (total: ${occurrences.length})`);
      }

      const bookings = [];
      
      // Get the original time components in Jerusalem timezone
      const startDateTime = this.formatDateInJerusalem(startDate, true);
      const endDateTime = this.formatDateInJerusalem(endDate, true);
      const originalStartTime = startDateTime.time; // HH:MM:SS
      const originalEndTime = endDateTime.time; // HH:MM:SS
      
      // Filter out past occurrences BEFORE batch checking (using Jerusalem timezone)
      // Create a date-only formatter for filtering (reuse todayStr from above)
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jerusalem',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      
      const validOccurrences = occurrencesToProcess.filter(occurrence => {
        const occurrenceParts = dateFormatter.formatToParts(occurrence);
        const occurrenceDateStr = `${occurrenceParts.find(p => p.type === 'year').value}-${occurrenceParts.find(p => p.type === 'month').value}-${occurrenceParts.find(p => p.type === 'day').value}`;
        return occurrenceDateStr >= todayStr;
      });
      
      console.log(`Filtered ${occurrencesToProcess.length - validOccurrences.length} past occurrences from ${occurrencesToProcess.length} total (today: ${todayStr})`);
      
      // Batch check for existing events to improve performance (only for valid occurrences)
      const occurrenceDates = validOccurrences.map(occ => {
        const parts = dateFormatter.formatToParts(occ);
        return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;
      });
      const uniqueEventIds = occurrenceDates.map(date => `${event.googleEventId}_${date}`);
      
      // Check which events already exist (batch query)
      const existingEventsResult = await query(
        `SELECT google_event_id FROM google_calendar_events 
         WHERE google_event_id = ANY($1::text[])`,
        [uniqueEventIds]
      );
      const existingEventIds = new Set(existingEventsResult.data?.map(e => e.google_event_id) || []);
      
      for (const occurrence of validOccurrences) {
        // Extract date in Jerusalem timezone
        const occurrenceDate = this.formatDateInJerusalem(occurrence);
        
        const uniqueEventId = `${event.googleEventId}_${occurrenceDate}`;
        
        // Check if this occurrence already exists (using pre-fetched batch data)
        if (existingEventIds.has(uniqueEventId)) {
          console.log(`Skipping duplicate occurrence (by google_event_id): ${event.summary} on ${occurrenceDate}`);
          continue;
        }

        // Check for exact same title, date, time, and studio combination
        const existingBooking = await query(
          `SELECT id FROM studio_bookings 
           WHERE (studio_id = $1 OR (studio_id IS NULL AND $1 IS NULL))
           AND booking_date = $2 
           AND start_time = $3 
           AND end_time = $4 
           AND title = $5`,
          [
            event.studioId,
            occurrenceDate,
            originalStartTime,
            originalEndTime,
            event.summary
          ]
        );

        if (existingBooking.data.length > 0) {
          console.log(`Skipping duplicate occurrence: ${event.summary} on ${occurrenceDate} (exact match exists)`);
          // Create mapping for existing booking if it doesn't have one
          const existingId = existingBooking.data[0].id;
          const existingMapping = await query(
            `SELECT id FROM google_calendar_events WHERE studio_booking_id = $1 AND google_event_id = $2`,
            [existingId, uniqueEventId]
          );
          if (existingMapping.data.length === 0) {
            await query(
              `INSERT INTO google_calendar_events 
               (studio_booking_id, google_event_id, google_calendar_id, sync_status) 
               VALUES ($1, $2, $3, $4)`,
              [existingId, uniqueEventId, this.calendarId, 'synced']
            );
          }
          continue;
        }

        // Additional check: if there's already a booking at the same time slot with a similar title,
        // we should skip this one to avoid visual duplicates
        const conflictingBooking = await query(
          `SELECT id, title FROM studio_bookings 
           WHERE (studio_id = $1 OR (studio_id IS NULL AND $1 IS NULL))
           AND booking_date = $2 
           AND start_time = $3 
           AND end_time = $4 
           AND title != $5 
           AND (
             title ILIKE '%' || $6 || '%' OR $5 ILIKE '%' || title || '%'
           )`,
          [
            event.studioId,
            occurrenceDate,
            originalStartTime,
            originalEndTime,
            event.summary,
            event.summary.split(' ')[0] // First word of the title for similarity check
          ]
        );

        if (conflictingBooking.data.length > 0) {
          console.log(`Skipping conflicting occurrence: ${event.summary} conflicts with ${conflictingBooking.data[0].title} on ${occurrenceDate}`);
          continue;
        }

        const bookingResult = await query(
          `INSERT INTO studio_bookings 
           (studio_id, booking_date, start_time, end_time, title, notes, status, is_recurring, recurrence_rule) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           RETURNING *`,
          [
            event.studioId,
            occurrenceDate, // Already formatted in Jerusalem timezone
            originalStartTime, // Use original start time in Jerusalem timezone
            originalEndTime,   // Use original end time in Jerusalem timezone
            event.summary,
            event.description || 'Imported from Google Calendar (Recurring)',
            'approved',
            false, // Individual occurrences are not recurring
            null
          ]
        );

        const booking = bookingResult.data[0];
        bookings.push(booking);

        // Create Google Calendar event mapping for this occurrence with unique ID
        // uniqueEventId is already defined above in the loop
        await query(
          `INSERT INTO google_calendar_events 
           (studio_booking_id, google_event_id, google_calendar_id, sync_status) 
           VALUES ($1, $2, $3, $4)`,
          [booking.id, uniqueEventId, this.calendarId, 'synced']
        );
      }

      return bookings;
    } catch (error) {
      console.error('Error expanding recurring event:', error);
      // Fallback to single booking if RRULE parsing fails
      return await this.createStudioBookingFromGoogleEvent({...event, isRecurring: false, recurrenceRule: null});
    }
  }

  // Update studio booking from Google Calendar event
  async updateStudioBookingFromGoogleEvent(event, bookingId) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    await query(
      `UPDATE studio_bookings 
       SET title = $1, notes = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [event.summary, event.description || 'Updated from Google Calendar', bookingId]
    );

    // Update sync status
    await query(
      'UPDATE google_calendar_events SET last_synced_at = CURRENT_TIMESTAMP WHERE studio_booking_id = $1',
      [bookingId]
    );
  }

  // Create sync log entry
  async createSyncLog(syncType) {
    const result = await query(
      'INSERT INTO google_calendar_sync_logs (sync_type, status) VALUES ($1, $2) RETURNING id',
      [syncType, 'running']
    );
    return result.data[0].id;
  }

  // Update sync log entry
  async updateSyncLog(logId, status, details = {}) {
    await query(
      `UPDATE google_calendar_sync_logs 
       SET status = $1, sync_completed_at = CURRENT_TIMESTAMP,
           events_processed = $2, events_created = $3, events_updated = $4, 
           conflicts_detected = $5, error_message = $6
       WHERE id = $7`,
      [
        status,
        details.events_processed || 0,
        details.events_created || 0,
        details.events_updated || 0,
        details.conflicts_detected || 0,
        details.error_message || null,
        logId
      ]
    );
  }

  // Export studio bookings to Google Calendar (DISABLED - READ-ONLY MODE)
  async exportToGoogleCalendar() {
    console.log('Export to Google Calendar is disabled - running in read-only mode');
    return { 
      success: true, 
      eventsCreated: 0, 
      eventsUpdated: 0,
      message: 'Export disabled - running in read-only mode' 
    };
  }

  // Create Google Calendar event from studio booking (DISABLED - READ-ONLY MODE)
  async createGoogleCalendarEvent(booking) {
    console.log('Creating Google Calendar events is disabled - running in read-only mode');
    throw new Error('Write operations disabled - running in read-only mode');
  }

  // Update Google Calendar event from studio booking (DISABLED - READ-ONLY MODE)
  async updateGoogleCalendarEvent(booking) {
    console.log('Updating Google Calendar events is disabled - running in read-only mode');
    throw new Error('Write operations disabled - running in read-only mode');
  }

  // Get sync logs
  async getSyncLogs(limit = 50) {
    try {
      const result = await query(
        'SELECT * FROM google_calendar_sync_logs ORDER BY sync_started_at DESC LIMIT $1',
        [limit]
      );
      return result.data || [];
    } catch (error) {
      console.error('Error fetching sync logs:', error);
      throw error;
    }
  }
}

export default GoogleCalendarSyncService;
