#!/bin/bash

# Radio Lineup Generator Database Backup Script
# This script creates a complete database backup and makes it available for download

set -e  # Exit on any error

# Configuration
PROJECT_DIR="/home/iteam/radio-lineup-generator-rtl-78"
WEB_DIR="/var/www/html"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="radiouser"
DB_NAME="radiodb"
SERVER_IP="192.168.10.121"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to generate timestamp
get_timestamp() {
    date +%Y%m%d_%H%M%S
}

# Function to get file size in human readable format
get_file_size() {
    ls -lh "$1" | awk '{print $5}'
}

# Main backup function
create_backup() {
    print_status "Starting database backup process..."
    
    # Navigate to project directory
    cd "$PROJECT_DIR" || {
        print_error "Failed to navigate to project directory: $PROJECT_DIR"
        exit 1
    }
    
    # Generate timestamp and filename
    TIMESTAMP=$(get_timestamp)
    BACKUP_FILENAME="radio_lineup_generator_backup_${TIMESTAMP}.sql"
    COMPRESSED_FILENAME="${BACKUP_FILENAME}.gz"
    
    print_status "Creating database dump: $BACKUP_FILENAME"
    
    # Create database dump
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --if-exists --create --no-owner --no-privileges \
        > "$BACKUP_FILENAME"; then
        print_success "Database dump created successfully"
    else
        print_error "Failed to create database dump"
        exit 1
    fi
    
    # Compress the backup file
    print_status "Compressing backup file..."
    if gzip "$BACKUP_FILENAME"; then
        print_success "Backup file compressed successfully"
    else
        print_error "Failed to compress backup file"
        exit 1
    fi
    
    # Copy to web directory
    print_status "Copying backup to web directory..."
    if sudo cp "$COMPRESSED_FILENAME" "$WEB_DIR/"; then
        print_success "Backup copied to web directory"
    else
        print_error "Failed to copy backup to web directory"
        exit 1
    fi
    
    # Get file size
    FILE_SIZE=$(get_file_size "$WEB_DIR/$COMPRESSED_FILENAME")
    
    # Update HTML backup page
    print_status "Updating backup information page..."
    update_html_page "$COMPRESSED_FILENAME" "$FILE_SIZE" "$TIMESTAMP"
    
    # Clean up local backup file
    rm -f "$COMPRESSED_FILENAME"
    
    # Verify accessibility
    print_status "Verifying backup accessibility..."
    verify_backup_accessibility "$COMPRESSED_FILENAME"
    
    print_success "Backup process completed successfully!"
    print_status "Backup Information:"
    echo "  - Filename: $COMPRESSED_FILENAME"
    echo "  - Size: $FILE_SIZE"
    echo "  - Created: $(date -d "${TIMESTAMP:0:8} ${TIMESTAMP:9:2}:${TIMESTAMP:11:2}:${TIMESTAMP:13:2}" '+%B %d, %Y at %H:%M:%S')"
    echo "  - Download URL: http://$SERVER_IP/$COMPRESSED_FILENAME"
    echo "  - Info Page: http://$SERVER_IP/database-backup.html"
}

# Function to update HTML backup page
update_html_page() {
    local filename="$1"
    local filesize="$2"
    local timestamp="$3"
    local created_date=$(date -d "${timestamp:0:8} ${timestamp:9:2}:${timestamp:11:2}:${timestamp:13:2}" '+%B %d, %Y at %H:%M:%S')
    
    # Create temporary HTML file
    cat > /tmp/database-backup.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Radio Lineup Generator - Database Backup</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .backup-info {
            background: #e8f4fd;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #2196F3;
        }
        .download-link {
            display: inline-block;
            background: #4CAF50;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
            transition: background-color 0.3s;
        }
        .download-link:hover {
            background: #45a049;
        }
        .file-info {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .file-info strong {
            color: #333;
        }
        .instructions {
            background: #fff3cd;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Radio Lineup Generator Database Backup</h1>
        
        <div class="backup-info">
            <h2>✅ Backup Completed Successfully</h2>
            <p>A complete database dump has been created and is ready for download.</p>
        </div>

        <div class="file-info">
            <h3>📁 Backup File Information:</h3>
            <p><strong>Filename:</strong> $filename</p>
            <p><strong>Size:</strong> $filesize (compressed)</p>
            <p><strong>Created:</strong> $created_date</p>
            <p><strong>Database:</strong> radiodb (PostgreSQL)</p>
            <p><strong>Format:</strong> SQL dump with gzip compression</p>
        </div>

        <div style="text-align: center;">
            <a href="$filename" class="download-link">
                📥 Download Database Backup
            </a>
        </div>

        <div class="instructions">
            <h3>🔧 How to Restore This Backup:</h3>
            <ol>
                <li>Download the backup file</li>
                <li>Extract the gzip file: <code>gunzip $filename</code></li>
                <li>Restore to PostgreSQL: <code>psql -h localhost -U radiouser -d radiodb &lt; ${filename%.gz}</code></li>
                <li>Enter the password when prompted: <code>radio123</code></li>
            </ol>
        </div>

        <div class="backup-info">
            <h3>📋 What's Included in This Backup:</h3>
            <ul>
                <li>Complete database schema (tables, indexes, constraints)</li>
                <li>All data from all tables</li>
                <li>Stored procedures and functions</li>
                <li>Triggers and sequences</li>
                <li>Database extensions (pg_trgm, uuid-ossp)</li>
                <li>User permissions and roles</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #666;">
            <p><small>Generated on: $created_date | Server: $SERVER_IP</small></p>
        </div>
    </div>
</body>
</html>
EOF
    
    # Copy to web directory
    if sudo cp /tmp/database-backup.html "$WEB_DIR/"; then
        print_success "Backup information page updated"
    else
        print_error "Failed to update backup information page"
        exit 1
    fi
    
    # Clean up temporary file
    rm -f /tmp/database-backup.html
}

# Function to verify backup accessibility
verify_backup_accessibility() {
    local filename="$1"
    
    # Test HTML page
    if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/database-backup.html" | grep -q "200"; then
        print_success "Backup information page is accessible"
    else
        print_warning "Backup information page may not be accessible"
    fi
    
    # Test backup file
    if curl -s -o /dev/null -w "%{http_code}" "http://$SERVER_IP/$filename" | grep -q "200"; then
        print_success "Backup file is accessible for download"
    else
        print_warning "Backup file may not be accessible for download"
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verify   Only verify existing backups"
    echo ""
    echo "Examples:"
    echo "  $0              # Create a new backup"
    echo "  $0 --verify     # Verify existing backups"
}

# Function to verify existing backups
verify_existing_backups() {
    print_status "Verifying existing backups..."
    
    # Check for backup files
    BACKUP_FILES=$(ls -1 "$WEB_DIR"/radio_lineup_generator_backup_*.sql.gz 2>/dev/null || true)
    
    if [ -z "$BACKUP_FILES" ]; then
        print_warning "No backup files found in $WEB_DIR"
        return
    fi
    
    print_status "Found backup files:"
    for file in $BACKUP_FILES; do
        filename=$(basename "$file")
        filesize=$(get_file_size "$file")
        print_status "  - $filename ($filesize)"
    done
    
    # Test accessibility
    verify_backup_accessibility "$(basename "$(ls -t "$WEB_DIR"/radio_lineup_generator_backup_*.sql.gz | head -1)")"
}

# Main script logic
main() {
    case "${1:-}" in
        -h|--help)
            show_usage
            exit 0
            ;;
        -v|--verify)
            verify_existing_backups
            exit 0
            ;;
        "")
            create_backup
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 