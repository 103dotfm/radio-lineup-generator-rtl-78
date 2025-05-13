
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
  const [producerForms, setProducerForms] = useState<ProducerFormItem[]>([
    { workerId: '', role: EDITING_ROLE_ID, additionalText: '' },
    { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' },
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
    if (visibleWorkerCount < 4) {
      setVisibleWorkerCount(prev => prev + 1);
    }
  };

  const resetForms = (slotAssignments: ProducerAssignment[] = []) => {
    const newProducerForms = [
      { workerId: '', role: EDITING_ROLE_ID, additionalText: '' },
      { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' },
      { workerId: '', role: EDITING_FIRST_ROLE_ID, additionalText: '' },
      { workerId: '', role: EVENING_PRODUCTION_ROLE_ID, additionalText: '' },
      { workerId: '', role: EDITING_ROLE_ID, additionalText: '' },
      { workerId: '', role: PRODUCTION_ROLE_ID, additionalText: '' },
    ];
    
    // Pre-populate the form with existing assignments
    if (slotAssignments.length > 0) {
      slotAssignments.forEach((assignment, index) => {
        // Only pre-populate up to 4 assignments
        if (index < 4) {
          const roleId = roles.find(r => r.name === assignment.role)?.id || EDITING_ROLE_ID;
          newProducerForms[index] = {
            workerId: assignment.worker_id,
            role: roleId,
            additionalText: assignment.notes || ''
          };
        }
      });
      
      // Set visible workers count to at least include all existing assignments 
      // (up to maximum of 4)
      setVisibleWorkerCount(Math.max(2, Math.min(4, slotAssignments.length)));
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
