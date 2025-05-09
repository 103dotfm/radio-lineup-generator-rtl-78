
import React from 'react';
import { Button } from "@/components/ui/button";
import { ProducerAssignment } from '@/lib/supabase/producers';
import { ScheduleSlot } from '@/types/schedule';
import { getCombinedShowDisplay } from '@/utils/showDisplay';

interface SlotAssignmentsProps {
  slot: ScheduleSlot;
  slotAssignments: ProducerAssignment[];
  onAssign: (slot: ScheduleSlot) => void;
  onDeleteAssignment: (assignmentId: string) => void;
}

const SlotAssignments: React.FC<SlotAssignmentsProps> = ({
  slot,
  slotAssignments,
  onAssign,
  onDeleteAssignment
}) => {
  const combinedShowName = getCombinedShowDisplay(slot.show_name, slot.host_name);

  return (
    <div
      className="mb-3 border rounded p-2 bg-gray-50"
      onClick={() => onAssign(slot)}
    >
      <div className="font-medium text-sm">
        {combinedShowName}
      </div>
      
      {slotAssignments.length > 0 && (
        <div className="mt-2 text-sm border-t pt-2">
          {/* Group assignments by role */}
          {Object.entries(
            slotAssignments.reduce<Record<string, ProducerAssignment[]>>((acc, assignment) => {
              const role = assignment.role || 'ללא תפקיד';
              if (!acc[role]) acc[role] = [];
              acc[role].push(assignment);
              return acc;
            }, {})
          ).map(([role, roleAssignments]) => (
            <div key={`role-${role}-${slot.id}`} className="mb-1">
              <span className="font-medium">{role}: </span> 
              <div className="space-y-1">
                {roleAssignments.map((assignment) => (
                  <div key={`assignment-${assignment.id}`} className="flex justify-between items-center bg-white p-1 rounded">
                    <span>{assignment.worker?.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAssignment(assignment.id);
                      }}
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
  );
};

export default SlotAssignments;
