# Backup/Restore Module Documentation

## Overview

The backup/restore module provides comprehensive database backup and restoration functionality for the Radio Lineup Generator system. It includes automatic daily backups, manual backup creation, file upload restoration, and a user-friendly web interface.

## Features

### 🔄 Automatic Backups
- **Daily automatic backup** at 23:00 (11:00 PM)
- **Automatic cleanup** - keeps only the latest 30 backup files
- **Systemd service** - ensures backups run after server restart
- **Error handling** - logs all backup operations

### 🎛️ Manual Operations
- **Instant backup creation** - "גבו עכשיו" button
- **File upload restoration** - upload custom SQL files
- **Download backups** - save backup files locally
- **Delete backups** - remove unwanted backup files

### ⚠️ Safety Features
- **Multiple warning dialogs** for destructive operations
- **10-second countdown** before restore confirmation
- **File size limits** (50MB max for uploads)
- **File type validation** (SQL files only)

## Installation

### 1. Backend Setup

The backup routes are automatically included in the server. The module uses:
- `server/routes/backup.js` - API endpoints
- `server/cron.js` - Automatic backup scheduling
- `backup/` directory - Storage for backup files

### 2. Frontend Setup

The backup interface is integrated into the admin panel:
- Location: Admin → ניהול נתונים → גיבוי ושחזור
- Component: `src/components/admin/data-management/backup/BackupRestoreTab.tsx`

### 3. System Service Setup

To enable automatic backups after server restart:

```bash
# Run as root
sudo ./setup-backup-service.sh
```

This will:
- Install the systemd service
- Enable automatic startup
- Start the service immediately

## API Endpoints

### GET `/api/backup/list`
Lists all available backup files.

**Response:**
```json
{
  "success": true,
  "backups": [
    {
      "filename": "radiodb-backup-2025-01-15T23-00-00.sql",
      "size": 1048576,
      "created": "2025-01-15T23:00:00.000Z",
      "modified": "2025-01-15T23:00:00.000Z"
    }
  ]
}
```

### POST `/api/backup/create`
Creates a new database backup.

**Response:**
```json
{
  "success": true,
  "message": "Backup created successfully",
  "backup": {
    "filename": "radiodb-backup-2025-01-15T23-00-00.sql",
    "size": 1048576,
    "created": "2025-01-15T23:00:00.000Z"
  }
}
```

### GET `/api/backup/download/:filename`
Downloads a specific backup file.

### DELETE `/api/backup/delete/:filename`
Deletes a specific backup file.

### POST `/api/backup/restore/:filename`
Restores the database from a specific backup file.

### POST `/api/backup/restore-upload`
Uploads and restores from a custom SQL file.

**Request:** Multipart form data with `sqlFile` field.

### POST `/api/backup/cleanup`
Manually triggers cleanup of old backup files.

## Database Configuration

The module uses the following environment variables:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: radiodb)
- `DB_USER` - Database user (default: radiouser)
- `DB_PASSWORD` - Database password (default: radio123)

## File Management

### Backup Directory
- Location: `./backup/`
- Automatic creation if not exists
- Stores `.sql` and `.dump` files

### File Naming Convention
- Manual backups: `radiodb-backup-YYYY-MM-DDTHH-MM-SS.sql`
- Automatic backups: `radiodb-auto-backup-YYYY-MM-DDTHH-MM-SS.sql`

### Cleanup Policy
- Keeps latest 30 backup files
- Deletes oldest files automatically
- Runs after each backup creation

## User Interface

### Main Features
1. **Backup Actions Card**
   - "גבו עכשיו" button for instant backup
   - "העלה קובץ SQL" button for file upload

2. **Backup List Table**
   - Shows all available backups
   - File size and creation date
   - Download, restore, and delete actions
   - Automatic backup indicator

3. **Upload Dialog**
   - File selection with validation
   - Progress indicator
   - Warning messages

4. **Restore Confirmation**
   - Multiple warning dialogs
   - 10-second countdown timer
   - Clear danger indicators

### Safety Measures
- **File type validation** - Only SQL files accepted
- **File size limits** - 50MB maximum
- **Multiple confirmations** - For destructive operations
- **Countdown timer** - Prevents accidental restores
- **Clear warnings** - Hebrew text explaining risks

## Cron Job Configuration

The automatic backup runs daily at 23:00 using node-cron:

```javascript
// Schedule automatic database backup every day at 23:00
cron.schedule('0 23 * * *', createAutomaticBackup);
```

## System Service

### Service File: `radio-lineup-cron.service`
- Runs as systemd service
- Auto-restart on failure
- Starts on boot
- Depends on PostgreSQL

### Service Commands
```bash
# Check status
sudo systemctl status radio-lineup-cron.service

# Start service
sudo systemctl start radio-lineup-cron.service

# Stop service
sudo systemctl stop radio-lineup-cron.service

# Restart service
sudo systemctl restart radio-lineup-cron.service

# View logs
sudo journalctl -u radio-lineup-cron.service -f
```

## Error Handling

### Backup Creation Errors
- Database connection issues
- Disk space problems
- Permission errors
- All logged to console

### Restore Errors
- Invalid SQL files
- Database connection issues
- Permission problems
- User-friendly error messages

### File Management Errors
- Missing files
- Permission issues
- Disk space problems
- Automatic retry mechanisms

## Security Considerations

### Authentication
- All endpoints require admin authentication
- Uses existing auth middleware
- Session-based access control

### File Security
- Files stored outside web root
- Direct file access prevented
- Download through authenticated API

### Database Security
- Uses environment variables for credentials
- No hardcoded passwords
- Secure connection strings

## Monitoring and Logging

### Console Logs
- Backup creation events
- Restore operations
- Cleanup activities
- Error messages

### System Logs
- Service status
- Startup/shutdown events
- Error tracking

### User Feedback
- Toast notifications for all operations
- Progress indicators
- Success/error messages

## Troubleshooting

### Common Issues

1. **Backup Creation Fails**
   - Check database connection
   - Verify disk space
   - Check file permissions

2. **Service Won't Start**
   - Check systemd logs
   - Verify environment variables
   - Check file paths

3. **Upload Fails**
   - Check file size (max 50MB)
   - Verify file type (.sql only)
   - Check disk space

4. **Restore Fails**
   - Verify SQL file format
   - Check database permissions
   - Ensure sufficient disk space

### Debug Commands
```bash
# Check service logs
sudo journalctl -u radio-lineup-cron.service -f

# Check backup directory
ls -la backup/

# Test database connection
psql -h localhost -U radiouser -d radiodb

# Check disk space
df -h
```

## Future Enhancements

### Potential Improvements
- **Compression** - Gzip backup files
- **Encryption** - Encrypt backup files
- **Cloud Storage** - Upload to cloud services
- **Email Notifications** - Alert on backup failures
- **Backup Verification** - Validate backup integrity
- **Scheduled Restores** - Automated restore testing

### Configuration Options
- Backup frequency
- Retention policy
- Compression settings
- Notification preferences
- Cloud storage integration

## Support

For issues or questions about the backup/restore module:
1. Check the console logs
2. Review systemd service status
3. Verify database connectivity
4. Check file permissions and disk space
