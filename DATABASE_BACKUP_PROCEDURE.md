# Database Backup Procedure Documentation

## Overview
This document outlines the complete procedure for creating database backups for the Radio Lineup Generator application and making them available for download through the web interface.

## Database Configuration
- **Database Type**: PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database Name**: radiodb
- **Username**: radiouser
- **Password**: radio123
- **Environment**: Local development

## Quick Start - Automated Backup
For immediate backup creation, use the automated script:

```bash
# Navigate to project directory
cd /home/iteam/radio-lineup-generator-rtl-78

# Create a new backup (automated)
./scripts/create_backup.sh

# Verify existing backups
./scripts/create_backup.sh --verify

# Show help
./scripts/create_backup.sh --help
```

The automated script will:
1. Create a timestamped database dump
2. Compress the file
3. Copy to web directory
4. Update the HTML backup page
5. Verify accessibility
6. Display backup information

## Manual Backup Process Steps

### 1. Create Database Dump
```bash
# Navigate to project directory
cd /home/iteam/radio-lineup-generator-rtl-78

# Create timestamped backup file
pg_dump -h localhost -p 5432 -U radiouser -d radiodb \
  --verbose --clean --if-exists --create --no-owner --no-privileges \
  > radio_lineup_generator_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Compress the Backup File
```bash
# Compress the SQL dump to reduce file size
gzip radio_lineup_generator_backup_YYYYMMDD_HHMMSS.sql
```

### 3. Copy to Web Directory
```bash
# Copy compressed backup to nginx web directory
sudo cp radio_lineup_generator_backup_YYYYMMDD_HHMMSS.sql.gz /var/www/html/
```

### 4. Update HTML Backup Page
The backup information page is located at `/var/www/html/database-backup.html` and needs to be updated with:
- New filename
- File size
- Creation timestamp
- Updated download link

### 5. Verify Nginx Configuration
Ensure nginx is configured to serve backup files correctly:
- HTML page: `http://192.168.10.121/database-backup.html`
- Backup files: `http://192.168.10.121/radio_lineup_generator_backup_*.sql.gz`

## Nginx Configuration
The nginx configuration includes specific location blocks for backup files:

```nginx
# Serve backup HTML page normally (display in browser)
location = /database-backup.html {
    root /var/www/html;
    try_files $uri =404;
    add_header Content-Type "text/html" always;
}

# Serve backup files as downloads
location ~ ^/radio_lineup_generator_backup_.*\.sql\.gz$ {
    root /var/www/html;
    try_files $uri =404;
    add_header Content-Disposition "attachment" always;
}
```

## Backup File Information
- **Format**: PostgreSQL SQL dump with gzip compression
- **Naming Convention**: `radio_lineup_generator_backup_YYYYMMDD_HHMMSS.sql.gz`
- **Typical Size**: ~400-500 KB (compressed)
- **Content**: Complete database schema, data, indexes, constraints, triggers, and functions

## What's Included in Each Backup
- Complete database schema (tables, indexes, constraints)
- All data from all tables
- Stored procedures and functions
- Triggers and sequences
- Database extensions (pg_trgm, uuid-ossp)
- User permissions and roles

## Restore Instructions
To restore a backup:
1. Download the backup file
2. Extract: `gunzip radio_lineup_generator_backup_YYYYMMDD_HHMMSS.sql.gz`
3. Restore: `psql -h localhost -U radiouser -d radiodb < radio_lineup_generator_backup_YYYYMMDD_HHMMSS.sql`
4. Enter password: `radio123`

## Automated Script Features
The `scripts/create_backup.sh` script provides:

### Features:
- **Colored output** for easy reading
- **Error handling** with automatic exit on failures
- **Automatic timestamping** of backup files
- **File compression** to reduce size
- **HTML page generation** with current backup information
- **Accessibility verification** of both HTML page and backup file
- **Cleanup** of temporary files

### Usage:
```bash
# Create a new backup
./scripts/create_backup.sh

# Verify existing backups
./scripts/create_backup.sh --verify

# Show help
./scripts/create_backup.sh --help
```

### Script Configuration:
- **Project Directory**: `/home/iteam/radio-lineup-generator-rtl-78`
- **Web Directory**: `/var/www/html`
- **Server IP**: `192.168.10.121`
- **Database**: PostgreSQL (localhost:5432/radiodb)

## Verification Commands
```bash
# Test HTML page accessibility
curl -I http://192.168.10.121/database-backup.html

# Test backup file accessibility
curl -I http://192.168.10.121/radio_lineup_generator_backup_YYYYMMDD_HHMMSS.sql.gz

# Check file size
ls -lh /var/www/html/radio_lineup_generator_backup_*.sql.gz

# Verify nginx configuration
sudo nginx -t
sudo systemctl reload nginx

# Use automated verification
./scripts/create_backup.sh --verify
```

## Current Backup Files
- **Latest**: `radio_lineup_generator_backup_20250630_092559.sql.gz` (405 KB)
- **Created**: June 30, 2025 at 09:26:59
- **Location**: `/var/www/html/`

## Future Request Format
When requesting a new backup, use this format:
> "Create a db backup and add it to backup section based on documentation"

This will trigger the complete backup procedure including:
1. Database dump creation
2. File compression
3. Web directory placement
4. HTML page update
5. Verification of accessibility

**Recommended approach**: Use the automated script for consistency and reliability.

## Troubleshooting
- **Permission Issues**: Ensure proper file permissions in `/var/www/html/`
- **Nginx Issues**: Check configuration with `sudo nginx -t`
- **Database Connection**: Verify PostgreSQL is running and accessible
- **File Access**: Test both HTML page and backup file downloads
- **Script Issues**: Check script permissions with `chmod +x scripts/create_backup.sh`

## Security Notes
- Backup files contain sensitive database information
- Access is limited to the local network (192.168.10.121)
- Consider implementing authentication for production environments
- Regularly rotate old backup files to manage disk space

## File Locations
- **Backup Files**: `/var/www/html/radio_lineup_generator_backup_*.sql.gz`
- **HTML Page**: `/var/www/html/database-backup.html`
- **Nginx Config**: `/etc/nginx/sites-available/radio-lineup-generator`
- **Project Directory**: `/home/iteam/radio-lineup-generator-rtl-78`
- **Backup Script**: `scripts/create_backup.sh`

---
*Last Updated: June 30, 2025*
*Documentation Version: 1.1* 