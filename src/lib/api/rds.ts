import { RDSSettings, RDSData, TranslationMapping } from '@/types/schedule';

const API_BASE = '/api/rds';

// Get RDS settings
export const getRDSSettings = async (): Promise<RDSSettings> => {
  const response = await fetch(`${API_BASE}/settings`);
  if (!response.ok) {
    throw new Error('Failed to fetch RDS settings');
  }
  return response.json();
};

// Update RDS settings
export const updateRDSSettings = async (settings: Partial<RDSSettings>): Promise<RDSSettings> => {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error('Failed to update RDS settings');
  }
  return response.json();
};

// Get RDS data for a specific slot
export const getRDSDataForSlot = async (slotId: string): Promise<RDSData> => {
  const response = await fetch(`${API_BASE}/slot/${slotId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch RDS data for slot');
  }
  return response.json();
};

// Update RDS data for a specific slot
export const updateRDSDataForSlot = async (
  slotId: string, 
  rdsData: {
    rds_pty: number;
    rds_ms: number;
    rds_radio_text: string;
    rds_radio_text_translated: string;
  }
): Promise<any> => {
  const response = await fetch(`${API_BASE}/slot/${slotId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rdsData),
  });
  if (!response.ok) {
    throw new Error('Failed to update RDS data for slot');
  }
  return response.json();
};

// Generate translation using search and replace
export const translateShowText = async (show_name: string, host_name: string): Promise<{ 
  translated_text: string;
  all_strings_found: boolean;
  found_strings: string[];
}> => {
  const response = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ show_name, host_name }),
  });
  if (!response.ok) {
    throw new Error('Failed to translate text');
  }
  return response.json();
};

// Translation mappings management
export const getTranslationMappings = async (): Promise<TranslationMapping[]> => {
  const response = await fetch(`${API_BASE}/translations`);
  if (!response.ok) {
    throw new Error('Failed to fetch translation mappings');
  }
  return response.json();
};

export const createTranslationMapping = async (hebrewText: string, englishText: string): Promise<TranslationMapping> => {
  const response = await fetch(`${API_BASE}/translations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hebrew_text: hebrewText, english_text: englishText }),
  });

  if (!response.ok) {
    throw new Error('Failed to create translation mapping');
  }

  return response.json();
};

export const updateTranslationMapping = async (id: string, hebrewText: string, englishText: string): Promise<TranslationMapping> => {
  const response = await fetch(`${API_BASE}/translations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hebrew_text: hebrewText, english_text: englishText }),
  });

  if (!response.ok) {
    throw new Error('Failed to update translation mapping');
  }

  return response.json();
};

export const deleteTranslationMapping = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/translations/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete translation mapping');
  }
};

// Get current RDS data (global settings + current slot data)
export const getCurrentRDSData = async (): Promise<RDSData & { show_name: string; host_name: string }> => {
  const response = await fetch(`${API_BASE}/current`);
  if (!response.ok) {
    throw new Error('Failed to fetch current RDS data');
  }
  return response.json();
};

// Send current RDS data to transmitter
export const sendCurrentRDSData = async (): Promise<{ success: boolean; message: string; data: RDSData }> => {
  const response = await fetch(`${API_BASE}/send-current`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to send current RDS data');
  }
  return response.json();
};

// Send RDS data to transmitter
export const sendRDSData = async (slotId: string): Promise<{ success: boolean; message: string; data: RDSData }> => {
  const response = await fetch(`${API_BASE}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ slotId }),
  });
  if (!response.ok) {
    throw new Error('Failed to send RDS data');
  }
  return response.json();
};

// Invalidate RDS JSON cache
export const invalidateRDSCache = async (): Promise<{ success: boolean; message: string; timestamp: string }> => {
  const response = await fetch('/api/rds/invalidate-cache', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to invalidate RDS cache');
  }
  return response.json();
};

// Send RDS data via telnet
export const sendRDSDataViaTelnet = async (): Promise<{ 
  success: boolean; 
  message: string; 
  data?: any;
  skipped?: boolean;
}> => {
  const response = await fetch(`${API_BASE}/send-via-telnet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to send RDS data via telnet');
  }
  return response.json();
};

// Get RDS transmission logs
export const getRDSTransmissionLogs = async (limit: number = 50): Promise<{
  success: boolean;
  logs: Array<{
    id: string;
    transmission_time: string;
    rds_data: any;
    success: boolean;
    message: string;
    telnet_server: string;
    telnet_port: number;
    created_at: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE}/transmission-logs?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch RDS transmission logs');
  }
  return response.json();
};

// Get cron job status
export const getCronStatus = async (): Promise<{
  success: boolean;
  status: {
    isRunning: boolean;
    lastRun: string | null;
    nextRun: string | null;
    totalRuns: number;
    lastError: string | null;
    lastSuccess: string | null;
    startTime: string | null;
    nextRuns: string[];
    uptime: number;
  };
}> => {
  const response = await fetch(`${API_BASE}/cron-status`);
  if (!response.ok) {
    throw new Error('Failed to get cron status');
  }
  return response.json();
};

// Restart RDS cron job
export const restartCron = async (): Promise<{
  success: boolean;
  message: string;
  result: any;
}> => {
  const response = await fetch(`${API_BASE}/restart-cron`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to restart cron job');
  }
  return response.json();
};

// Trigger manual RDS transmission
export const triggerManualTransmission = async (): Promise<{
  success: boolean;
  message: string;
  result: any;
}> => {
  const response = await fetch(`${API_BASE}/trigger-transmission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to trigger manual transmission');
  }
  return response.json();
};
