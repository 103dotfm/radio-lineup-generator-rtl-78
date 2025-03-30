
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
    staleTime: 60000 // Consider data fresh for 1 minute
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
    onSuccess: (_, deletedId) => {
      // Optimistic UI update - remove the deleted slot from the cache immediately
      queryClient.setQueryData(queryKey, (oldData: ScheduleSlot[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(slot => {
          // For master schedule slots, filter by ID directly
          if (isMasterSchedule) {
            return slot.id !== deletedId;
          }
          
          // For regular slots, we need to check both the slot ID and any shows with the slot_id
          if (slot.id === deletedId) return false;
          
          // For slots with shows, check if any show has this ID
          if (slot.shows && slot.shows.some(show => show.id === deletedId)) {
            return false;
          }
          
          return true;
        });
      });
      
      // Also invalidate the query to fetch fresh data
      queryClient.invalidateQueries({
        queryKey
      });
      
      toast({
        title: 'משבצת שידור נמחקה בהצלחה'
      });
    },
    onError: error => {
      console.error('Error deleting slot:', error);
      toast({
        title: 'שגיאה במחיקת משבצת שידור',
        variant: 'destructive'
      });
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
