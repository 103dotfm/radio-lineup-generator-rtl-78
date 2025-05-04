
import { useState, useEffect } from 'react';
import { getScheduleSlots, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot } from '@/lib/supabase/schedule';
import { ScheduleSlot } from '@/types/schedule';
import { format } from 'date-fns';

interface UpdateSlotParams {
  id: string;
  updates: Partial<ScheduleSlot>;
}

export const useScheduleSlots = (selectedDate?: Date, isMasterSchedule: boolean = false) => {
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Add a key to track when to refresh data
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Create a formatted date string for dependency tracking
  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  // Fetch schedule slots when the component mounts or the date changes
  useEffect(() => {
    const fetchScheduleSlots = async () => {
      console.log('Fetching schedule slots...', { selectedDate, dateString, isMasterSchedule });
      setIsLoading(true);
      try {
        const slots = await getScheduleSlots(selectedDate, isMasterSchedule);
        setScheduleSlots(slots);
      } catch (error) {
        console.error('Error fetching schedule slots:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduleSlots();
  }, [dateString, isMasterSchedule, refreshKey]);

  // Create a new slot
  const createSlot = async (slotData: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newSlot = await createScheduleSlot(slotData, isMasterSchedule, selectedDate);
      setScheduleSlots((prev) => [...prev, newSlot]);
      return newSlot;
    } catch (error) {
      console.error('Error creating schedule slot:', error);
      throw error;
    }
  };

  // Update an existing slot
  const updateSlot = async ({ id, updates }: UpdateSlotParams) => {
    try {
      const updatedSlot = await updateScheduleSlot(id, updates, isMasterSchedule, selectedDate);
      
      // Force a full data refresh instead of trying to update the local state
      setRefreshKey(prev => prev + 1);
      
      return updatedSlot;
    } catch (error) {
      console.error('Error updating schedule slot:', error);
      throw error;
    }
  };

  // Delete a slot
  const deleteSlot = async (id: string) => {
    try {
      await deleteScheduleSlot(id, isMasterSchedule, selectedDate);
      // Force a full data refresh instead of trying to update the local state
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting schedule slot:', error);
      throw error;
    }
  };

  return {
    scheduleSlots,
    isLoading,
    createSlot,
    updateSlot,
    deleteSlot,
    refreshData: () => setRefreshKey(prev => prev + 1)
  };
};
