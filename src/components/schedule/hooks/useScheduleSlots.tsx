
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
        if (!slot || !slot.id) {
          console.error('Invalid slot found without ID:', slot);
          return slot; // Return the slot as is if it's invalid
        }
        
        try {
          // Check if this slot has any associated shows
          console.log('Checking for shows with slot_id:', slot.id);
          const { data: shows, error } = await supabase
            .from('shows_backup')
            .select('id, name')
            .eq('slot_id', slot.id)
            .not('id', 'is', null)  // Fixed: Use not('id', 'is', null) instead of is('id', 'not.null')
            .order('created_at', { ascending: false });
            
          if (error) {
            console.error(`Error fetching show for slot ${slot.id}:`, error);
            return slot; // Return the slot as is if there's an error
          }
          
          const validShows = (shows || []).filter(show => show && show.id);
          
          if (validShows && validShows.length > 0) {
            console.log(`Found ${validShows.length} shows for slot ${slot.id}:`, validShows);
            // If shows exist, update the slot's has_lineup flag to true
            if (!slot.has_lineup) {
              console.log(`Slot ${slot.id} has shows but has_lineup=false, updating it`);
              const { error: updateError } = await supabase
                .from('schedule_slots_old')
                .update({ has_lineup: true })
                .eq('id', slot.id);
                
              if (updateError) {
                console.error(`Error updating has_lineup for slot ${slot.id}:`, updateError);
              } else {
                slot.has_lineup = true; // Update the local slot object too
              }
            }
            
            return {
              ...slot,
              shows: validShows,
              has_lineup: true // Ensure the flag is set in the returned data
            };
          } else if (slot.has_lineup) {
            // If no shows but has_lineup is true, this is inconsistent - fix it
            console.log(`Slot ${slot.id} has has_lineup=true but no shows found, fixing it`);
            const { error: updateError } = await supabase
              .from('schedule_slots_old')
              .update({ has_lineup: false })
              .eq('id', slot.id);
              
            if (updateError) {
              console.error(`Error updating has_lineup for slot ${slot.id}:`, updateError);
            }
            
            return {
              ...slot,
              has_lineup: false, // Update the flag in the returned data
              shows: [] 
            };
          }
        } catch (e) {
          console.error(`Error processing slot ${slot.id}:`, e);
        }
        
        return slot;
      }));
      
      console.log('Processed slots with show info:', slotsWithShowInfo.length);
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
