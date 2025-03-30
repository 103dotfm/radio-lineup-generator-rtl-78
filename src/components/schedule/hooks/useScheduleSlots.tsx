
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getScheduleSlots, createScheduleSlot, updateScheduleSlot, deleteScheduleSlot } from '@/lib/supabase/schedule';
import { useToast } from '@/hooks/use-toast';
import { ScheduleSlot } from '@/types/schedule';
import { supabase } from '@/lib/supabase';

export const useScheduleSlots = (selectedDate: Date, isMasterSchedule: boolean = false) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: scheduleSlots = [],
    isLoading
  } = useQuery({
    queryKey: ['scheduleSlots', selectedDate, isMasterSchedule],
    queryFn: async () => {
      console.log('Fetching slots with params:', {
        selectedDate,
        isMasterSchedule
      });
      
      const slots = await getScheduleSlots(selectedDate, isMasterSchedule);
      
      // For each slot, check if there's an associated show in the shows_backup table
      const slotsWithShowInfo = await Promise.all(slots.map(async slot => {
        // Only check when has_lineup is true
        if (slot.has_lineup) {
          try {
            const { data: shows, error } = await supabase
              .from('shows_backup')
              .select('id, name')
              .eq('slot_id', slot.id)
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (error) {
              console.error(`Error fetching show for slot ${slot.id}:`, error);
              return slot; // Return the slot as is if there's an error
            }
            
            if (shows && shows.length > 0) {
              return {
                ...slot,
                shows: shows
              };
            }
          } catch (e) {
            console.error(`Error processing slot ${slot.id}:`, e);
          }
        }
        
        return slot;
      }));
      
      return slotsWithShowInfo;
    },
    meta: {
      onSuccess: (data: ScheduleSlot[]) => {
        console.log('Successfully fetched slots:', data.length);
        // Add additional logging to help debug show connections
        data.forEach(slot => {
          if (slot.has_lineup) {
            console.log(`Slot ${slot.id} (${slot.show_name}) has lineup:`, 
              slot.shows ? `Found ${slot.shows.length} shows` : 'No shows found');
          }
        });
      },
      onError: (error: Error) => {
        console.error('Error fetching slots:', error);
      }
    }
  });

  const createSlotMutation = useMutation({
    mutationFn: (slotData: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>) => 
      createScheduleSlot(slotData, isMasterSchedule, selectedDate),
    onSuccess: (newSlot) => {
      console.log('Successfully created slot:', newSlot);
      queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
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
    onSuccess: (updatedSlot) => {
      console.log('Successfully updated slot:', updatedSlot);
      queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['scheduleSlots']
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

  return {
    scheduleSlots,
    isLoading,
    createSlot: createSlotMutation.mutateAsync,
    updateSlot: updateSlotMutation.mutateAsync,
    deleteSlot: deleteSlotMutation.mutateAsync
  };
};
