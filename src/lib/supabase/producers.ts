import { format } from 'date-fns';
import { api } from "@/lib/api-client";
import { getProducersByDivision, getProducers as fetchProducers, getProducerRoles as fetchProducerRoles } from './producers/workers';
import { 
  getProducerAssignments, 
  getAllMonthlyAssignments,
  createProducerAssignment,
  createRecurringProducerAssignment,
  deleteProducerAssignment
} from './producers/assignments';

// Provide client-side implementations for user-related actions (placeholder)
export const createProducerUser = async (workerId: string, email: string): Promise<{ success: boolean; password?: string; message?: string; }> => {
  try {
    const res = await fetch('/api/admin/producer-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ worker_id: workerId, email })
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed to create user' };
  }
};

export const resetProducerPassword = async (workerId: string): Promise<{ success: boolean; password?: string; message?: string; }> => {
  try {
    const res = await fetch(`/api/admin/producer-users/${encodeURIComponent(workerId)}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const data = await res.json();
    return data;
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed to reset password' };
  }
};

// Re-export functions from the workers module
export const getProducers = fetchProducers;
export const getProducerRoles = fetchProducerRoles;
export { getProducersByDivision };

// Re-export functions from the assignments module
export {
  getProducerAssignments,
  getAllMonthlyAssignments,
  createProducerAssignment,
  createRecurringProducerAssignment,
  deleteProducerAssignment
};

// Types
export type ProducerAssignment = {
  id: string;
  slot_id: string;
  worker_id: string;
  role: string;
  week_start: string;
  notes?: string | null;
  is_recurring?: boolean;
  created_at?: string;
  updated_at?: string;
  worker?: Worker;
  slot?: ScheduleSlot;
};

export type Worker = {
  id: string;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ScheduleSlot = {
  id: string;
  show_name: string;
  host_name?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

export const getOrCreateProducerWorkArrangement = async (weekStart: Date) => {
  try {
    // Format as YYYY-MM-DD for consistent date handling
    const formattedDate = format(weekStart, 'yyyy-MM-dd');
    
    // First try to get existing arrangement
    const { data, error } = await api.query('/producer-work-arrangements', {
      where: { week_start: formattedDate },
      single: true
    });
      
    if (error) {
      // If no arrangement exists, create a new one
      const { data: newArrangement, error: createError } = await api.mutate('/producer-work-arrangements', {
        week_start: formattedDate
      }, 'POST');
          
      if (createError) throw createError;
      return newArrangement;
    }
    
    return data;
  } catch (error) {
    console.error("Error with producer work arrangement:", error);
    throw error;
  }
};

export const updateProducerWorkArrangementNotes = async (id: string, notes: string) => {
  try {
    const { error } = await api.mutate(`/producer-work-arrangements/${id}`, { notes }, 'PUT');
      
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error updating arrangement notes:", error);
    throw error;
  }
};
