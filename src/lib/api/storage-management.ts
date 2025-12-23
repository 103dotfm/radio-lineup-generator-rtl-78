const API_BASE = '/api/storage-management';

export interface StorageUsage {
  total: string;
  used: string;
  available: string;
  usePercent: number;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  formatted: {
    total: string;
    used: string;
    available: string;
    percentage: number;
  };
}

export interface BackupFile {
  path: string;
  filename: string;
  size: number;
  sizeFormatted: string;
  modified: Date;
  location: 'web' | 'local';
}

export interface BackupList {
  backups: BackupFile[];
  totalCount: number;
  totalSize: number;
  totalSizeFormatted: string;
}

export interface LogFile {
  filename?: string;
  path: string;
  size: number;
  sizeFormatted: string;
  modified?: Date;
  ageDays?: number;
}

export interface LogAnalysis {
  pm2AppLogs: LogFile[];
  pm2SystemLogs: LogFile[];
  systemLogs: LogFile[];
  postgresLogs: LogFile[];
  totalSize: number;
  totalSizeFormatted: string;
}

export interface CleanupJob {
  status: 'running' | 'completed' | 'failed';
  progress: number;
  actions: string[];
  results: any;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

export async function getStorageUsage(): Promise<StorageUsage> {
  const response = await fetch(`${API_BASE}/usage`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Failed to fetch storage usage: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  if (!data.success || !data.data) {
    throw new Error(data.error || 'Invalid response from server');
  }
  return data.data;
}

export async function getBackupList(): Promise<BackupList> {
  const response = await fetch(`${API_BASE}/backups`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch backup list');
  }
  
  const data = await response.json();
  return data.data;
}

export async function getLogAnalysis(): Promise<LogAnalysis> {
  const response = await fetch(`${API_BASE}/logs`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch log analysis');
  }
  
  const data = await response.json();
  return data.data;
}

export async function executeCleanup(actions: string[]): Promise<{ jobId: string; message: string }> {
  const response = await fetch(`${API_BASE}/cleanup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ actions })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to execute cleanup');
  }
  
  const data = await response.json();
  return data;
}

export async function getCleanupStatus(jobId: string): Promise<CleanupJob> {
  const response = await fetch(`${API_BASE}/cleanup-status/${jobId}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch cleanup status');
  }
  
  const data = await response.json();
  return data.data;
}


