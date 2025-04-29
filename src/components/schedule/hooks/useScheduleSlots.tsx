
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScheduleSlots, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot } from '@/lib/supabase/schedule';
import { useToast } from '@/hooks/use-toast';
import { ScheduleSlot } from '@/types/schedule';
import { format } from 'date-fns';

export const useScheduleSlots = (selectedDate: Date, isMasterSchedule: boolean = false) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Validate selectedDate
  const isValidDate = selectedDate instanceof Date && !isNaN(selectedDate.getTime());
  if (!isValidDate) {
    console.warn('Invalid selectedDate in useScheduleSlots:', selectedDate);
  }

  // Use a query key that depends on the date value rather than the date object
  const dateKey = isValidDate ? format(selectedDate, 'yyyy-MM-dd') : 'invalid-date';

  const {
    data: scheduleSlots = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['scheduleSlots', dateKey, isMasterSchedule],
    queryFn: () => {
      console.log('Fetching slots with params:', {
        selectedDate,
        isMasterSchedule,
        dateKey
      });
      
      if (!isValidDate) {
        console.error('Cannot fetch schedule slots: Invalid date', selectedDate);
        return Promise.resolve([]);
      }
      
      return getScheduleSlots(selectedDate, isMasterSchedule)
        .catch(err => {
          console.error('Error fetching schedule slots:', err);
          toast({
            title: 'שגיאה בטעינת משבצות שידור',
            description: 'אנא נסה שוב מאוחר יותר',
            variant: 'destructive'
          });
          return [];
        });
    },
    staleTime: 60000, // Cache for 1 minute
    retry: 2,
    meta: {
      onSuccess: (data: ScheduleSlot[]) => {
        console.log('Successfully fetched slots:', data.length);
      },
      onError: (error: Error) => {
        console.error('Error fetching slots:', error);
      }
    }
  });

  const createSlotMutation = useMutation({
    mutationFn: (slotData: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>) => 
      createScheduleSlot(slotData, isMasterSchedule, selectedDate),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
      });
      
      if (isValidDate) {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        queryClient.invalidateQueries({
          queryKey: ['shows', dateString]
        });
      }
      
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
        queryKey: ['scheduleSlots']
      });
      
      if (isValidDate) {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        queryClient.invalidateQueries({
          queryKey: ['shows', dateString]
        });
      }
      
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
      });
      
      if (isValidDate) {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        queryClient.invalidateQueries({
          queryKey: ['shows', dateString]
        });
      }
      
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

  return {
    scheduleSlots,
    isLoading,
    error,
    refetch,
    createSlot: createSlotMutation.mutateAsync,
    updateSlot: updateSlotMutation.mutateAsync,
    deleteSlot: deleteSlotMutation.mutateAsync
  };
};
