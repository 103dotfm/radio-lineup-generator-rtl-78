
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
import { useToast } from "@/hooks/use-toast";

interface WorkerDivisionsManagerProps {
  workerId: string;
}

const DIVISION_TRANSLATIONS: Record<string, string> = {
  'digital': 'דיגיטל',
  'engineers': 'טכנאים',
  'producers': 'עורכים ומפיקים'
};

const WorkerDivisionsManager: React.FC<WorkerDivisionsManagerProps> = ({ workerId }) => {
  const { toast } = useToast();
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
      try {
        const success = await assignDivision(selectedDivision);
        if (success) {
          toast({
            title: "הצלחה",
            description: "המחלקה הוקצתה לעובד בהצלחה",
          });
        } else {
          toast({
            title: "שגיאה",
            description: "אירעה שגיאה בהקצאת המחלקה",
            variant: "destructive",
          });
        }
        setSelectedDivision(undefined);
      } catch (error) {
        console.error('Error assigning division:', error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בהקצאת המחלקה",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveDivision = async (divisionId: string) => {
    try {
      const success = await removeDivision(divisionId);
      if (success) {
        toast({
          title: "הצלחה",
          description: "המחלקה הוסרה מהעובד בהצלחה",
        });
      } else {
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בהסרת המחלקה",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error removing division:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהסרת המחלקה",
        variant: "destructive",
      });
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
                  onClick={() => handleRemoveDivision(division.id)}
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
        
        {unassignedDivisions.length === 0 && workerDivisions.length > 0 && (
          <p className="text-gray-500 mt-2">כל המחלקות הוקצו</p>
        )}
      </div>
    </div>
  );
};

export default WorkerDivisionsManager;
