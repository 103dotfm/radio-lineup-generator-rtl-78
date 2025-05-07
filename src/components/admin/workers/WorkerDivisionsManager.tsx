
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkerDivisions } from '@/hooks/useWorkerDivisions';
import { X, Plus } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkerDivisionsManagerProps {
  workerId: string;
}

const DIVISION_TRANSLATIONS: Record<string, string> = {
  'digital': 'דיגיטל',
  'engineers': 'טכנאים',
  'producers': 'עורכים ומפיקים'
};

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
  
  const [selectedDivision, setSelectedDivision] = useState<string | undefined>();

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

  const getLocalizedName = (name: string): string => {
    return DIVISION_TRANSLATIONS[name.toLowerCase()] || name;
  };

  const handleAssignDivision = async () => {
    if (selectedDivision) {
      await assignDivision(selectedDivision);
      setSelectedDivision(undefined);
    }
  };

  const unassignedDivisions = divisions.filter(
    division => !isDivisionAssigned(division.id)
  );

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
                {getLocalizedName(division.name)}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 mr-1"
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
        
        <div className="flex gap-2">
          <Select
            value={selectedDivision}
            onValueChange={setSelectedDivision}
            disabled={unassignedDivisions.length === 0}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="בחר מחלקה" />
            </SelectTrigger>
            <SelectContent>
              {unassignedDivisions.map(division => (
                <SelectItem key={division.id} value={division.id}>
                  {getLocalizedName(division.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline"
            onClick={handleAssignDivision}
            disabled={!selectedDivision || unassignedDivisions.length === 0}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            הוסף מחלקה
          </Button>
        </div>
        
        {unassignedDivisions.length === 0 && (
          <p className="text-gray-500 mt-2">כל המחלקות הוקצו</p>
        )}
      </div>
    </div>
  );
};

export default WorkerDivisionsManager;
