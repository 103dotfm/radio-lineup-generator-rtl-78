import { supabase } from "@/lib/supabase";
import { format, startOfWeek, isBefore, addDays, parseISO, isEqual } from 'date-fns';
import type { Database } from '../types/producer.types';

type Tables = Database['public']['Tables'];
type ProducerAssignment = Tables['producer_assignments']['Row'];
type ProducerAssignmentSkip = Tables['producer_assignment_skips']['Row'];

// Helper function to normalize dates for comparison
const normalizeDate = (date: Date | string): Date => {
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return startOfWeek(parsed, { weekStartsOn: 0 });
};

// Helper function to check if two dates are the same week
const isSameWeek = (date1: Date, date2: Date): boolean => {
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  return normalized1.getTime() === normalized2.getTime();
};

// Helper function to check if a date falls on or after another date
const isOnOrAfter = (date: Date, compareToDate: Date): boolean => {
  return !isBefore(date, compareToDate);
};

export const getProducerAssignments = async (weekStart: Date) => {
  try {
    console.log('getProducerAssignments input date:', weekStart);
    const normalizedWeekStart = normalizeDate(weekStart);
    console.log('Normalized input date:', normalizedWeekStart);
    const formattedDate = format(normalizedWeekStart, 'yyyy-MM-dd');
    console.log('Formatted normalized date:', formattedDate);

    // Debug: Check RLS policies by getting raw count
    const { count, error: countError } = await supabase
      .from('producer_assignments')
      .select('*', { count: 'exact', head: true });

    console.log('Total assignments in database (RLS check):', count);
    
    // Debug: Get all non-recurring assignments to check RLS
    const { data: allNonRecurring, error: nonRecurringError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('is_recurring', false)
      .is('is_deleted', null);
      
    console.log('All non-recurring assignments in database:', allNonRecurring);
    
    // Debug: Get table structure
    const { data: sampleRow, error: sampleError } = await supabase
      .from('producer_assignments')
      .select('*')
      .limit(1)
      .single();

    console.log('Sample row to check table structure:', sampleRow);
    console.log('Available columns:', sampleRow ? Object.keys(sampleRow) : 'No rows found');
    
    // Get all assignments with explicit conditions
    const { data: allAssignments, error: allError } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id (
          id,
          name,
          position,
          email,
          phone
        ),
        slot:slot_id (
          id,
          show_name,
          host_name,
          start_time,
          end_time,
          day_of_week,
          is_prerecorded,
          is_collection
        )
      `)
      .or('is_deleted.is.null,is_deleted.eq.false');  // Accept both null and false as "not deleted"

    if (allError) {
      console.error('Error fetching all assignments:', allError);
      throw allError;
    }

<<<<<<< Updated upstream
    console.log('Weekly assignments query:', {
      week_start: formattedDate,
      is_recurring: false,
      results: weeklyAssignments?.map(a => ({
        id: a.id,
        worker: a.worker?.name,
        slot: {
          show: a.slot?.show_name,
          time: a.slot?.start_time,
          day: a.slot?.day_of_week
        },
        role: a.role
      }))
=======
    // Log all assignments with their types
    console.log('All fetched assignments:', allAssignments?.map(a => ({
      id: a.id,
      week_start: a.week_start,
      role: a.role,
      is_recurring: a.is_recurring,
      is_recurring_type: typeof a.is_recurring,
      is_deleted: a.is_deleted,
      worker: a.worker?.name,
      slot: {
        show: a.slot?.show_name,
        day: a.slot?.day_of_week
      }
    })));

    // Filter weekly assignments in code with detailed logging
    const weeklyAssignments = (allAssignments || []).filter(a => {
      const isNotRecurring = a.is_recurring === false;  // Explicit comparison
      const matchesWeek = a.week_start === formattedDate;
      const isNotDeleted = a.is_deleted === null || a.is_deleted === false;
      
      console.log('Filtering assignment:', {
        id: a.id,
        week_start: a.week_start,
        formattedDate,
        is_recurring: a.is_recurring,
        is_recurring_type: typeof a.is_recurring,
        is_deleted: a.is_deleted,
        isNotRecurring,
        matchesWeek,
        isNotDeleted,
        included: isNotRecurring && matchesWeek && isNotDeleted
      });
      
      return isNotRecurring && matchesWeek && isNotDeleted;
>>>>>>> Stashed changes
    });

    // Log the filtered assignments
    console.log('Weekly assignments after filtering:', weeklyAssignments.map(a => ({
      id: a.id,
      week_start: a.week_start,
      role: a.role,
      is_recurring: a.is_recurring,
      is_recurring_type: typeof a.is_recurring,
      is_deleted: a.is_deleted,
      worker: a.worker?.name
    })));

    // Get ALL recurring assignments to debug
    const { data: allRecurring, error: allRecurringError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('is_recurring', true);

    console.log('ALL recurring assignments (no filters):', allRecurring);

    // Get recurring assignments
    const { data: recurringAssignments, error: recurringError } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id (
          id,
          name,
          position,
          email,
          phone
        ),
        slot:slot_id (
          id,
          show_name,
          host_name,
          start_time,
          end_time,
          day_of_week,
          is_prerecorded,
          is_collection
        )
      `)
      .eq('is_recurring', true)
      .lte('week_start', formattedDate)
      .is('is_deleted', null)
<<<<<<< Updated upstream
      .or(`end_date.is.null,end_date.gte.${formattedDate}`);
=======
      .or(`end_date.is.null,and(end_date.gte.${formattedDate},week_start.lte.${formattedDate})`);
>>>>>>> Stashed changes

    if (recurringError) {
      console.error('Error fetching recurring assignments:', recurringError);
      throw recurringError;
    }

    console.log('Recurring assignments query:', {
      conditions: {
        is_recurring: true,
        week_start_lte: formattedDate,
        is_deleted: null,
<<<<<<< Updated upstream
        end_date_condition: `is null OR >= ${formattedDate}`
=======
        end_date_condition: `is null OR (>= ${formattedDate} AND week_start <= ${formattedDate})`
>>>>>>> Stashed changes
      },
      results: recurringAssignments?.map(a => ({
        id: a.id,
        worker: a.worker?.name,
        slot: {
          show: a.slot?.show_name,
          time: a.slot?.start_time,
          day: a.slot?.day_of_week
        },
        role: a.role,
        week_start: a.week_start,
<<<<<<< Updated upstream
        end_date: a.end_date
=======
        end_date: a.end_date,
        slot_day: a.slot?.day_of_week
>>>>>>> Stashed changes
      }))
    });

    // Get skips for recurring assignments
    const recurringIds = (recurringAssignments || []).map(a => a.id);
    let skips: ProducerAssignmentSkip[] = [];
    
    if (recurringIds.length > 0) {
      // Get skips for the exact week we're viewing
      const { data: allSkips, error: skipsError } = await supabase
        .from('producer_assignment_skips')
        .select('*')
        .in('assignment_id', recurringIds)
        .eq('week_start', formattedDate);

      if (skipsError) {
        console.error('Error fetching skips:', skipsError);
        throw skipsError;
      }

      skips = allSkips || [];
      console.log('Found skips for week', formattedDate, ':', skips);
    }

    // Filter out skipped recurring assignments
    const validRecurringAssignments = (recurringAssignments || []).filter(assignment => {
      const assignmentStartDate = normalizeDate(assignment.week_start);
      const currentWeekDate = normalizeDate(formattedDate);
      const endDate = assignment.end_date ? normalizeDate(assignment.end_date) : null;
      
      // Check if this specific week is skipped
      const isSkipped = skips.some(skip => 
        skip.assignment_id === assignment.id && 
        normalizeDate(skip.week_start).getTime() === currentWeekDate.getTime()
      );

<<<<<<< Updated upstream
      // Fix: An assignment is ended if it has an end_date and the current week is AFTER that end date
      const isEnded = endDate ? currentWeekDate.getTime() > endDate.getTime() : false;
      const hasStarted = !isBefore(currentWeekDate, assignmentStartDate);
      
=======
      // An assignment is valid if:
      // 1. It has started (current week is on or after start week)
      // 2. It hasn't ended (no end date OR current week is not after end date)
      // 3. It's not skipped for this week
      const hasStarted = assignmentStartDate.getTime() <= currentWeekDate.getTime();
      const isEnded = endDate ? currentWeekDate.getTime() > endDate.getTime() : false;
>>>>>>> Stashed changes
      const isValid = hasStarted && !isSkipped && !isEnded;
      
      console.log(`Filtering recurring assignment ${assignment.id}:`, {
        isSkipped,
        isEnded,
        hasStarted,
        isValid,
        end_date: assignment.end_date,
        week_start: assignment.week_start,
        currentWeek: formattedDate,
        endDateNormalized: endDate ? format(endDate, 'yyyy-MM-dd') : null,
        currentWeekNormalized: format(currentWeekDate, 'yyyy-MM-dd'),
<<<<<<< Updated upstream
        comparison: endDate ? `${currentWeekDate.getTime()} > ${endDate.getTime()}` : 'no end date',
        skips: skips.filter(s => s.assignment_id === assignment.id).map(s => s.week_start)
=======
        startDateNormalized: format(assignmentStartDate, 'yyyy-MM-dd'),
        dateComparisons: {
          hasStarted: `${assignmentStartDate.getTime()} <= ${currentWeekDate.getTime()}`,
          isEnded: endDate ? `${currentWeekDate.getTime()} > ${endDate.getTime()}` : 'no end date'
        },
        skips: skips.filter(s => s.assignment_id === assignment.id).map(s => s.week_start),
        slot: {
          day: assignment.slot?.day_of_week,
          time: assignment.slot?.start_time
        }
>>>>>>> Stashed changes
      });
      
      return isValid;
    });

    // Combine assignments
    const combinedAssignments = [
      ...(weeklyAssignments || []),
      ...validRecurringAssignments
    ];

    console.log('Final assignments:', combinedAssignments);

    return combinedAssignments;
  } catch (error) {
    console.error("Error fetching producer assignments:", error);
    throw error;
  }
};

export const getAllMonthlyAssignments = async (year: number, month: number) => {
  try {
    // Get the first and last day of the requested month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // Last day of the month
    
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Find assignments where week_start is within the month
    const { data, error } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id (
          id,
          name,
          position,
          email
        ),
        slot:slot_id (
          id,
          show_name,
          host_name,
          day_of_week
        )
      `)
      .gte('week_start', startDateStr)
      .lte('week_start', endDateStr);
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching monthly assignments:", error);
    throw error;
  }
};

export const createProducerAssignment = async (assignment: Omit<ProducerAssignment, 'id'>) => {
  try {
    console.log('createProducerAssignment input:', {
      ...assignment,
      week_start_type: typeof assignment.week_start,
      is_recurring_type: typeof assignment.is_recurring,
      is_recurring_value: assignment.is_recurring
    });
    
    // Normalize the week_start date to ensure consistency
    const normalizedWeekStart = format(normalizeDate(assignment.week_start), 'yyyy-MM-dd');
    const normalizedAssignment = {
      slot_id: assignment.slot_id,
      worker_id: assignment.worker_id,
      role: assignment.role,
      week_start: normalizedWeekStart,
      is_recurring: false,  // Explicitly set to false for non-recurring assignments
      notes: assignment.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: null,
      end_date: null
    };
    
    console.log('Normalized assignment:', {
      ...normalizedAssignment,
      week_start_type: typeof normalizedAssignment.week_start,
      is_recurring_type: typeof normalizedAssignment.is_recurring,
      is_recurring_value: normalizedAssignment.is_recurring
    });
    
    // Check if a duplicate assignment already exists
    const { data: existing, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', normalizedAssignment.slot_id)
      .eq('worker_id', normalizedAssignment.worker_id)
      .eq('role', normalizedAssignment.role)
      .eq('week_start', normalizedAssignment.week_start)
      .eq('is_recurring', false)  // Only check for non-recurring duplicates
      .is('is_deleted', null);
      
    if (checkError) {
      console.error('Error checking for existing assignment:', checkError);
      throw checkError;
    }
    
    console.log('Existing assignments found:', existing);
    
    if (existing && existing.length > 0) {
      console.log("Assignment already exists, not creating duplicate:", existing[0]);
      return existing[0];
    }
    
    // If no duplicate, create the new assignment
    console.log("Creating new producer assignment:", normalizedAssignment);
    
    // First try to insert without joins to debug
    const { data: rawInsert, error: rawError } = await supabase
      .from('producer_assignments')
      .insert([normalizedAssignment])
      .select();

    if (rawError) {
      console.error('Error in raw insert:', rawError);
      throw rawError;
    }

    if (!rawInsert || rawInsert.length === 0) {
      console.error('No data returned from insert');
      throw new Error('Failed to create assignment - no data returned from insert');
    }

    console.log('Raw insert successful:', rawInsert);

    // Verify the insert was successful
    const { data: verification, error: verifyError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('id', rawInsert[0].id)
      .single();

    if (verifyError) {
      console.error('Error verifying insert:', verifyError);
      throw verifyError;
    }

    if (!verification) {
      console.error('Could not verify insert - assignment not found');
      throw new Error('Failed to verify assignment creation');
    }

    console.log('Insert verified:', verification);

    // Now get the full record with joins
    const { data, error } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id (*),
        slot:slot_id (*)
      `)
      .eq('id', rawInsert[0].id)
      .single();
      
    if (error) {
      console.error('Error getting inserted assignment with joins:', error);
      throw error;
    }
    
    if (!data) {
      console.error('No data returned after insert');
      throw new Error('Failed to create assignment - no data returned');
    }
    
    console.log("Producer assignment created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error creating producer assignment:", error);
    throw error;
  }
};

export const createRecurringProducerAssignment = async (
  slotId: string, 
  workerId: string, 
  role: string,
  weekStart: string
) => {
  try {
    console.log(`Creating recurring assignment with params:`, {
      slotId,
      workerId,
      role,
      weekStart
    });
    
    // Check if a recurring assignment already exists for this specific combination
    const { data: existing, error: checkError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('slot_id', slotId)
      .eq('worker_id', workerId)
      .eq('role', role)
      .eq('is_recurring', true)
      .is('is_deleted', null)
      .or(`week_start.eq.${weekStart},and(week_start.lte.${weekStart},or(end_date.is.null,end_date.gte.${weekStart}))`);
      
    if (checkError) {
      console.error('Error checking for existing recurring assignment:', checkError);
      throw checkError;
    }
    
    console.log('Existing assignments check:', {
      query: {
        slot_id: slotId,
        worker_id: workerId,
        role: role,
        is_recurring: true,
        is_deleted: null,
        condition: `week_start = ${weekStart} OR (week_start <= ${weekStart} AND (end_date IS NULL OR end_date >= ${weekStart}))`
      },
      found: existing
    });
    
    if (existing && existing.length > 0) {
      console.log("Recurring assignment already exists for this time period:", existing[0]);
      return true;
    }
    
    // Create a new recurring assignment
    const newAssignment = {
      slot_id: slotId,
      worker_id: workerId,
      role: role,
      is_recurring: true,
      week_start: weekStart,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      end_date: null,
      is_deleted: null
    };

    console.log('Creating new recurring assignment with data:', newAssignment);
    
    const { data, error } = await supabase
      .from('producer_assignments')
      .insert(newAssignment)
      .select();
      
    if (error) {
      console.error('Error creating recurring assignment:', error);
      throw error;
    }
    
    if (!data) {
      console.error('No data returned after creating recurring assignment');
      throw new Error('Failed to create recurring assignment - no data returned');
    }
    
    console.log("Successfully created recurring assignment:", data);
    return true;
  } catch (error: any) {
    console.error("Error creating recurring assignment:", error);
    throw new Error(error.message || "Failed to create recurring assignment");
  }
};

// Helper function to check if a table exists
const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .rpc('check_table_exists', { 
        table_name: tableName 
      });
    
    if (error) {
      console.warn(`Error checking table ${tableName}:`, error);
      return false;
    }
    return !!data;
  } catch (error) {
    console.warn(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
};

export const deleteProducerAssignment = async (id: string, deleteMode: 'current' | 'future' = 'current', viewingWeekStart?: string) => {
  try {
    console.log('Starting deleteProducerAssignment with:', { id, deleteMode, viewingWeekStart });
    
    // First, get the assignment details
    const { data: assignment, error: fetchError } = await supabase
      .from('producer_assignments')
      .select(`
        *,
        worker:worker_id (
          id,
          name
        ),
        slot:slot_id (
          id,
          show_name
        )
      `)
      .eq('id', id)
      .single();
      
    if (fetchError) throw fetchError;
    if (!assignment) throw new Error('Assignment not found');

    console.log('Found assignment:', assignment);

    // Case 1: Non-recurring assignment - mark as deleted
    if (!assignment.is_recurring) {
      console.log('Handling non-recurring assignment deletion');
      const { error } = await supabase
        .from('producer_assignments')
        .update({ 
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (error) throw error;
      return {
        success: true,
        message: 'Assignment deleted successfully'
      };
    }

    // Case 2: Recurring assignment - "this week only"
    if (deleteMode === 'current') {
      console.log('Handling current week skip for recurring assignment');
      
      // Use the viewing week start date for the skip
      const skipWeekStart = viewingWeekStart || assignment.week_start;
      console.log('Creating skip for week:', skipWeekStart);

      // Create a skip entry for this week
      const { data: skipData, error: createError } = await supabase
        .from('producer_assignment_skips')
        .insert({
          assignment_id: id,
          week_start: skipWeekStart,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating skip entry:', createError);
        throw createError;
      }

      console.log('Created skip entry:', skipData);
      
      return {
        success: true,
        message: `Assignment skipped for week ${skipWeekStart}`
      };
    }

    // Case 3: Recurring assignment - "future weeks"
    if (deleteMode === 'future') {
      console.log('Handling future deletion of recurring assignment');
      
      if (!viewingWeekStart) {
        throw new Error('viewingWeekStart is required for future deletions');
      }

      // Instead of marking the original assignment as deleted,
      // we'll set its end_date to preserve past weeks
      const endDate = format(addDays(parseISO(viewingWeekStart), -1), 'yyyy-MM-dd');
      
      console.log('Setting end date for recurring assignment:', {
        assignmentId: id,
        endDate,
        viewingWeekStart
      });

      const { error: updateError } = await supabase
        .from('producer_assignments')
        .update({ 
          end_date: endDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error updating assignment end date:', updateError);
        throw updateError;
      }

      console.log('Successfully updated assignment end date');

      return {
        success: true,
        message: `Assignment ended from ${viewingWeekStart} onwards`
      };
    }

    return {
      success: false,
      message: 'Invalid delete mode specified'
    };
  } catch (error) {
    console.error("Error deleting producer assignment:", error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete assignment');
  }
};

// Add this new function to get skipped weeks
export const getSkippedAssignments = async (weekStart: string) => {
  try {
    const { data: skips, error } = await supabase
      .from('producer_assignment_skips')
      .select('*')
      .eq('week_start', weekStart);

    if (error) throw error;
    return skips || [];
  } catch (error) {
    console.error("Error fetching skipped assignments:", error);
    return [];
  }
};

// Add this debugging function
export const verifySkipsForAssignment = async (assignmentId: string) => {
  try {
    // Get all skips for this assignment
    const { data: skips, error: skipsError } = await supabase
      .from('producer_assignment_skips')
      .select('*')
      .eq('assignment_id', assignmentId);

    if (skipsError) throw skipsError;

    // Get the assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('producer_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError) throw assignmentError;

    console.log('Assignment verification:', {
      assignment,
      skips,
      skipsCount: skips?.length || 0
    });

    return {
      assignment,
      skips
    };
  } catch (error) {
    console.error("Error verifying skips:", error);
    throw error;
  }
};
