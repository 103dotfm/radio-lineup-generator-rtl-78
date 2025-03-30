
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScheduleSlots, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot } from '@/lib/supabase/schedule';
import { useToast } from '@/hooks/use-toast';
import { ScheduleSlot } from '@/types/schedule';
import { format } from 'date-fns';

export const useScheduleSlots = (selectedDate: Date, isMasterSchedule: boolean = false) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Create a stable query key
  const queryKey = ['scheduleSlots', selectedDate.toISOString().split('T')[0], isMasterSchedule];

  const {
    data: scheduleSlots = [],
    isLoading,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => {
      console.log('Fetching slots with params:', {
        selectedDate,
        isMasterSchedule
      });
      return getScheduleSlots(selectedDate, isMasterSchedule);
    },
    staleTime: 30000 // Consider data fresh for 30 seconds (reduced from 60s)
  });

  const createSlotMutation = useMutation({
    mutationFn: (slotData: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>) => {
      // Ensure we have a date string
      if (!slotData.date && selectedDate) {
        slotData.date = format(selectedDate, 'yyyy-MM-dd');
      }
      return createScheduleSlot(slotData, isMasterSchedule, selectedDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey
      });
      toast({
        title: 'משבצת שידור נוספה בהצלחה'
      });
    },
    onError: error => {
      console.error('Error creating slot:', error);
      toast({
        title: 'שגיאה בהוספת משבצת שידור',
        variant: 'destructive'
      });
    }
  });

  const updateSlotMutation = useMutation({
    mutationFn: ({
      id,
      updates
    }: {
      id: string;
      updates: Partial<ScheduleSlot>;
    }) => {
      console.log("Mutation updating slot:", {
        id,
        updates
      });
      return updateScheduleSlot(id, updates, isMasterSchedule, selectedDate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey
      });
      toast({
        title: 'משבצת שידור עודכנה בהצלחה'
      });
    },
    onError: error => {
      console.error('Error updating slot:', error);
      toast({
        title: 'שגיאה בעדכון משבצת שידור',
        variant: 'destructive'
      });
    }
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id: string) => deleteScheduleSlot(id, isMasterSchedule, selectedDate),
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousSlots = queryClient.getQueryData<ScheduleSlot[]>(queryKey) || [];
      
      // Optimistically update the UI by removing the deleted slot
      queryClient.setQueryData(queryKey, (oldData: ScheduleSlot[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(slot => slot.id !== deletedId);
      });
      
      // Return the previous value for potential rollback
      return { previousSlots };
    },
    onSuccess: (_, deletedId) => {
      // No need to update cache again since we did it optimistically
      toast({
        title: 'משבצת שידור נמחקה בהצלחה'
      });
    },
    onError: (error, deletedId, context) => {
      console.error('Error deleting slot:', error);
      // Roll back to the previous state if there's an error
      if (context?.previousSlots) {
        queryClient.setQueryData(queryKey, context.previousSlots);
      }
      
      toast({
        title: 'שגיאה במחיקת משבצת שידור',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      // Always invalidate the query to get fresh data after the mutation settles
      queryClient.invalidateQueries({ queryKey });
    }
  });

  // Function to explicitly refetch the schedule slots
  const refetchSlots = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error refetching slots:', error);
    }
  };

  return {
    scheduleSlots,
    isLoading,
    createSlot: createSlotMutation.mutateAsync,
    updateSlot: updateSlotMutation.mutateAsync,
    deleteSlot: deleteSlotMutation.mutateAsync,
    refetchSlots
  };
};
