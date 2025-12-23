import express from 'express';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promisify } from 'util';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = '/home/iteam/radio-lineup-generator-rtl-78';

const jobStatus = new Map();

function parseSize(sizeStr) {
  const units = { 'K': 1024, 'M': 1024*1024, 'G': 1024*1024*1024, 'T': 1024*1024*1024*1024 };
  const match = sizeStr.match(/^([\d.]+)([KMGT])?/i);
  if (!match) return 0;
  const value = parseFloat(match[1]);
  const unit = match[2]?.toUpperCase() || '';
  return value * (units[unit] || 1);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

router.get('/usage', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { stdout, stderr } = await execAsync("df -h / | tail -1");
    
    if (stderr) {
      console.warn('df command stderr:', stderr);
    }
    
    if (!stdout || stdout.trim().length === 0) {
      throw new Error('df command returned empty output');
    }
    
    const parts = stdout.trim().split(/\s+/);
    
    if (parts.length < 5) {
      throw new Error(`Unexpected df output format: ${stdout}`);
    }
    
    const total = parts[1];
    const used = parts[2];
    const available = parts[3];
    const usePercentStr = parts[4].replace('%', '');
    const usePercent = parseInt(usePercentStr);
    
    if (isNaN(usePercent)) {
      throw new Error(`Invalid percentage value: ${usePercentStr}`);
    }
    
    const totalBytes = parseSize(total);
    const usedBytes = parseSize(used);
    const availableBytes = parseSize(available);
    
    res.json({
      success: true,
      data: {
        total,
        used,
        available,
        usePercent,
        totalBytes,
        usedBytes,
        availableBytes,
        formatted: {
          total,
          used,
          available,
          percentage: usePercent
        }
      }
    });
  } catch (error) {
    console.error('Error getting disk usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get disk usage',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get('/backups', requireAuth, requireAdmin, async (req, res) => {
  try {
    const backups = [];
    
    try {
      const webBackups = await fs.readdir('/var/www/html');
      for (const file of webBackups) {
        if (file.startsWith('radio_lineup_generator_backup_') && file.endsWith('.sql.gz')) {
          const filePath = join('/var/www/html', file);
          const stats = await fs.stat(filePath);
          backups.push({
            path: filePath,
            filename: file,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            modified: stats.mtime,
            location: 'web'
          });
        }
      }
    } catch (err) {
      console.warn('Could not read /var/www/html:', err.message);
    }
    
    try {
      const backupDir = join(PROJECT_DIR, 'backup');
      const files = await fs.readdir(backupDir);
      for (const file of files) {
        if (file.startsWith('radiodb-auto-backup-') && file.endsWith('.sql')) {
          const filePath = join(backupDir, file);
          const stats = await fs.stat(filePath);
          backups.push({
            path: filePath,
            filename: file,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            modified: stats.mtime,
            location: 'local'
          });
        }
      }
    } catch (err) {
      console.warn('Could not read backup directory:', err.message);
    }
    
    backups.sort((a, b) => b.modified - a.modified);
    
    res.json({
      success: true,
      data: {
        backups,
        totalCount: backups.length,
        totalSize: backups.reduce((sum, b) => sum + b.size, 0),
        totalSizeFormatted: formatBytes(backups.reduce((sum, b) => sum + b.size, 0))
      }
    });
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list backups',
      details: error.message
    });
  }
});

router.get('/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const logAnalysis = {
      pm2AppLogs: [],
      pm2SystemLogs: [],
      systemLogs: [],
      postgresLogs: [],
      totalSize: 0
    };
    
    try {
      const logsDir = join(PROJECT_DIR, 'logs');
      const files = await fs.readdir(logsDir);
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = join(logsDir, file);
          const stats = await fs.stat(filePath);
          logAnalysis.pm2AppLogs.push({
            filename: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            modified: stats.mtime,
            ageDays: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
          });
          logAnalysis.totalSize += stats.size;
        }
      }
    } catch (err) {
      console.warn('Could not read PM2 app logs:', err.message);
    }
    
    try {
      const pm2LogsDir = join(process.env.HOME || '/home/iteam', '.pm2', 'logs');
      const files = await fs.readdir(pm2LogsDir);
      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = join(pm2LogsDir, file);
          const stats = await fs.stat(filePath);
          logAnalysis.pm2SystemLogs.push({
            filename: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            modified: stats.mtime,
            ageDays: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
          });
          logAnalysis.totalSize += stats.size;
        }
      }
    } catch (err) {
      console.warn('Could not read PM2 system logs:', err.message);
    }
    
    try {
      const { stdout } = await execAsync("du -sh /var/log/* 2>/dev/null | sort -h | tail -10");
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const match = line.match(/^(\S+)\s+(.+)$/);
        if (match) {
          const size = match[1];
          const path = match[2];
          logAnalysis.systemLogs.push({
            path,
            sizeFormatted: size,
            size: parseSize(size)
          });
          logAnalysis.totalSize += parseSize(size);
        }
      }
    } catch (err) {
      console.warn('Could not read system logs:', err.message);
    }
    
    res.json({
      success: true,
      data: {
        ...logAnalysis,
        totalSizeFormatted: formatBytes(logAnalysis.totalSize)
      }
    });
  } catch (error) {
    console.error('Error analyzing logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze logs',
      details: error.message
    });
  }
});

router.post('/cleanup', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { actions } = req.body;
    
    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Actions array is required'
      });
    }
    
    const validActions = [
      'delete-old-backups',
      'trim-logs',
      'clear-temp-files',
      'clear-cache',
      'clear-sql-files',
      'clear-old-storage',
      'clear-system-journal',
      'clear-editor-files',
      'clear-old-backup-files',
      'clear-nginx-cache'
    ];
    
    const invalidActions = actions.filter(a => !validActions.includes(a));
    if (invalidActions.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid actions: ${invalidActions.join(', ')}`
      });
    }
    
    const jobId = `cleanup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    jobStatus.set(jobId, {
      status: 'running',
      progress: 0,
      actions: actions,
      results: {},
      startedAt: new Date(),
      completedAt: null,
      error: null
    });
    
    const cleanupScript = join(__dirname, '../../scripts/storage-cleanup.js');
    exec(`node ${cleanupScript} ${jobId} ${actions.join(',')}`, (error, stdout, stderr) => {
      const job = jobStatus.get(jobId);
      if (error) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
      } else {
        try {
          const output = JSON.parse(stdout);
          job.status = 'completed';
          job.results = output;
          job.completedAt = new Date();
        } catch (parseError) {
          job.status = 'completed';
          job.results = { rawOutput: stdout };
          job.completedAt = new Date();
        }
      }
      jobStatus.set(jobId, job);
    });
    
    res.json({
      success: true,
      jobId,
      message: 'Cleanup job started'
    });
  } catch (error) {
    console.error('Error starting cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start cleanup',
      details: error.message
    });
  }
});

router.get('/cleanup-status/:jobId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobStatus.get(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error getting cleanup status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cleanup status',
      details: error.message
    });
  }
});

export default router;


