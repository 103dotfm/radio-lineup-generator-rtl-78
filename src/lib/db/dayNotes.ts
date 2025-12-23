import { apiClient } from '../api-client';
import { DayNote } from '@/types/schedule';
import { format } from 'date-fns';

export const getDayNotes = async (startDate: Date, endDate: Date, isBottomNote: boolean = false): Promise<DayNote[]> => {
  try {
    const response = await apiClient.get('/day-notes', {
      params: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        isBottomNote
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching day notes:', error);
    return [];
  }
};

export const createDayNote = async (date: Date, note: string, isBottomNote: boolean = false): Promise<DayNote | null> => {
  try {
    const response = await apiClient.post('/day-notes', {
      date: format(date, 'yyyy-MM-dd'),
      note,
      isBottomNote
    });
    return response.data;
  } catch (error) {
    console.error('Error creating day note:', error);
    return null;
  }
};

export const updateDayNote = async (id: string, note: string): Promise<DayNote | null> => {
  try {
    const response = await apiClient.put(`/day-notes/${id}`, { note });
    return response.data;
  } catch (error) {
    console.error('Error updating day note:', error);
    return null;
  }
};

export const deleteDayNote = async (id: string): Promise<boolean> => {
  try {
    await apiClient.delete(`/day-notes/${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting day note:', error);
    return false;
  }
}; 