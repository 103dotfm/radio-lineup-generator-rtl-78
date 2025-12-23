import { useState, useEffect, useCallback } from 'react';
import { ScheduleSlot } from '@/types/schedule';
import { getScheduleSlots, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot } from '@/lib/api/schedule';
import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

export const useScheduleSlots = (selectedDate?: Date, isMasterSchedule: boolean = false) => {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const queryClient = useQueryClient();

  // Fetch slots
  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getScheduleSlots({ selectedDate, isMasterSchedule });
      
      // The backend already returns the correct slots for the specific week
      // No need for additional frontend filtering
      setSlots(data || []);
      
      setError(null);
      return data;
    } catch (err) {
      console.error('Error fetching slots:', err);
      setError('Failed to fetch schedule slots');
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isMasterSchedule, refreshCount]);

  // Create a new slot
  const createSlot = useCallback(async (
    slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>,
    callbacks?: { onSuccess?: (data: any) => void; onError?: (error: any) => void }
  ) => {
    try {

      
      const newSlot = await createScheduleSlot(slot, isMasterSchedule, selectedDate);

      
      // Force invalidate all schedule-related queries to ensure fresh data
      await queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
      });
      

      
      // If this is a master slot, we need to fetch all slots again
      // because the instances will be created automatically
      const refreshedSlots = await fetchSlots();
      
      if (callbacks?.onSuccess) {
        callbacks.onSuccess(newSlot);
      }
      
      return newSlot;
    } catch (err) {
      console.error('Error creating slot:', err);
      if (callbacks?.onError) {
        callbacks.onError(err);
      }
      throw err;
    }
  }, [isMasterSchedule, selectedDate, fetchSlots, queryClient]);

  // Update a slot
  const updateSlot = useCallback(async (
    id: string, 
    updates: Partial<ScheduleSlot>,
    callbacks?: { onSuccess?: (data: any) => void; onError?: (error: any) => void }
  ) => {
    try {
      const updatedSlot = await updateScheduleSlot(id, updates, isMasterSchedule, selectedDate);
      
      // Force invalidate all schedule-related queries
      await queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
      });
      
      // Always fetch fresh data after updates
      const refreshedSlots = await fetchSlots();
      
      if (callbacks?.onSuccess) {
        callbacks.onSuccess(updatedSlot);
      }
      
      return updatedSlot;
    } catch (err) {
      console.error('Error updating slot:', err);
      if (callbacks?.onError) {
        callbacks.onError(err);
      }
      throw err;
    }
  }, [isMasterSchedule, selectedDate, fetchSlots, queryClient]);

  // Delete a slot
  const deleteSlot = useCallback(async (
    id: string,
    slot?: any,
    callbacks?: { onSuccess?: () => void; onError?: (error: any) => void }
  ) => {
    try {
      // If slot object is not provided, try to find it in the current slots
      let slotToDelete = slot;
      if (!slotToDelete) {
        slotToDelete = slots.find(s => s.id === id);
      }
      
      await deleteScheduleSlot(id, isMasterSchedule, selectedDate, slotToDelete);
      
      // Force invalidate all schedule-related queries
      await queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
      });
      
      // Always fetch fresh data after deletion
      await fetchSlots();
      
      if (callbacks?.onSuccess) {
        callbacks.onSuccess();
      }
    } catch (err) {
      console.error('Error deleting slot:', err);
      if (callbacks?.onError) {
        callbacks.onError(err);
      }
      throw err;
    }
  }, [isMasterSchedule, selectedDate, fetchSlots, queryClient, slots]);

  // Force refresh of slots
  const refreshSlots = useCallback(async () => {
    setRefreshCount(count => count + 1);
    return await fetchSlots();
  }, [fetchSlots]);

  // Fetch slots when selectedDate, isMasterSchedule, or refreshCount changes
  useEffect(() => {
    if (selectedDate) {
  
      fetchSlots();
    }
  }, [selectedDate, isMasterSchedule, refreshCount, fetchSlots]);

  return {
    slots,
    loading,
    error,
    createSlot,
    updateSlot,
    deleteSlot,
    refreshSlots
  };
};
