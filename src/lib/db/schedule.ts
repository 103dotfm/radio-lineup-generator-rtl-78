import { ScheduleSlot } from "@/types/schedule";
import { addDays, startOfWeek, format } from 'date-fns';
import { query } from '../db';

export const getScheduleSlots = async (selectedDate?: Date, isMasterSchedule: boolean = false): Promise<ScheduleSlot[]> => {
  console.log('Fetching schedule slots...', { selectedDate, isMasterSchedule });
  
  if (isMasterSchedule) {
    // Fetch only master slots
    console.log('Fetching master schedule slots');
    const result = await query(
      `SELECT * FROM schedule_slots 
       WHERE is_master = true 
       AND is_deleted = false 
       ORDER BY day_of_week ASC, start_time ASC`
    );

    if (result.error) {
      console.error('Error fetching master schedule:', result.error);
      throw result.error;
    }

    console.log('Retrieved master schedule slots:', result.data);
    return result.data || [];
  }

  // For weekly schedule, fetch slots for the selected week
  if (!selectedDate) {
    console.error('selectedDate is required for weekly schedule');
    throw new Error('selectedDate is required for weekly schedule');
  }

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  
  console.log('Fetching weekly schedule slots for date range:', {
    weekStart: format(weekStart, 'yyyy-MM-dd'),
    weekEnd: format(weekEnd, 'yyyy-MM-dd')
  });
  
  const result = await query(
    `SELECT * FROM schedule_slots 
     WHERE slot_date >= $1 
     AND slot_date <= $2 
     AND is_deleted = false 
     ORDER BY slot_date ASC, start_time ASC`,
    [format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')]
  );

  if (result.error) {
    console.error('Error fetching weekly schedule:', result.error);
    throw result.error;
  }

  console.log('Retrieved weekly schedule slots:', result.data);
  return result.data || [];
};

export const createScheduleSlot = async (
  slot: Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at'>,
  isMasterSchedule: boolean = false,
  selectedDate?: Date
): Promise<ScheduleSlot> => {
  console.log('Creating schedule slot:', { slot, isMasterSchedule, selectedDate });

  if (!isMasterSchedule && !selectedDate) {
    throw new Error('selectedDate is required for non-master slots');
  }

  // For master schedule, use current week's start date
  const slotDate = isMasterSchedule
    ? format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
    : format(selectedDate!, 'yyyy-MM-dd');

  const slotData = {
    ...slot,
    slot_date: slotDate,
    is_master: isMasterSchedule,
    is_deleted: false
  };

  console.log('Inserting slot with data:', slotData);

  const result = await query(
    `INSERT INTO schedule_slots 
     (slot_date, day_of_week, start_time, end_time, show_name, 
      host_name, is_master, is_deleted, parent_slot_id) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [
      slotData.slot_date,
      slotData.day_of_week,
      slotData.start_time,
      slotData.end_time,
      slotData.show_name,
      slotData.host_name,
      slotData.is_master,
      slotData.is_deleted,
      slotData.parent_slot_id
    ]
  );

  if (result.error) {
    console.error('Error creating slot:', result.error);
    throw result.error;
  }

  console.log('Successfully created slot:', result.data[0]);
  return result.data[0];
};

export const updateScheduleSlot = async (
  id: string,
  updates: Partial<ScheduleSlot>,
  isMasterSchedule: boolean = false,
  selectedDate?: Date
): Promise<ScheduleSlot> => {
  console.log('Updating schedule slot:', { id, updates, isMasterSchedule, selectedDate });

  // Get the original slot
  const originalResult = await query(
    'SELECT * FROM schedule_slots WHERE id = $1',
    [id]
  );

  if (originalResult.error || !originalResult.data[0]) {
    console.error('Error fetching original slot:', originalResult.error);
    throw new Error('Slot not found');
  }

  const originalSlot = originalResult.data[0];
  console.log('Found original slot:', originalSlot);

  if (isMasterSchedule) {
    // Update master slot and all its future instances
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Update master slot
    const masterResult = await query(
      `UPDATE schedule_slots 
       SET day_of_week = $1, start_time = $2, end_time = $3, 
           show_name = $4, host_name = $5, updated_at = $6 
       WHERE id = $7 
       RETURNING *`,
      [
        updateData.day_of_week,
        updateData.start_time,
        updateData.end_time,
        updateData.show_name,
        updateData.host_name,
        updateData.updated_at,
        id
      ]
    );

    if (masterResult.error) {
      console.error('Error updating master slot:', masterResult.error);
      throw masterResult.error;
    }

    // Update all future instances
    const instancesResult = await query(
      `UPDATE schedule_slots 
       SET day_of_week = $1, start_time = $2, end_time = $3, 
           show_name = $4, host_name = $5, updated_at = $6 
       WHERE parent_slot_id = $7 
       AND slot_date >= CURRENT_DATE`,
      [
        updateData.day_of_week,
        updateData.start_time,
        updateData.end_time,
        updateData.show_name,
        updateData.host_name,
        updateData.updated_at,
        id
      ]
    );

    if (instancesResult.error) {
      console.error('Error updating slot instances:', instancesResult.error);
      throw instancesResult.error;
    }

    return masterResult.data[0];
  } else {
    // Update single instance
    const result = await query(
      `UPDATE schedule_slots 
       SET day_of_week = $1, start_time = $2, end_time = $3, 
           show_name = $4, host_name = $5, updated_at = $6 
       WHERE id = $7 
       RETURNING *`,
      [
        updates.day_of_week,
        updates.start_time,
        updates.end_time,
        updates.show_name,
        updates.host_name,
        new Date().toISOString(),
        id
      ]
    );

    if (result.error) {
      console.error('Error updating slot:', result.error);
      throw result.error;
    }

    return result.data[0];
  }
};

export const deleteScheduleSlot = async (
  id: string,
  isMasterSchedule: boolean = false,
  selectedDate?: Date
): Promise<void> => {
  console.log('Deleting schedule slot:', { id, isMasterSchedule, selectedDate });

  if (isMasterSchedule) {
    // Soft delete master slot and all its future instances
    const masterResult = await query(
      `UPDATE schedule_slots 
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    if (masterResult.error) {
      console.error('Error deleting master slot:', masterResult.error);
      throw masterResult.error;
    }

    const instancesResult = await query(
      `UPDATE schedule_slots 
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP 
       WHERE parent_slot_id = $1 
       AND slot_date >= CURRENT_DATE`,
      [id]
    );

    if (instancesResult.error) {
      console.error('Error deleting slot instances:', instancesResult.error);
      throw instancesResult.error;
    }
  } else {
    // Soft delete single instance
    const result = await query(
      `UPDATE schedule_slots 
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    if (result.error) {
      console.error('Error deleting slot:', result.error);
      throw result.error;
    }
  }
};

export const addMissingColumns = async () => {
  const { error } = await query('CALL add_schedule_slots_columns()');
  if (error) {
    console.error('Error adding missing columns:', error);
    throw error;
  }
};

export const createRecurringSlotsFromMaster = async (
  slotId: string,
  dateRange: { startDate: string; endDate: string }
): Promise<{ success: boolean; error?: any }> => {
  try {
    // First get the master slot to be used as a template
    const result = await query(
      'SELECT * FROM schedule_slots WHERE id = $1',
      [slotId]
    );

    if (!result.data[0]) {
      console.error('Error fetching master slot: Slot not found');
      return { success: false, error: 'Slot not found' };
    }

    const masterSlot = result.data[0];

    // Generate dates for the recurring slots
    const dateList = generateDateList(
      dateRange.startDate,
      dateRange.endDate,
      masterSlot.day_of_week
    );

    // Create the slot for each date
    for (const date of dateList) {
      const result = await query(
        `INSERT INTO schedule_slots 
         (show_name, host_name, start_time, end_time, day_of_week, color, 
          is_prerecorded, is_collection, slot_date, parent_slot_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         RETURNING *`,
        [
          masterSlot.show_name,
          masterSlot.host_name,
          masterSlot.start_time,
          masterSlot.end_time,
          masterSlot.day_of_week,
          masterSlot.color,
          masterSlot.is_prerecorded,
          masterSlot.is_collection,
          date,
          slotId
        ]
      );

      if (!result.data[0]) {
        console.error(`Error creating slot for date ${date}: Slot not created`);
        return { success: false, error: 'Slot not created' };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createRecurringSlotsFromMaster:', error);
    return { success: false, error };
  }
};

// Helper function to generate dates
const generateDateList = (
  startDate: string,
  endDate: string,
  dayOfWeek: number
): string[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];

  let current = new Date(start);
  while (current <= end) {
    if (current.getDay() === dayOfWeek) {
      dates.push(format(current, 'yyyy-MM-dd'));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
};
