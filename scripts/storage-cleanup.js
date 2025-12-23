#!/usr/bin/env node

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = '/home/iteam/radio-lineup-generator-rtl-78';
const LOCK_FILE = '/tmp/storage-cleanup.lock';

const results = {
  success: true,
  actions: {},
  totalFreed: 0,
  errors: []
};

async function checkLock() {
  try {
    await fs.access(LOCK_FILE);
    console.error('Cleanup already running (lock file exists)');
    process.exit(1);
  } catch {
    // Lock file doesn't exist, create it
    await fs.writeFile(LOCK_FILE, process.pid.toString());
  }
}

async function removeLock() {
  try {
    await fs.unlink(LOCK_FILE);
  } catch (err) {
    // Ignore
  }
}

async function deleteOldBackups() {
  const actionResults = { deleted: [], kept: [], freed: 0, errors: [] };
  
  try {
    // Location 1: /var/www/html
    try {
      const files = await fs.readdir('/var/www/html');
      const backups = [];
      for (const file of files) {
        if (file.startsWith('radio_lineup_generator_backup_') && file.endsWith('.sql.gz')) {
          const filePath = join('/var/www/html', file);
          const stats = await fs.stat(filePath);
          backups.push({ path: filePath, filename: file, mtime: stats.mtime, size: stats.size });
        }
      }
      backups.sort((a, b) => b.mtime - a.mtime);
      if (backups.length > 1) {
        const toKeep = backups[0];
        actionResults.kept.push(toKeep.filename);
        for (let i = 1; i < backups.length; i++) {
          try {
            await fs.unlink(backups[i].path);
            actionResults.deleted.push(backups[i].filename);
            actionResults.freed += backups[i].size;
          } catch (err) {
            actionResults.errors.push(`Failed to delete ${backups[i].filename}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      actionResults.errors.push(`Could not access /var/www/html: ${err.message}`);
    }
    
    // Location 2: project backup directory
    try {
      const backupDir = join(PROJECT_DIR, 'backup');
      const files = await fs.readdir(backupDir);
      const backups = [];
      for (const file of files) {
        if (file.startsWith('radiodb-auto-backup-') && file.endsWith('.sql')) {
          const filePath = join(backupDir, file);
          const stats = await fs.stat(filePath);
          backups.push({ path: filePath, filename: file, mtime: stats.mtime, size: stats.size });
        }
      }
      backups.sort((a, b) => b.mtime - a.mtime);
      if (backups.length > 1) {
        const toKeep = backups[0];
        actionResults.kept.push(toKeep.filename);
        for (let i = 1; i < backups.length; i++) {
          try {
            await fs.unlink(backups[i].path);
            actionResults.deleted.push(backups[i].filename);
            actionResults.freed += backups[i].size;
          } catch (err) {
            actionResults.errors.push(`Failed to delete ${backups[i].filename}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      actionResults.errors.push(`Could not access backup directory: ${err.message}`);
    }
  } catch (err) {
    actionResults.errors.push(`Error in deleteOldBackups: ${err.message}`);
  }
  
  results.actions['delete-old-backups'] = actionResults;
  results.totalFreed += actionResults.freed;
}

async function trimLogs() {
  const actionResults = { compressed: [], deleted: [], freed: 0, errors: [] };
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  
  async function processLogFile(filePath, filename) {
    try {
      const stats = await fs.stat(filePath);
      const age = now - stats.mtime.getTime();
      
      if (age > ninetyDays) {
        await fs.unlink(filePath);
        actionResults.deleted.push(filename);
        actionResults.freed += stats.size;
      } else if (age > thirtyDays) {
        // Compress log file
        try {
          await execAsync(`gzip "${filePath}"`);
          actionResults.compressed.push(filename);
        } catch (err) {
          actionResults.errors.push(`Failed to compress ${filename}: ${err.message}`);
        }
      }
    } catch (err) {
      actionResults.errors.push(`Error processing ${filename}: ${err.message}`);
    }
  }
  
  // PM2 Application Logs
  try {
    const logsDir = join(PROJECT_DIR, 'logs');
    const files = await fs.readdir(logsDir);
    for (const file of files) {
      if (file.endsWith('.log') || file.endsWith('.log.gz')) {
        await processLogFile(join(logsDir, file), file);
      }
    }
  } catch (err) {
    actionResults.errors.push(`Could not process PM2 app logs: ${err.message}`);
  }
  
  // PM2 System Logs
  try {
    const pm2LogsDir = join(process.env.HOME || '/home/iteam', '.pm2', 'logs');
    const files = await fs.readdir(pm2LogsDir);
    for (const file of files) {
      if (file.endsWith('.log') || file.endsWith('.log.gz')) {
        await processLogFile(join(pm2LogsDir, file), file);
      }
    }
  } catch (err) {
    actionResults.errors.push(`Could not process PM2 system logs: ${err.message}`);
  }
  
  results.actions['trim-logs'] = actionResults;
  results.totalFreed += actionResults.freed;
}

async function clearTempFiles() {
  const actionResults = { deleted: [], freed: 0, errors: [] };
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  async function processTempDir(dir) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = join(dir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && !file.includes('.lock') && !file.startsWith('.')) {
            const age = now - stats.mtime.getTime();
            if (age > sevenDays) {
              await fs.unlink(filePath);
              actionResults.deleted.push(filePath);
              actionResults.freed += stats.size;
            }
          }
        } catch (err) {
          // Skip files we can't access
        }
      }
    } catch (err) {
      actionResults.errors.push(`Could not process ${dir}: ${err.message}`);
    }
  }
  
  await processTempDir('/tmp');
  await processTempDir('/var/tmp');
  await processTempDir(join(PROJECT_DIR, 'public', 'temp'));
  
  results.actions['clear-temp-files'] = actionResults;
  results.totalFreed += actionResults.freed;
}

async function clearCache() {
  const actionResults = { deleted: [], freed: 0, errors: [] };
  
  // Node.js cache
  const cacheDirs = [
    join(process.env.HOME || '/home/iteam', '.npm'),
    join(process.env.HOME || '/home/iteam', '.node-gyp'),
    join(PROJECT_DIR, 'node_modules', '.cache'),
    join(PROJECT_DIR, '.vite'),
    join(PROJECT_DIR, 'dist')
  ];
  
  for (const dir of cacheDirs) {
    try {
      const stats = await fs.stat(dir);
      if (stats.isDirectory()) {
        const { stdout } = await execAsync(`du -sb "${dir}" 2>/dev/null`);
        const size = parseInt(stdout.split('\t')[0]) || 0;
        await execAsync(`rm -rf "${dir}"`);
        actionResults.deleted.push(dir);
        actionResults.freed += size;
      }
    } catch (err) {
      // Directory doesn't exist or can't be deleted
    }
  }
  
  // Delete build artifacts
  try {
    const { stdout } = await execAsync(`find "${PROJECT_DIR}" -name "*.tsbuildinfo" -o -name "*.map" 2>/dev/null`);
    const files = stdout.trim().split('\n').filter(f => f);
    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        await fs.unlink(file);
        actionResults.deleted.push(file);
        actionResults.freed += stats.size;
      } catch (err) {
        // Skip
      }
    }
  } catch (err) {
    // No files found
  }
  
  results.actions['clear-cache'] = actionResults;
  results.totalFreed += actionResults.freed;
}

async function clearSqlFiles() {
  const actionResults = { deleted: [], freed: 0, errors: [] };
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  // public/sql directory
  try {
    const sqlDir = join(PROJECT_DIR, 'public', 'sql');
    const files = await fs.readdir(sqlDir);
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filePath = join(sqlDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();
        if (age > thirtyDays) {
          await fs.unlink(filePath);
          actionResults.deleted.push(file);
          actionResults.freed += stats.size;
        }
      }
    }
  } catch (err) {
    actionResults.errors.push(`Could not process SQL files: ${err.message}`);
  }
  
  // Root directory SQL files (test files, etc.)
  try {
    const files = await fs.readdir(PROJECT_DIR);
    for (const file of files) {
      if (file.endsWith('.sql') && !file.includes('migration')) {
        const filePath = join(PROJECT_DIR, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();
        if (age > thirtyDays && stats.isFile()) {
          await fs.unlink(filePath);
          actionResults.deleted.push(file);
          actionResults.freed += stats.size;
        }
      }
    }
  } catch (err) {
    actionResults.errors.push(`Could not process root SQL files: ${err.message}`);
  }
  
  results.actions['clear-sql-files'] = actionResults;
  results.totalFreed += actionResults.freed;
}

async function clearOldStorage() {
  const actionResults = { deleted: [], freed: 0, errors: [] };
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  // Old storage directory (if exists and migration complete)
  try {
    const oldStorageDir = join(PROJECT_DIR, 'storage');
    const stats = await fs.stat(oldStorageDir);
    if (stats.isDirectory()) {
      const { stdout } = await execAsync(`du -sb "${oldStorageDir}" 2>/dev/null`);
      const size = parseInt(stdout.split('\t')[0]) || 0;
      await execAsync(`rm -rf "${oldStorageDir}"`);
      actionResults.deleted.push('storage/');
      actionResults.freed += size;
    }
  } catch (err) {
    // Directory doesn't exist
  }
  
  // Orphaned uploads in storage-new
  // IMPORTANT: Exclude 'avatars' category - profile pictures should never be auto-deleted
  const EXCLUDED_CATEGORIES = ['avatars', 'profile-pictures'];
  try {
    const uploadsDir = join(PROJECT_DIR, 'storage-new', 'uploads');
    const categories = await fs.readdir(uploadsDir);
    for (const category of categories) {
      // Skip excluded categories (user profile pictures)
      if (EXCLUDED_CATEGORIES.includes(category)) {
        continue;
      }
      
      const categoryPath = join(uploadsDir, category);
      const files = await fs.readdir(categoryPath);
      for (const file of files) {
        const filePath = join(categoryPath, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtime.getTime();
        if (age > ninetyDays) {
          await fs.unlink(filePath);
          actionResults.deleted.push(filePath);
          actionResults.freed += stats.size;
        }
      }
    }
  } catch (err) {
    actionResults.errors.push(`Could not process old storage: ${err.message}`);
  }
  
  results.actions['clear-old-storage'] = actionResults;
  results.totalFreed += actionResults.freed;
}

async function clearSystemJournal() {
  const actionResults = { freed: 0, errors: [] };
  
  try {
    // Vacuum systemd journal
    await execAsync('journalctl --vacuum-time=30d');
    await execAsync('journalctl --vacuum-size=500M');
    actionResults.freed = 0; // Size calculation would require before/after comparison
  } catch (err) {
    actionResults.errors.push(`Could not clear system journal: ${err.message}`);
  }
  
  results.actions['clear-system-journal'] = actionResults;
}

async function clearEditorFiles() {
  const actionResults = { deleted: [], freed: 0, errors: [] };
  
  const patterns = ['.DS_Store', 'Thumbs.db', '*.swp', '*.swo', '*~'];
  
  for (const pattern of patterns) {
    try {
      const { stdout } = await execAsync(`find "${PROJECT_DIR}" -name "${pattern}" -type f 2>/dev/null`);
      const files = stdout.trim().split('\n').filter(f => f);
      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          await fs.unlink(file);
          actionResults.deleted.push(file);
          actionResults.freed += stats.size;
        } catch (err) {
          // Skip
        }
      }
    } catch (err) {
      // No files found
    }
  }
  
  results.actions['clear-editor-files'] = actionResults;
  results.totalFreed += actionResults.freed;
}

async function clearOldBackupFiles() {
  const actionResults = { deleted: [], freed: 0, errors: [] };
  
  const patterns = ['*.bak', '*.old', '*.backup'];
  
  for (const pattern of patterns) {
    try {
      const { stdout } = await execAsync(`find "${PROJECT_DIR}" -name "${pattern}" -type f 2>/dev/null`);
      const files = stdout.trim().split('\n').filter(f => f);
      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          await fs.unlink(file);
          actionResults.deleted.push(file);
          actionResults.freed += stats.size;
        } catch (err) {
          // Skip
        }
      }
    } catch (err) {
      // No files found
    }
  }
  
  results.actions['clear-old-backup-files'] = actionResults;
  results.totalFreed += actionResults.freed;
}

async function clearNginxCache() {
  const actionResults = { deleted: [], freed: 0, errors: [] };
  
  const cacheDirs = ['/var/lib/nginx', '/var/cache/nginx'];
  
  for (const dir of cacheDirs) {
    try {
      const stats = await fs.stat(dir);
      if (stats.isDirectory()) {
        const { stdout } = await execAsync(`du -sb "${dir}" 2>/dev/null`);
        const size = parseInt(stdout.split('\t')[0]) || 0;
        await execAsync(`rm -rf "${dir}"/*`);
        actionResults.deleted.push(dir);
        actionResults.freed += size;
      }
    } catch (err) {
      // Directory doesn't exist or can't be cleared
    }
  }
  
  results.actions['clear-nginx-cache'] = actionResults;
  results.totalFreed += actionResults.freed;
}

async function main() {
  const args = process.argv.slice(2);
  const jobId = args[0] || 'unknown';
  const actions = args[1] ? args[1].split(',') : [];
  
  await checkLock();
  
  try {
    const actionMap = {
      'delete-old-backups': deleteOldBackups,
      'trim-logs': trimLogs,
      'clear-temp-files': clearTempFiles,
      'clear-cache': clearCache,
      'clear-sql-files': clearSqlFiles,
      'clear-old-storage': clearOldStorage,
      'clear-system-journal': clearSystemJournal,
      'clear-editor-files': clearEditorFiles,
      'clear-old-backup-files': clearOldBackupFiles,
      'clear-nginx-cache': clearNginxCache
    };
    
    for (const action of actions) {
      if (actionMap[action]) {
        try {
          await actionMap[action]();
        } catch (err) {
          results.errors.push(`Error in ${action}: ${err.message}`);
          if (!results.actions[action]) {
            results.actions[action] = { errors: [err.message] };
          }
        }
      }
    }
    
    results.totalFreedFormatted = formatBytes(results.totalFreed);
    console.log(JSON.stringify(results));
  } catch (err) {
    results.success = false;
    results.errors.push(err.message);
    console.error(JSON.stringify(results));
    process.exit(1);
  } finally {
    await removeLock();
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

main().catch(err => {
  console.error(JSON.stringify({ success: false, error: err.message }));
  process.exit(1);
});



