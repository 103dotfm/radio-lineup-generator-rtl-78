import express from 'express';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import { query } from '../../src/lib/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const execAsync = promisify(exec);

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Backup directory path
const BACKUP_DIR = join(__dirname, '../../backup');

// Ensure backup directory exists
fs.mkdir(BACKUP_DIR, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/sql' || file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new Error('Only SQL files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Get list of backup files
router.get('/list', requireAuth, requireAdmin, async (req, res) => {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = [];

    for (const file of files) {
      if (file.endsWith('.sql') || file.endsWith('.dump')) {
        const filePath = join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        backupFiles.push({
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        });
      }
    }

    // Sort by creation date (newest first)
    backupFiles.sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({ success: true, backups: backupFiles });
  } catch (error) {
    console.error('Error listing backup files:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a new backup
router.post('/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `radiodb-backup-${timestamp}.sql`;
    const filepath = join(BACKUP_DIR, filename);

    // Database connection parameters
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'radiodb';
    const dbUser = process.env.DB_USER || 'radiouser';
    const dbPassword = process.env.DB_PASSWORD || 'radio123';

    // Create pg_dump command
    const dumpCommand = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --clean --if-exists --no-owner --no-privileges > "${filepath}"`;

    console.log('Creating database backup...');
    const { stdout, stderr } = await execAsync(dumpCommand);

    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`pg_dump error: ${stderr}`);
    }

    // Get file stats
    const stats = await fs.stat(filepath);

    // Clean up old backups (keep only latest 30)
    await cleanupOldBackups();

    console.log(`Backup created successfully: ${filename}`);
    res.json({
      success: true,
      message: 'Backup created successfully',
      backup: {
        filename,
        size: stats.size,
        created: stats.birthtime
      }
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Download a backup file
router.get('/download/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = join(BACKUP_DIR, filename);

    // Check if file exists
    await fs.access(filepath);

    res.download(filepath, filename);
  } catch (error) {
    console.error('Error downloading backup:', error);
    res.status(404).json({ success: false, error: 'Backup file not found' });
  }
});

// Delete a backup file
router.delete('/delete/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = join(BACKUP_DIR, filename);

    // Check if file exists
    await fs.access(filepath);

    // Delete the file
    await fs.unlink(filepath);

    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restore database from backup
router.post('/restore/:filename', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = join(BACKUP_DIR, filename);

    // Check if file exists
    await fs.access(filepath);

    // Database connection parameters
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'radiodb';
    const dbUser = process.env.DB_USER || 'radiouser';
    const dbPassword = process.env.DB_PASSWORD || 'radio123';

    // Create psql restore command
    const restoreCommand = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} < "${filepath}"`;

    console.log(`Restoring database from backup: ${filename}`);
    const { stdout, stderr } = await execAsync(restoreCommand);

    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`psql restore error: ${stderr}`);
    }

    console.log(`Database restored successfully from: ${filename}`);
    res.json({
      success: true,
      message: 'Database restored successfully'
    });
  } catch (error) {
    console.error('Error restoring database:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload and restore from custom SQL file
router.post('/restore-upload', requireAuth, requireAdmin, upload.single('sqlFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No SQL file uploaded' });
    }

    const uploadedFilePath = req.file.path;
    const originalName = req.file.originalname;

    // Database connection parameters
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'radiodb';
    const dbUser = process.env.DB_USER || 'radiouser';
    const dbPassword = process.env.DB_PASSWORD || 'radio123';

    // Create psql restore command
    const restoreCommand = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} < "${uploadedFilePath}"`;

    console.log(`Restoring database from uploaded file: ${originalName}`);
    const { stdout, stderr } = await execAsync(restoreCommand);

    // Clean up uploaded file
    await fs.unlink(uploadedFilePath);

    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`psql restore error: ${stderr}`);
    }

    console.log(`Database restored successfully from uploaded file: ${originalName}`);
    res.json({
      success: true,
      message: 'Database restored successfully from uploaded file'
    });
  } catch (error) {
    console.error('Error restoring from uploaded file:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Clean up old backups (keep only latest 30)
async function cleanupOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = [];

    for (const file of files) {
      if (file.endsWith('.sql') || file.endsWith('.dump')) {
        const filePath = join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        
        backupFiles.push({
          filename: file,
          path: filePath,
          created: stats.birthtime
        });
      }
    }

    // Sort by creation date (oldest first)
    backupFiles.sort((a, b) => new Date(a.created) - new Date(b.created));

    // Delete files beyond the 30th one
    if (backupFiles.length > 30) {
      const filesToDelete = backupFiles.slice(0, backupFiles.length - 30);
      
      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          console.log(`Deleted old backup: ${file.filename}`);
        } catch (error) {
          console.error(`Error deleting old backup ${file.filename}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up old backups:', error);
  }
}

// Manual cleanup endpoint
router.post('/cleanup', requireAuth, requireAdmin, async (req, res) => {
  try {
    await cleanupOldBackups();
    res.json({ success: true, message: 'Old backups cleaned up successfully' });
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
