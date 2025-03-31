import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format, startOfWeek, addDays, parseISO, addWeeks, isAfter, isBefore } from 'date-fns';
import { ScheduleSlot } from '@/types/schedule';

export const useScheduleSlots = (selectedDate: Date, isMasterSchedule = false) => {
  const queryClient = useQueryClient();
  const queryKey = isMasterSchedule ? ['masterScheduleSlots'] : ['scheduleSlots', format(selectedDate, 'yyyy-MM-dd')];

  // Get schedule slots
  const { data: scheduleSlots = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async (): Promise<ScheduleSlot[]> => {
      try {
        const fetchStartTime = performance.now();
        console.log(`Fetching ${isMasterSchedule ? 'master' : 'weekly'} schedule slots...`);

        let query;

        if (isMasterSchedule) {
          // For master schedule, we don't need to join with shows
          query = supabase
            .from('schedule_slots_old')
            .select('*')
            .eq('is_recurring', true)
            .not('id', 'is', null);
        } else {
          const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
          const weekEnd = addDays(weekStart, 6);
          
          const formattedWeekStart = format(weekStart, 'yyyy-MM-dd');
          const formattedWeekEnd = format(weekEnd, 'yyyy-MM-dd');

          // First try to get non-recurring slots for this week's range
          const { data: weeklySlots, error: weeklyError } = await supabase
            .from('schedule_slots_backup')
            .select('*')
            .gte('date', formattedWeekStart)
            .lte('date', formattedWeekEnd)
            .not('id', 'is', null);

          if (weeklyError) {
            console.error('Error fetching weekly slots:', weeklyError);
          }

          // Then get the master slots (recurring)
          const { data: masterSlots, error: masterError } = await supabase
            .from('schedule_slots_old')
            .select('*')
            .eq('is_recurring', true)
            .not('id', 'is', null);

          if (masterError) {
            console.error('Error fetching master slots:', masterError);
          }

          // Map weekly slots to their days
          let dayToWeeklySlotsMap = new Map();
          if (weeklySlots) {
            weeklySlots.forEach((slot: any) => {
              if (slot.date) {
                const date = parseISO(slot.date);
                const dayOfWeek = date.getDay();
                if (!dayToWeeklySlotsMap.has(dayOfWeek)) {
                  dayToWeeklySlotsMap.set(dayOfWeek, []);
                }
                dayToWeeklySlotsMap.get(dayOfWeek).push(slot);
              }
            });
          }

          // Merge master and weekly slots, with weekly slots taking precedence
          const mergedSlots = [];

          if (masterSlots) {
            for (const masterSlot of masterSlots) {
              const dayOfWeek = masterSlot.day_of_week;
              const day = addDays(weekStart, dayOfWeek);
              
              // Check if we have a weekly slot for this day and time
              const weeklySlotForDay = dayToWeeklySlotsMap.get(dayOfWeek) || [];
              const matchingWeeklySlot = weeklySlotForDay.find((ws: any) => 
                ws.start_time === masterSlot.start_time && ws.end_time === masterSlot.end_time
              );

              if (matchingWeeklySlot) {
                // Use the weekly slot instead of the master slot
                matchingWeeklySlot.is_modified = true;
                mergedSlots.push({
                  ...matchingWeeklySlot,
                  day_of_week: dayOfWeek
                });
              } else {
                // Use the master slot
                mergedSlots.push({
                  ...masterSlot
                });
              }
            }
          }

          // Add any weekly slots that don't overlap with master slots
          if (weeklySlots) {
            for (const weeklySlot of weeklySlots) {
              if (!weeklySlot.date) continue;
              
              const date = parseISO(weeklySlot.date);
              const dayOfWeek = date.getDay();
              
              // Check if this slot exists in our mergedSlots
              const alreadyExists = mergedSlots.some((ms: any) => 
                ms.day_of_week === dayOfWeek && ms.start_time === weeklySlot.start_time && ms.end_time === weeklySlot.end_time
              );
              
              if (!alreadyExists) {
                weeklySlot.is_modified = true;
                mergedSlots.push({
                  ...weeklySlot,
                  day_of_week: dayOfWeek
                });
              }
            }
          }

          // Now fetch specific shows for each slot in this week
          for (const slot of mergedSlots) {
            const slotDay = addDays(weekStart, slot.day_of_week);
            const slotDate = format(slotDay, 'yyyy-MM-dd');
            
            // Fetch directly from shows_backup table instead of using the join
            const { data: shows, error: showsError } = await supabase
              .from('shows_backup')
              .select('*')
              .eq('date', slotDate)
              .eq('slot_id', slot.id);
              
            if (!showsError && shows && shows.length > 0) {
              console.log(`Found ${shows.length} shows for slot ${slot.id} on ${slotDate}:`, shows);
              slot.shows = shows;
              slot.has_lineup = true;
            }
          }

          const fetchEndTime = performance.now();
          console.log(`Fetch completed in ${fetchEndTime - fetchStartTime}ms`);
          
          return mergedSlots;
        }

        // For master schedule, just execute the query
        const { data, error: queryError } = await query;
        
        if (queryError) {
          console.error('Error fetching schedule slots:', queryError);
          throw queryError;
        }

        // For master schedule, we need to fetch shows separately
        if (isMasterSchedule && data) {
          // We need to fetch shows for all slots
          for (const slot of data) {
            const { data: shows, error: showsError } = await supabase
              .from('shows_backup')
              .select('*')
              .eq('slot_id', slot.id);
              
            if (!showsError && shows && shows.length > 0) {
              console.log(`Found ${shows.length} shows for master slot ${slot.id}:`, shows);
              slot.shows = shows;
              slot.has_lineup = true;
            } else {
              slot.shows = [];
            }
          }
        }

        const fetchEndTime = performance.now();
        console.log(`Fetch completed in ${fetchEndTime - fetchStartTime}ms`);
        console.log(`Retrieved ${data ? data.length : 0} schedule slots`);

        return data || [];
      } catch (error) {
        console.error('Error in useScheduleSlots:', error);
        throw error;
      }
    }
  });

  // Create a new slot
  const createSlot = async (slotData: Omit<ScheduleSlot, 'id'>) => {
    try {
      const tableName = isMasterSchedule ? 'schedule_slots_old' : 'schedule_slots_backup';
      
      let insertData: any = { ...slotData };
      
      if (isMasterSchedule) {
        insertData.is_recurring = true;
      } else {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const slotDay = addDays(weekStart, slotData.day_of_week);
        insertData.date = format(slotDay, 'yyyy-MM-dd');
      }

      const { data, error } = await supabase
        .from(tableName)
        .insert(insertData)
        .select();

      if (error) {
        console.error(`Error creating ${isMasterSchedule ? 'master' : 'weekly'} slot:`, error);
        throw error;
      }

      await queryClient.invalidateQueries({
        queryKey
      });

      return data;
    } catch (error) {
      console.error(`Error in createSlot:`, error);
      throw error;
    }
  };

  // Update a slot
  const updateSlot = async ({
    id,
    updates
  }: {
    id: string;
    updates: Partial<ScheduleSlot>;
  }) => {
    try {
      const tableName = isMasterSchedule ? 'schedule_slots_old' : 'schedule_slots_backup';
      
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select();

      if (error) {
        console.error(`Error updating ${isMasterSchedule ? 'master' : 'weekly'} slot:`, error);
        throw error;
      }

      await queryClient.invalidateQueries({
        queryKey
      });

      return data;
    } catch (error) {
      console.error(`Error in updateSlot:`, error);
      throw error;
    }
  };

  // Delete a slot
  const deleteSlot = async (id: string) => {
    try {
      const tableName = isMasterSchedule ? 'schedule_slots_old' : 'schedule_slots_backup';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`Error deleting ${isMasterSchedule ? 'master' : 'weekly'} slot:`, error);
        throw error;
      }

      await queryClient.invalidateQueries({
        queryKey
      });

      return true;
    } catch (error) {
      console.error(`Error in deleteSlot:`, error);
      throw error;
    }
  };

  return {
    scheduleSlots,
    isLoading,
    error,
    createSlot,
    updateSlot,
    deleteSlot,
  };
};
