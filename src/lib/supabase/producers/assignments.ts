import { api } from "@/lib/api-client";
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

// Helper function to ensure array type
const ensureArray = <T>(data: T | T[] | null | undefined): T[] => {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
};

export const getProducerAssignments = async (weekStart: Date) => {
  try {
    const normalizedWeekStart = normalizeDate(weekStart);
    const formattedDate = format(normalizedWeekStart, 'yyyy-MM-dd');
    
    // Calculate the week range (7 days from the week start)
    const weekEnd = addDays(normalizedWeekStart, 6);
    const weekEndFormatted = format(weekEnd, 'yyyy-MM-dd');

    console.log('getProducerAssignments: Looking for assignments between', formattedDate, 'and', weekEndFormatted);

    // Get weekly assignments for this specific week (any day within the week)
    const { data: weeklyAssignments, error: weeklyError } = await api.query('/producer-assignments', {
      where: { 
        week_start: { gte: formattedDate, lte: weekEndFormatted },
        is_recurring: false,
        is_deleted: false
      },
    });
    if (weeklyError) throw weeklyError;

    // Get all recurring assignments
    const { data: recurringAssignments, error: recurringError } = await api.query('/producer-assignments', {
      where: { is_recurring: true, is_deleted: false },
    });
    if (recurringError) throw recurringError;

    // Get skips for recurring assignments for this week
    const recurringIds = ensureArray(recurringAssignments).map(a => a.id);
    let skips: ProducerAssignmentSkip[] = [];
    if (recurringIds.length > 0) {
      const { data: allSkips, error: skipsError } = await api.query('/producer-assignment-skips', {
        where: { assignment_id: recurringIds, week_start: formattedDate },
      });
      if (skipsError) throw skipsError;
      skips = ensureArray(allSkips);
    }

    // Filter out skipped recurring assignments and check date ranges
    const validRecurringAssignments = ensureArray(recurringAssignments).filter(assignment => {
      const assignmentStartDate = normalizeDate(assignment.week_start);
      const currentWeekDate = normalizeDate(formattedDate);
      const endDate = assignment.end_date ? normalizeDate(assignment.end_date) : null;
      
      // Check if this assignment is skipped for this week
      const isSkipped = skips.some(skip =>
        skip.assignment_id === assignment.id &&
        normalizeDate(skip.week_start).getTime() === currentWeekDate.getTime()
      );
      
      // Check if assignment has started and not ended
      const hasStarted = assignmentStartDate.getTime() <= currentWeekDate.getTime();
      const isEnded = endDate ? currentWeekDate.getTime() > endDate.getTime() : false;
      
      const isValid = hasStarted && !isSkipped && !isEnded;
      
      return isValid;
    });

    // Combine assignments
    const combinedAssignments = [
      ...ensureArray(weeklyAssignments),
      ...validRecurringAssignments
    ];
    
    console.log('getProducerAssignments: Found assignments:', {
      weeklyAssignments: ensureArray(weeklyAssignments).length,
      recurringAssignments: validRecurringAssignments.length,
      total: combinedAssignments.length
    });
    
    return combinedAssignments;
  } catch (error) {
    console.error("Error fetching producer assignments:", error);
    throw error;
  }
};

export const getAllMonthlyAssignments = async (year: number, month: number) => {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    const { data, error } = await api.query('/producer-assignments', {
      where: { week_start: { gte: startDateStr, lte: endDateStr } },
    });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching monthly assignments:", error);
    throw error;
  }
};

export const createProducerAssignment = async (assignment: Omit<ProducerAssignment, 'id'>) => {
  try {
    const normalizedWeekStart = format(normalizeDate(assignment.week_start), 'yyyy-MM-dd');
    const normalizedAssignment = {
      ...assignment,
      week_start: normalizedWeekStart,
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      end_date: null
    };
    // Check for duplicate by slot_id first
    const { data: existingBySlotId, error: checkError1 } = await api.query('/producer-assignments', {
      where: {
        slot_id: normalizedAssignment.slot_id,
        worker_id: normalizedAssignment.worker_id,
        role: normalizedAssignment.role,
        week_start: normalizedAssignment.week_start,
        is_recurring: false,
        is_deleted: false
      }
    });
    if (checkError1) throw checkError1;
    if (existingBySlotId && existingBySlotId.length > 0) return existingBySlotId[0];
    
    // Also check for duplicate by slot characteristics (day_of_week, start_time, show_name)
    // This prevents creating multiple assignments for the same show even if slot_id is different
    if (normalizedAssignment.day_of_week !== undefined && 
        normalizedAssignment.start_time !== undefined && 
        normalizedAssignment.show_name !== undefined) {
      const { data: existingByCharacteristics, error: checkError2 } = await api.query('/producer-assignments', {
        where: {
          day_of_week: normalizedAssignment.day_of_week,
          start_time: normalizedAssignment.start_time,
          show_name: normalizedAssignment.show_name,
          worker_id: normalizedAssignment.worker_id,
          role: normalizedAssignment.role,
          week_start: normalizedAssignment.week_start,
          is_recurring: false,
          is_deleted: false
        }
      });
      if (checkError2) throw checkError2;
      if (existingByCharacteristics && existingByCharacteristics.length > 0) {
        console.log('Found existing assignment by characteristics, returning it instead of creating duplicate');
        return existingByCharacteristics[0];
      }
    }
    // Insert
    const { data, error } = await api.mutate('/producer-assignments', normalizedAssignment, 'POST');
    if (error) throw error;
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
  weekStart: string,
  dayOfWeek: number,
  startTime: string,
  showName: string
) => {
  try {
    // Check for existing recurring assignment for this slot/worker/role combination
    const { data: existing, error: checkError } = await api.query('/producer-assignments', {
      where: {
        slot_id: slotId,
        worker_id: workerId,
        role: role,
        is_recurring: true,
        is_deleted: false
      }
    });
    if (checkError) throw checkError;
    
    if (existing && existing.length > 0) {
      console.log(`createRecurringProducerAssignment: Found existing recurring assignment ${existing[0].id}, updating start date to ${weekStart}`);
      // Update the existing assignment's start date if it's earlier than the current week
      const existingAssignment = existing[0];
      const existingStartDate = normalizeDate(existingAssignment.week_start);
      const newStartDate = normalizeDate(weekStart);
      if (existingStartDate.getTime() > newStartDate.getTime()) {
        // Update the start date to the earlier date
        const { error: updateError } = await api.mutate(`/producer-assignments/${existingAssignment.id}`, {
          week_start: weekStart,
          day_of_week: dayOfWeek,
          start_time: startTime,
          show_name: showName,
          updated_at: new Date().toISOString()
        }, 'PUT');
        if (updateError) throw updateError;
      }
      return true;
    }
    // Insert new recurring assignment
    const newAssignment = {
      slot_id: slotId,
      worker_id: workerId,
      role: role,
      is_recurring: true,
      week_start: weekStart,
      day_of_week: dayOfWeek,
      start_time: startTime,
      show_name: showName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      end_date: null,
      is_deleted: false
    };
    const { data, error } = await api.mutate('/producer-assignments', newAssignment, 'POST');
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error("Error creating recurring assignment:", error);
    throw new Error(error.message || "Failed to create recurring assignment");
  }
};

export const deleteProducerAssignment = async (id: string, deleteMode: 'current' | 'future' = 'current', viewingWeekStart?: string) => {
  try {
    // Fetch assignment
    const { data: assignment, error: fetchError } = await api.query('/producer-assignments', {
      where: { id }
    });
    if (fetchError) throw fetchError;
    if (!assignment || assignment.length === 0) throw new Error('Assignment not found');
    const a = assignment[0];
    // Non-recurring: mark as deleted
    if (!a.is_recurring) {
      const { error } = await api.mutate(`/producer-assignments/${id}`, { is_deleted: true, updated_at: new Date().toISOString() }, 'PUT');
      if (error) throw error;
      return { success: true, message: 'Assignment deleted successfully' };
    }
    // Recurring: current week skip
    if (deleteMode === 'current') {
      const skipWeekStart = viewingWeekStart || a.week_start;
      const skipData = {
        assignment_id: id,
        week_start: skipWeekStart,
        created_at: new Date().toISOString()
      };
      const { error: createError } = await api.mutate('/producer-assignment-skips', skipData, 'POST');
      if (createError) throw createError;
      return { success: true, message: `Assignment skipped for week ${skipWeekStart}` };
    }
    // Recurring: future weeks
    if (deleteMode === 'future') {
      if (!viewingWeekStart) throw new Error('viewingWeekStart is required for future deletions');
      const endDate = format(addDays(parseISO(viewingWeekStart), -1), 'yyyy-MM-dd');
      const { error: updateError } = await api.mutate(`/producer-assignments/${id}`, { end_date: endDate, updated_at: new Date().toISOString() }, 'PUT');
      if (updateError) throw updateError;
      return { success: true, message: `Assignment ended from ${viewingWeekStart} onwards` };
    }
    return { success: false, message: 'Invalid delete mode specified' };
  } catch (error) {
    console.error("Error deleting producer assignment:", error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete assignment');
  }
};

export const getSkippedAssignments = async (weekStart: string) => {
  try {
    const { data: skips, error } = await api.query('/producer-assignment-skips', {
      where: { week_start: weekStart }
    });
    if (error) throw error;
    return skips || [];
  } catch (error) {
    console.error("Error fetching skipped assignments:", error);
    return [];
  }
};

export const verifySkipsForAssignment = async (assignmentId: string) => {
  try {
    const { data: skips, error: skipsError } = await api.query('/producer-assignment-skips', {
      where: { assignment_id: assignmentId }
    });
    if (skipsError) throw skipsError;
    const { data: assignment, error: assignmentError } = await api.query('/producer-assignments', {
      where: { id: assignmentId }
    });
    if (assignmentError) throw assignmentError;
    return { assignment, skips };
  } catch (error) {
    console.error("Error verifying skips:", error);
    throw error;
  }
};
