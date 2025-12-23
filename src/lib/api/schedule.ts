import { ScheduleSlot } from '@/types/schedule';
import { getDay } from 'date-fns';

// Define query parameters for schedule slots
export interface ScheduleQueryParams {
  selectedDate?: Date;
  isMasterSchedule?: boolean;
}

// Base URL for API requests
const API_BASE_URL = '/api';

// Helper function to make API requests
async function apiRequest(endpoint: string, method: string = 'GET', body?: any) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  
  // Try to parse the response data
  let responseData;
  try {
    responseData = await response.json();
  } catch (e) {
    // If response is not JSON, create a simple error object
    responseData = { error: `API request failed with status ${response.status}` };
  }
  
  if (!response.ok) {
    // Create an error object that includes the response data
    const error = new Error(`API request failed with status ${response.status}`);
    (error as any).response = { status: response.status, data: responseData };
    throw error;
  }
  
  return responseData;
}

export async function getScheduleSlots(params: ScheduleQueryParams = {}): Promise<ScheduleSlot[]> {
  console.log('Fetching schedule slots with params:', params);
  try {
    const queryParams = new URLSearchParams();
    if (params.selectedDate) {
      queryParams.append('selectedDate', params.selectedDate.toISOString());
    } else {
      // Default to current date if not provided
      queryParams.append('selectedDate', new Date().toISOString());
    }
    if (params.isMasterSchedule !== undefined) {
      queryParams.append('isMasterSchedule', params.isMasterSchedule.toString());
    } else {
      queryParams.append('isMasterSchedule', 'false');
    }
    const url = `/schedule/slots?${queryParams.toString()}`;
    console.log('Making API request to:', url);
    const data = await apiRequest(url);

    return data;
  } catch (error) {
    console.error('Error fetching schedule slots:', error);
    return [];
  }
}

export const createScheduleSlot = async (
  slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>,
  isMasterSchedule: boolean = false,
  selectedDate?: Date
): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot with data:', {
    slot,
    isMasterSchedule,
    selectedDate
  });

  try {
    const data = await apiRequest('/schedule/slots', 'POST', {
      ...slot,
      isMasterSchedule,
      selectedDate: selectedDate?.toISOString()
    });
    console.log('Slot creation response:', data);
    return data;
  } catch (error) {
    console.error('Error creating schedule slot:', error);
    throw error;
  }
};

export const updateScheduleSlot = async (
  id: string,
  updates: Partial<ScheduleSlot>,
  isMasterSchedule: boolean = false,
  selectedDate?: Date
): Promise<ScheduleSlot> => {
  try {
    const data = await apiRequest(`/schedule/slots/${id}`, 'PUT', {
      ...updates,
      isMasterSchedule,
      selectedDate: selectedDate?.toISOString()
    });
    return data;
  } catch (error) {
    console.error('Error updating schedule slot:', error);
    throw error;
  }
};

export const deleteScheduleSlot = async (
  id: string,
  isMasterSchedule: boolean = false,
  selectedDate?: Date,
  slot?: any
): Promise<void> => {
  try {
    // For weekly slots, we need to calculate the slot_date and day_of_week
    let slot_date: string | undefined;
    let day_of_week: number | undefined;
    
    if (!isMasterSchedule) {
      if (slot && slot.slot_date) {
        // Use the slot's actual date if available
        const slotDate = new Date(slot.slot_date);
        const year = slotDate.getFullYear();
        const month = String(slotDate.getMonth() + 1).padStart(2, '0');
        const day = String(slotDate.getDate()).padStart(2, '0');
        slot_date = `${year}-${month}-${day}`;
        day_of_week = slot.day_of_week;
      } else if (selectedDate) {
        // Fallback to calculating from selectedDate
        const dayOfWeek = selectedDate.getDay();
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        slot_date = `${year}-${month}-${day}`;
        day_of_week = dayOfWeek;
      }
    }
    
    console.log('Deleting slot with data:', { 
      id, 
      isMasterSchedule, 
      selectedDate: selectedDate?.toISOString(),
      slot_date,
      day_of_week,
      slot_slot_date: slot?.slot_date
    });
    
    // Send the data in the request body for the new backend API
    await apiRequest(`/schedule/slots/${id}`, 'DELETE', {
      slot_date,
      day_of_week,
      isMasterSchedule,
      start_time: slot?.start_time,
      end_time: slot?.end_time,
      show_name: slot?.show_name,
      host_name: slot?.host_name
    });
  } catch (error) {
    console.error('Error deleting schedule slot:', error);
    throw error;
  }
};

export const createRecurringSlotsFromMaster = async (
  slotId: string,
  dateRange: { startDate: string; endDate: string }
): Promise<{ success: boolean; error?: any }> => {
  try {
    const data = await apiRequest(`/schedule/slots/${slotId}/recurring`, 'POST', dateRange);
    return data;
  } catch (error) {
    console.error('Error creating recurring slots:', error);
    return { success: false, error };
  }
};

export const checkSlotConflicts = async (
  slotDate: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeSlotId?: string,
  isMasterSchedule?: boolean
): Promise<{ hasConflict: boolean; conflictingSlot?: any }> => {
  console.log('Checking slot conflicts with data:', {
    slotDate,
    dayOfWeek,
    startTime,
    endTime,
    excludeSlotId,
    isMasterSchedule
  });
  try {
    const resp = await apiRequest('/schedule/slots/check-conflicts', 'POST', {
      slotDate,
      dayOfWeek,
      startTime,
      endTime,
      excludeSlotId,
      isMasterSchedule
    });
    
    // Add defensive checks to prevent TypeError
    if (!resp || typeof resp !== 'object') {
      console.warn('Invalid response format:', resp);
      return { hasConflict: false, conflictingSlot: undefined };
    }
    
    // Normalize server response shape with defensive checks
    const hasConflict = !!(resp.hasConflict || (Array.isArray(resp.conflictingSlots) && resp.conflictingSlots.length > 0));
    const conflictingSlot = resp.conflictingSlot ?? (Array.isArray(resp.conflictingSlots) ? resp.conflictingSlots[0] : undefined);
    
    return { hasConflict, conflictingSlot };
  } catch (error) {
    console.error('Error checking slot conflicts:', error);
    throw error;
  }
};

export interface ScheduleAutocompleteData {
  showNames: string[];
  hostNames: string[];
}

export const getScheduleAutocomplete = async (): Promise<ScheduleAutocompleteData> => {
  try {
    const data = await apiRequest('/schedule/autocomplete');
    return {
      showNames: data.showNames || [],
      hostNames: data.hostNames || []
    };
  } catch (error) {
    console.error('Error fetching schedule autocomplete:', error);
    // Return empty arrays on error to prevent breaking the form
    return {
      showNames: [],
      hostNames: []
    };
  }
}; 