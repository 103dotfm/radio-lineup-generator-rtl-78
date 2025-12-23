# Storage System Documentation

## Overview

This document describes the new storage system that replaces the old Lovable storage. The new system provides better organization, security, and performance for file uploads and static file serving.

## Architecture

### Storage Structure

```
storage/
├── uploads/
│   ├── avatars/           # User profile pictures and avatars
│   ├── work-arrangements/ # PDF work arrangement files
│   ├── profile-pictures/  # Additional profile images
│   ├── documents/         # General document files (PDF, DOC, etc.)
│   └── general/           # Catch-all for other file types
└── lovable/               # Legacy storage (deprecated)
```

### File Categories

- **avatars**: User profile pictures and avatars (JPG, PNG, GIF, WebP)
- **work-arrangements**: PDF work arrangement files
- **profile-pictures**: Additional profile images (JPG, PNG, GIF, WebP)
- **documents**: General document files (PDF, DOC, DOCX, TXT, CSV)
- **general**: Catch-all for other file types

## API Endpoints

### Upload Files

```
POST /api/storage/upload/:category
```

**Parameters:**
- `category` (optional): Storage category (avatars, work-arrangements, profile-pictures, documents, general)

**Request Body:**
- `file`: File to upload (multipart/form-data)

**Response:**
```json
{
  "data": {
    "path": "/storage/uploads/work-arrangements/1234567890-123456789-filename.pdf",
    "fullPath": "http://localhost:5174/storage/uploads/work-arrangements/1234567890-123456789-filename.pdf",
    "filename": "1234567890-123456789-filename.pdf",
    "originalName": "original-filename.pdf",
    "size": 1024000,
    "mimetype": "application/pdf",
    "category": "work-arrangements"
  }
}
```

### Get File

```
GET /api/storage/:category/:filename
```

**Parameters:**
- `category`: Storage category
- `filename`: Name of the file

**Response:** File content with appropriate headers

### List Files

```
GET /api/storage/list/:category
```

**Parameters:**
- `category` (optional): Storage category (defaults to 'general')

**Response:**
```json
{
  "files": [
    {
      "filename": "1234567890-123456789-filename.pdf",
      "size": 1024000,
      "created": "2024-01-01T00:00:00.000Z",
      "modified": "2024-01-01T00:00:00.000Z",
      "path": "/storage/uploads/work-arrangements/1234567890-123456789-filename.pdf"
    }
  ]
}
```

### Delete File

```
DELETE /api/storage/:category/:filename
```

**Parameters:**
- `category`: Storage category
- `filename`: Name of the file to delete

**Response:**
```json
{
  "success": true
}
```

### Check File Existence

```
GET /api/storage/check/:category/:path
```

**Parameters:**
- `category`: Storage category
- `path`: File path (URL encoded)

**Response:**
```json
{
  "exists": true
}
```

## Frontend Integration

### Storage Service

The frontend uses a `StorageService` class for file operations:

```typescript
import { storageService } from '@/lib/storage';

// Upload a file
const result = await storageService.uploadFile(file, 'work-arrangements');

// Get file URL
const url = storageService.getFileUrl('/storage/uploads/work-arrangements/file.pdf');

// Check if file exists
const exists = await storageService.fileExists('work-arrangements', 'file.pdf');

// Delete file
const deleted = await storageService.deleteFile('work-arrangements', 'file.pdf');

// List files
const files = await storageService.listFiles('work-arrangements');
```

### File Upload Component

A reusable `FileUpload` component is available:

```typescript
import { FileUpload, FilePreview } from '@/components/ui/FileUpload';

function MyComponent() {
  const [uploadedFile, setUploadedFile] = useState(null);

  return (
    <div>
      <FileUpload
        category="work-arrangements"
        accept=".pdf"
        maxSize={10 * 1024 * 1024} // 10MB
        onUploadComplete={setUploadedFile}
        label="Upload Work Arrangement"
        placeholder="Choose a PDF file..."
      />
      
      {uploadedFile && (
        <FilePreview 
          file={uploadedFile} 
          onRemove={() => setUploadedFile(null)}
        />
      )}
    </div>
  );
}
```

## Static File Serving

### Nginx Configuration

Static files are served directly by nginx for better performance:

```nginx
location /storage {
    alias /home/iteam/radio-lineup-generator-rtl-78/storage;
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri $uri/ =404;
}
```

### Express Static Middleware

The server also serves static files for development:

```javascript
app.use('/storage', express.static(join(__dirname, '../storage')));
```

## Migration from Lovable Storage

### Automatic Migration

The migration script automatically moves files from the old structure:

```bash
node scripts/migrate-storage.js
```

### Manual Migration

To manually migrate files:

1. Move files from `storage/lovable/` to appropriate categories
2. Update database records to use new paths
3. Update frontend code to use new storage service

### Path Migration

The `StorageService.migrateFromLovable()` method helps migrate old paths:

```typescript
const newPath = storageService.migrateFromLovable('/lovable-uploads/old-file.png');
// Returns: '/storage/uploads/profile-pictures/old-file.png'
```

## Security Features

### File Type Validation

Only allowed file types are accepted:

- Images: JPG, JPEG, PNG, GIF, WebP
- Documents: PDF, DOC, DOCX, TXT, CSV

### File Size Limits

- Default limit: 10MB per file
- Configurable per upload

### Path Sanitization

File names are sanitized to prevent path traversal attacks:

```typescript
const sanitizedName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
```

### Unique Filenames

Files are given unique names to prevent conflicts:

```typescript
const filename = `${timestamp}-${randomSuffix}-${sanitizedName}${extension}`;
```

## Performance Optimizations

### Caching

- Static files are cached for 1 year
- Immutable cache headers for versioned files

### Direct File Serving

- Files are served directly by nginx
- No application server overhead for static files

### Organized Structure

- Files are organized by type for better performance
- Easier backup and maintenance

## Error Handling

### Common Errors

1. **File too large**: Returns 400 with size limit message
2. **Invalid file type**: Returns 400 with allowed types message
3. **File not found**: Returns 404
4. **Upload failed**: Returns 500 with error details

### Frontend Error Handling

```typescript
try {
  const result = await storageService.uploadFile(file, category);
  // Handle success
} catch (error) {
  // Handle error
  console.error('Upload failed:', error.message);
}
```

## Monitoring and Maintenance

### File Cleanup

Regular cleanup of unused files:

```bash
# List files in a category
curl http://localhost:5174/api/storage/list/work-arrangements

# Delete old files
curl -X DELETE http://localhost:5174/api/storage/work-arrangements/old-file.pdf
```

### Storage Monitoring

Monitor storage usage:

```bash
du -sh storage/uploads/*
```

### Backup Strategy

Backup the entire storage directory:

```bash
tar -czf storage-backup-$(date +%Y%m%d).tar.gz storage/
```

## Troubleshooting

### Common Issues

1. **File not accessible**: Check nginx configuration and file permissions
2. **Upload fails**: Check file size and type restrictions
3. **Path not found**: Verify storage directory structure

### Debug Commands

```bash
# Test storage system
node test-storage.js

# Check nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check file permissions
ls -la storage/uploads/
```

## Future Enhancements

### Planned Features

1. **Image resizing**: Automatic thumbnail generation
2. **CDN integration**: Cloud storage for better performance
3. **File versioning**: Keep multiple versions of files
4. **Advanced search**: Search files by metadata
5. **Bulk operations**: Upload/delete multiple files

### Configuration Options

Future configuration options:

```javascript
const storageConfig = {
  maxFileSize: 10 * 1024 * 1024,
  allowedTypes: ['image/*', 'application/pdf'],
  enableResizing: true,
  cdnEnabled: false,
  backupEnabled: true
};
```
