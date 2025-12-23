import { apiClient } from '../api-client';

export interface DigitalWorkArrangement {
  id: string;
  week_start: string;
  created_at?: string;
  updated_at?: string;
  is_published?: boolean;
  footer_text?: string;
}

export interface DigitalShift {
  id: string;
  arrangement_id: string;
  position: number;
  name: string;
  is_hidden?: boolean;
  created_at?: string;
  updated_at?: string;
  section_name: string;
  day_of_week: number;
  shift_type: string;
  is_custom_time: boolean;
  start_time?: string;
  end_time?: string;
  person_name?: string;
  additional_text?: string;
}

export interface DigitalShiftCustomRow {
  id: string;
  arrangement_id: string;
  position: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  section_name: string;
  contents?: Record<number, string>;
}

export const getWorkArrangement = async (weekStart: string): Promise<DigitalWorkArrangement[]> => {
  const response = await apiClient.get('/digital-work-arrangements', {
    params: { where: JSON.stringify({ week_start: weekStart }) }
  });
  return response.data;
};

export const createWorkArrangement = async (data: Partial<DigitalWorkArrangement>): Promise<DigitalWorkArrangement> => {
  const response = await apiClient.post('/digital-work-arrangements', data);
  return response.data;
};

export const updateWorkArrangement = async (id: string, data: Partial<DigitalWorkArrangement>): Promise<DigitalWorkArrangement> => {
  const response = await apiClient.put(`/digital-work-arrangements/${id}`, data);
  return response.data;
};

export const getShifts = async (arrangementId: string): Promise<DigitalShift[]> => {
  const response = await apiClient.get(`/digital-work-arrangements/${arrangementId}/shifts`);
  return response.data;
};

export const createShift = async (arrangementId: string, data: Partial<DigitalShift>): Promise<DigitalShift> => {
  const response = await apiClient.post(`/digital-work-arrangements/${arrangementId}/shifts`, data);
  return response.data;
};

export const updateShift = async (id: string, data: Partial<DigitalShift>): Promise<DigitalShift> => {
  const response = await apiClient.put(`/digital-work-arrangements/shifts/${id}`, data);
  return response.data;
};

export const deleteShift = async (id: string): Promise<void> => {
  await apiClient.delete(`/digital-work-arrangements/shifts/${id}`);
};

export const getCustomRows = async (arrangementId: string): Promise<DigitalShiftCustomRow[]> => {
  const response = await apiClient.get(`/digital-work-arrangements/${arrangementId}/custom-rows`);
  return response.data;
};

export const createCustomRow = async (arrangementId: string, data: Partial<DigitalShiftCustomRow>): Promise<DigitalShiftCustomRow> => {
  const response = await apiClient.post(`/digital-work-arrangements/${arrangementId}/custom-rows`, data);
  return response.data;
};

export const updateCustomRow = async (id: string, data: Partial<DigitalShiftCustomRow>): Promise<DigitalShiftCustomRow> => {
  const response = await apiClient.put(`/digital-work-arrangements/custom-rows/${id}`, data);
  return response.data;
};

export const deleteCustomRow = async (id: string): Promise<void> => {
  await apiClient.delete(`/digital-work-arrangements/custom-rows/${id}`);
}; 