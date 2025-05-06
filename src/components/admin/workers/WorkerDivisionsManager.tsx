
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkerDivisions } from '@/hooks/useWorkerDivisions';
import { X, Plus } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

interface WorkerDivisionsManagerProps {
  workerId: string;
}

const WorkerDivisionsManager: React.FC<WorkerDivisionsManagerProps> = ({ workerId }) => {
  const { 
    divisions, 
    workerDivisions, 
    loading, 
    error, 
    assignDivision, 
    removeDivision, 
    isDivisionAssigned 
  } = useWorkerDivisions(workerId);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-medium">מחלקות</h3>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">מחלקות מוקצות</h3>
        <div className="flex flex-wrap gap-2">
          {workerDivisions.length === 0 ? (
            <p className="text-gray-500">לא הוקצו מחלקות לעובד זה</p>
          ) : (
            workerDivisions.map(division => (
              <Badge key={division.id} variant="secondary" className="flex items-center gap-1 py-1 px-3">
                {division.name}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 ml-1"
                  onClick={() => removeDivision(division.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">הקצאת מחלקות</h3>
        <div className="flex flex-wrap gap-2">
          {divisions
            .filter(division => !isDivisionAssigned(division.id))
            .map(division => (
              <Button 
                key={division.id} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-1"
                onClick={() => assignDivision(division.id)}
              >
                <Plus className="h-3 w-3" />
                {division.name}
              </Button>
            ))
          }
          {divisions.length === workerDivisions.length && (
            <p className="text-gray-500">כל המחלקות הוקצו</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDivisionsManager;
