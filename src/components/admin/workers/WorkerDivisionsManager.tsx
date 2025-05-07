
import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWorkerDivisions, DIVISION_TRANSLATIONS } from '@/hooks/useWorkerDivisions';
import { X, Plus, Loader2 } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Division } from '@/lib/supabase/divisions';

interface WorkerDivisionsManagerProps {
  workerId: string;
}

const WorkerDivisionsManager: React.FC<WorkerDivisionsManagerProps> = ({ workerId }) => {
  const { toast } = useToast();
  const { 
    divisions, 
    workerDivisions, 
    loading, 
    error, 
    assignDivision, 
    removeDivision, 
    isDivisionAssigned,
    refreshData,
    getDivisionTranslation
  } = useWorkerDivisions(workerId);
  
  const [selectedDivision, setSelectedDivision] = useState<string | undefined>();
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState<Record<string, boolean>>({});

  // Force refresh data when component mounts or workerId changes
  useEffect(() => {
    if (workerId) {
      console.log(`WorkerDivisionsManager: Refreshing data for worker ID ${workerId}`);
      refreshData();
    }
  }, [workerId, refreshData]);

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
    return getDivisionTranslation(name);
  };

  const handleAssignDivision = async () => {
    if (!selectedDivision) return;

    try {
      setIsAssigning(true);
      console.log(`WorkerDivisionsManager: Assigning division ${selectedDivision} to worker ${workerId}`);
      const success = await assignDivision(selectedDivision);
      if (success) {
        console.log('Division successfully assigned, refreshing data');
        // Force refresh data after assignment
        await refreshData();
        setSelectedDivision(undefined);
      } else {
        console.error('Division assignment failed');
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בהקצאת המחלקה",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error in handleAssignDivision:', err);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהקצאת המחלקה",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveDivision = async (divisionId: string) => {
    try {
      setIsRemoving(prev => ({ ...prev, [divisionId]: true }));
      console.log(`WorkerDivisionsManager: Removing division ${divisionId} from worker ${workerId}`);
      const success = await removeDivision(divisionId);
      if (success) {
        console.log('Division successfully removed, refreshing data');
        // Force refresh data after removal
        await refreshData();
      } else {
        console.error('Division removal failed');
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בהסרת המחלקה",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error in handleRemoveDivision:', err);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהסרת המחלקה",
        variant: "destructive",
      });
    } finally {
      setIsRemoving(prev => ({ ...prev, [divisionId]: false }));
    }
  };

  // Filter out divisions that are already assigned
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
            workerDivisions.map((division: Division) => (
              <Badge key={division.id} variant="secondary" className="flex items-center gap-1 py-1 px-3">
                {getLocalizedName(division.name)}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 mr-1"
                  onClick={() => handleRemoveDivision(division.id)}
                  disabled={isRemoving[division.id]}
                >
                  {isRemoving[division.id] ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
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
            disabled={unassignedDivisions.length === 0 || isAssigning}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="בחר מחלקה" />
            </SelectTrigger>
            <SelectContent>
              {unassignedDivisions.map((division: Division) => (
                <SelectItem key={division.id} value={division.id}>
                  {getLocalizedName(division.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline"
            onClick={handleAssignDivision}
            disabled={!selectedDivision || isAssigning || unassignedDivisions.length === 0}
            className="flex items-center gap-1"
          >
            {isAssigning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
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
