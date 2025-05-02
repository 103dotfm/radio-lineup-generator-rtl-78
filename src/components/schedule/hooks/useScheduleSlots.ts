
import { useState, useEffect } from 'react';
import { getScheduleSlots, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot } from '@/lib/supabase/schedule';
import { ScheduleSlot } from '@/types/schedule';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { startOfWeek, format } from 'date-fns';

export function useScheduleSlots(selectedDate: Date, isMasterSchedule: boolean = false) {
  const queryClient = useQueryClient();
  const weekStartDate = startOfWeek(selectedDate, { weekStartsOn: 0 });
  
  const {
    data: scheduleSlots = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['scheduleSlots', weekStartDate.toISOString(), isMasterSchedule],
    queryFn: async () => {
      try {
        console.log('Fetching schedule slots with params:', { selectedDate, isMasterSchedule });
        const slots = await getScheduleSlots(selectedDate, isMasterSchedule);
        return slots;
      } catch (err) {
        console.error('Error fetching schedule slots:', err);
        throw err;
      }
    },
  });

  const createSlotMutation = useMutation({
    mutationFn: (newSlot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>) => 
      createScheduleSlot(newSlot, isMasterSchedule, selectedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleSlots'] });
    },
  });

  const updateSlotMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ScheduleSlot> }) => 
      updateScheduleSlot(id, updates, isMasterSchedule, selectedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleSlots'] });
    },
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id: string) => 
      deleteScheduleSlot(id, isMasterSchedule, selectedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleSlots'] });
    },
  });

  return {
    scheduleSlots,
    isLoading,
    error,
    createSlot: createSlotMutation.mutateAsync,
    updateSlot: updateSlotMutation.mutateAsync,
    deleteSlot: deleteSlotMutation.mutateAsync,
  };
}
