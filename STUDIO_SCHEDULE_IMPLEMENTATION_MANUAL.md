# Studio Schedule System Implementation Manual

## Overview

This manual provides complete instructions for implementing the enhanced studio schedule system with Google Calendar integration, engineer work arrangements, and approval workflow.

## System Architecture

### Components
1. **Database Schema** - Enhanced tables for Google Calendar sync and engineer work arrangements
2. **Google Calendar Sync Service** - Read-only iCal integration for importing events
3. **Enhanced Studio Schedule Routes** - API endpoints with email notifications
4. **Engineer Work Arrangements** - CRUD operations for engineer shifts
5. **Cron Jobs** - Automated sync every 10 minutes
6. **Email Notifications** - Approval workflow notifications

## Implementation Steps

### Step 1: Database Migration

**File:** `server/migrations/enhance_studio_schedule_system.sql`

Run the migration to create new tables:
```bash
cd /home/iteam/radio-lineup-generator-rtl-78
npm run migrate
```

**New Tables Created:**
- `google_calendar_sync_logs` - Sync operation tracking
- `google_calendar_events` - Mapping between bookings and Google Calendar events
- `studio_booking_approvers` - Users who can approve booking requests
- `engineer_work_arrangements` - Weekly engineer schedule arrangements
- `engineer_shifts` - Individual engineer shifts
- `email_queue` - Email notification queue

### Step 2: Google Calendar Setup

**Service Account Configuration:**
- Service account file: `storage-new/lineupsend-64894b6a3558.json` ✅
- Calendar ID: `1mgdpr1hjcpu1mrok6u6fk2cg0@group.calendar.google.com`
- iCal URL: `https://calendar.google.com/calendar/ical/1mgdpr1hjcpu1mrok6u6fk2cg0%40group.calendar.google.com/private-8ab73002adb16c86951f9787df754f01/basic.ics`

**Calendar Access:**
- Account: `103fm.web@gmail.com` ✅
- Permissions: Edit access ✅
- Calendar URL: `https://calendar.google.com/calendar/u/0?cid=MW1nZHByMWhqY3B1MW1yb2s2dTZmazJjZzBAZ3JvdXAuY2FsZW5kYXIuZ29vZ2xlLmNvbQ`

### Step 3: Service Files

**Google Calendar Sync Service:** `server/services/google-calendar-sync.js`
- Read-only mode (no write operations to Google Calendar)
- iCal parsing for event import
- Conflict detection and logging
- Sync status tracking

**Enhanced Studio Schedule Routes:** `server/routes/studio-schedule-enhanced.js`
- Booking management with email notifications
- Admin approval workflow
- Bulk approval/denial operations
- Approver management
- Google Calendar sync endpoints

**Engineer Work Arrangements:** `server/routes/engineer-work-arrangements.js`
- CRUD operations for engineer shifts
- Week-based arrangements
- Studio-specific assignments
- Engineer assignment queries

### Step 4: Server Configuration

**Updated Files:**
- `server/server.js` - Added new route imports and mounting
- `server/cron.js` - Added Google Calendar sync cron job (every 10 minutes)

**New API Endpoints:**

#### Studio Schedule Enhanced
- `GET /api/studio-schedule-enhanced/studios` - Get all studios
- `GET /api/studio-schedule-enhanced/bookings` - Get bookings with engineer assignments
- `POST /api/studio-schedule-enhanced/bookings` - Create booking request
- `PATCH /api/studio-schedule-enhanced/bookings/:id` - Update booking status (admin)
- `GET /api/studio-schedule-enhanced/admin/pending-requests` - Get pending requests
- `POST /api/studio-schedule-enhanced/admin/bulk-update` - Bulk approve/deny
- `POST /api/studio-schedule-enhanced/sync/import` - Manual sync from Google Calendar
- `GET /api/studio-schedule-enhanced/sync/logs` - Get sync logs

#### Engineer Work Arrangements
- `GET /api/engineer-work-arrangements/` - Get all arrangements
- `GET /api/engineer-work-arrangements/week/:weekStart` - Get arrangement by week
- `POST /api/engineer-work-arrangements/` - Create arrangement (admin)
- `PUT /api/engineer-work-arrangements/:id` - Update arrangement (admin)
- `GET /api/engineer-work-arrangements/:id/shifts` - Get shifts for arrangement
- `POST /api/engineer-work-arrangements/:id/shifts` - Create shift (admin)
- `PUT /api/engineer-work-arrangements/shifts/:shiftId` - Update shift (admin)
- `GET /api/engineer-work-arrangements/assignments/:date` - Get engineer assignments for date

### Step 5: Sample Data

**Initial Engineer Work Arrangement Created:**
- Week: Current week
- Status: Not published (needs editing)
- 5 Sample engineer shifts:
  1. Morning Shift - Studio B (John Doe)
  2. Morning Shift - Studio G (Jane Smith)
  3. Morning Shift - General (Mike Johnson)
  4. Evening Shift - Studio B (Sarah Wilson)
  5. Evening Shift - General (David Brown)

**Sample Studio Booking:**
- Title: "Lifestyle Podcast Recording"
- Date: Sunday, October 25, 2025
- Time: 09:00-10:00
- Studio: אולפן ג' (Studio B)
- Status: Approved
- Assigned Engineer: John Doe

### Step 6: Dependencies

**Installed Packages:**
- `node-ical` - For parsing iCal feeds ✅

## Configuration

### Environment Variables

Add to your `.env` file:
```bash
# Google Calendar Configuration
GOOGLE_CALENDAR_ID=1mgdpr1hjcpu1mrok6u6fk2cg0@group.calendar.google.com
GOOGLE_CALENDAR_ICAL_URL=https://calendar.google.com/calendar/ical/1mgdpr1hjcpu1mrok6u6fk2cg0%40group.calendar.google.com/private-8ab73002adb16c86951f9787df754f01/basic.ics
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/home/iteam/radio-lineup-generator-rtl-78/storage-new/lineupsend-64894b6a3558.json

# Frontend URL for email links
FRONTEND_URL=http://l.103.fm:8080
```

## Testing

### Manual Testing Steps

1. **Test Database Migration:**
   ```bash
   cd /home/iteam/radio-lineup-generator-rtl-78
   npm run migrate
   ```

2. **Test Google Calendar Sync:**
   ```bash
   # Start the server
   npm run server
   
   # Test import endpoint (requires admin authentication)
   curl -X POST http://localhost:5174/api/studio-schedule-enhanced/sync/import \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

3. **Test Engineer Work Arrangements:**
   ```bash
   # Get current week arrangement
   curl http://localhost:5174/api/engineer-work-arrangements/
   
   # Get shifts for arrangement
   curl http://localhost:5174/api/engineer-work-arrangements/ARRANGEMENT_ID/shifts
   ```

4. **Test Studio Bookings with Engineer Assignments:**
   ```bash
   # Get bookings with engineer assignments
   curl "http://localhost:5174/api/studio-schedule-enhanced/bookings?start_date=2025-10-25&end_date=2025-10-25"
   ```

### Expected Results

1. **Database:** All new tables created with sample data
2. **Google Calendar Sync:** Events imported from iCal feed
3. **Engineer Assignments:** Bookings show assigned engineers based on shifts
4. **Cron Job:** Sync runs every 10 minutes automatically

## Admin Panel Integration

### New Admin Sections Needed

1. **Studio Schedule Management**
   - Pending booking requests
   - Bulk approval/denial interface
   - Approver management
   - Sync status and logs

2. **Engineer Work Arrangements**
   - Week-based arrangement editor
   - Engineer shift management
   - Studio assignment interface

3. **Google Calendar Sync**
   - Manual sync controls
   - Sync logs viewer
   - Conflict resolution interface

## Email Notifications

### Notification Types

1. **Booking Request Submitted** (to approvers)
   - Subject: "בקשת הזמנת אולפן חדשה - [Studio Name]"
   - Content: Booking details, requester info, approval link

2. **Booking Status Update** (to requester)
   - Subject: "עדכון בקשת הזמנת אולפן - [Status]"
   - Content: Status change, admin notes, next steps

### Email Queue System

Emails are queued in the `email_queue` table and processed by the existing email scheduler.

## Monitoring

### Sync Logs

Check sync status:
```sql
SELECT * FROM google_calendar_sync_logs 
ORDER BY sync_started_at DESC 
LIMIT 10;
```

### Error Monitoring

Monitor server logs for:
- `[CALENDAR SYNC]` - Sync operation logs
- `[ERROR]` - Sync errors and conflicts
- Email notification failures

## Troubleshooting

### Common Issues

1. **iCal Feed Not Accessible**
   - Check calendar permissions
   - Verify iCal URL is correct
   - Check network connectivity

2. **Sync Conflicts**
   - Review conflict details in sync logs
   - Manual intervention may be required
   - Check for duplicate events

3. **Email Notifications Not Sending**
   - Check email queue table
   - Verify email service configuration
   - Check SMTP/email service status

4. **Engineer Assignments Not Showing**
   - Verify engineer work arrangement is published
   - Check shift times match booking times
   - Verify studio assignments

### Debug Commands

```bash
# Check sync logs
curl http://localhost:5174/api/studio-schedule-enhanced/sync/logs

# Manual sync test
curl -X POST http://localhost:5174/api/studio-schedule-enhanced/sync/import

# Check engineer assignments
curl http://localhost:5174/api/engineer-work-arrangements/assignments/2025-10-25
```

## Next Steps

### Phase 2: Two-Way Sync (Future)
- Enable Google Calendar API write operations
- Implement bidirectional sync
- Conflict resolution system

### Phase 3: Frontend Integration
- Admin panel interfaces
- Booking request forms
- Engineer assignment displays

### Phase 4: Advanced Features
- Recurring booking patterns
- Advanced conflict detection
- Integration with lineup editor

## Support

For issues or questions:
1. Check server logs for error messages
2. Review sync logs in database
3. Test individual API endpoints
4. Verify Google Calendar permissions

---

**Implementation Status:** ✅ Complete
**Testing Status:** ⏳ Pending
**Production Ready:** ⏳ After testing

