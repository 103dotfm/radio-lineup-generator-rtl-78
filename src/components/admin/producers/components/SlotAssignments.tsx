
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ProducerAssignment } from '@/lib/supabase/producers';
import { ScheduleSlot } from '@/types/schedule';
import { getCombinedShowDisplay } from '@/utils/showDisplay';
import DeleteAssignmentDialog from './DeleteAssignmentDialog';

interface SlotAssignmentsProps {
  slot: ScheduleSlot;
  slotAssignments: ProducerAssignment[];
  onAssign: (slot: ScheduleSlot) => void;
  onDeleteAssignment: (assignmentId: string, deleteMode: 'current' | 'future') => Promise<void>;
}

const SlotAssignments: React.FC<SlotAssignmentsProps> = ({
  slot,
  slotAssignments,
  onAssign,
  onDeleteAssignment
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ProducerAssignment | null>(null);
  
  const combinedShowName = getCombinedShowDisplay(slot.show_name, slot.host_name);

  // Group assignments by role while preserving the original order
  const assignmentsByRole: Record<string, ProducerAssignment[]> = {};
  slotAssignments.forEach(assignment => {
    const role = assignment.role || 'ללא תפקיד';
    if (!assignmentsByRole[role]) {
      assignmentsByRole[role] = [];
    }
    assignmentsByRole[role].push(assignment);
  });
  
  const handleDeleteClick = (assignment: ProducerAssignment, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignmentToDelete(assignment);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteCurrentWeek = async () => {
    if (assignmentToDelete) {
      await onDeleteAssignment(assignmentToDelete.id, 'current');
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
    }
  };
  
  const handleDeleteAllFuture = async () => {
    if (assignmentToDelete) {
      await onDeleteAssignment(assignmentToDelete.id, 'future');
      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
    }
  };

  return (
    <div className="mb-3 border rounded p-2 bg-gray-50">
      <div 
        className="cursor-pointer"
        onClick={() => onAssign(slot)}
      >
        <div className="font-medium text-sm">
          {combinedShowName}
        </div>
        
        {slotAssignments.length > 0 && (
          <div className="mt-2 text-sm border-t pt-2">
            {/* Display assignments grouped by role */}
            {Object.entries(assignmentsByRole).map(([role, roleAssignments]) => (
              <div key={`role-${role}-${slot.id}`} className="mb-1">
                <span className="font-medium">{role}: </span> 
                <div className="space-y-1">
                  {roleAssignments.map((assignment) => (
                    <div key={`assignment-${assignment.id}`} className="flex justify-between items-center bg-white p-1 rounded">
                      <span>{assignment.worker?.name || 'עובד לא ידוע'}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => handleDeleteClick(assignment, e)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Assignment Dialog */}
      {assignmentToDelete && (
        <DeleteAssignmentDialog 
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setAssignmentToDelete(null);
          }}
          onDeleteCurrentWeek={handleDeleteCurrentWeek}
          onDeleteAllFuture={handleDeleteAllFuture}
          isRecurring={assignmentToDelete.is_recurring || false}
        />
      )}
    </div>
  );
};

export default SlotAssignments;
