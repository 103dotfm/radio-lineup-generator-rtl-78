
import { useState } from 'react';
import { 
  EDITING_ROLE_ID, 
  PRODUCTION_ROLE_ID,
  EDITING_FIRST_ROLE_ID,
  EVENING_PRODUCTION_ROLE_ID 
} from '../components/AssignmentDialog';
import { ProducerAssignment } from '@/lib/supabase/producers';

export interface ProducerFormItem {
  workerId: string;
  role: string;
  additionalText?: string;
}

export const useProducerForms = (roles: any[]) => {
  // Set default roles for workers - first worker gets "עריכה", second gets "הפקה"
  const [producerForms, setProducerForms] = useState<ProducerFormItem[]>([
    { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, // First worker - עריכה (Editing)
    { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, // Second worker - הפקה (Production)
    { workerId: '', role: EDITING_FIRST_ROLE_ID, additionalText: '' }, 
    { workerId: '', role: EVENING_PRODUCTION_ROLE_ID, additionalText: '' }, 
    { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, 
    { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, 
  ]);
  
  const [visibleWorkerCount, setVisibleWorkerCount] = useState(2);

  const updateProducerForm = (index: number, field: 'workerId' | 'role' | 'additionalText', value: string) => {
    setProducerForms(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addWorkerForm = () => {
    if (visibleWorkerCount < producerForms.length) {
      setVisibleWorkerCount(prev => prev + 1);
    }
  };

  const resetForms = (slotAssignments: ProducerAssignment[] = []) => {
    // Create default forms with appropriate defaults for first and second worker
    const newProducerForms = [
      { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, // First worker - עריכה (Editing)
      { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, // Second worker - הפקה (Production)
      { workerId: '', role: EDITING_FIRST_ROLE_ID, additionalText: '' }, 
      { workerId: '', role: EVENING_PRODUCTION_ROLE_ID, additionalText: '' }, 
      { workerId: '', role: EDITING_ROLE_ID, additionalText: '' }, 
      { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' }, 
    ];
    
    // Pre-populate the form with existing assignments
    if (slotAssignments.length > 0) {
      slotAssignments.forEach((assignment, index) => {
        // Only pre-populate up to the maximum number of assignments we handle
        if (index < producerForms.length) {
          const roleId = roles.find(r => r.name === assignment.role)?.id || EDITING_ROLE_ID;
          newProducerForms[index] = {
            workerId: assignment.worker_id,
            role: roleId,
            additionalText: assignment.notes || ''
          };
        }
      });
      
      // Set visible workers count to at least include all existing assignments 
      // (up to maximum of forms length)
      setVisibleWorkerCount(Math.max(2, Math.min(producerForms.length, slotAssignments.length)));
    } else {
      setVisibleWorkerCount(2); // Start with 2 visible if no existing assignments
    }
    
    setProducerForms(newProducerForms);
  };

  return {
    producerForms,
    visibleWorkerCount,
    updateProducerForm,
    addWorkerForm,
    resetForms
  };
};
