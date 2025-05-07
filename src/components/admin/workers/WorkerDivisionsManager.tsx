
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWorkerDivisions, DIVISION_TRANSLATIONS } from '@/hooks/useWorkerDivisions';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

interface WorkerDivisionsManagerProps {
  workerId: string;
}

const WorkerDivisionsManager: React.FC<WorkerDivisionsManagerProps> = ({ workerId }) => {
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [removing, setRemoving] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();
  
  const {
    divisions,
    workerDivisions,
    loading: divisionsLoading,
    error,
    assignDivision,
    removeDivision,
    isDivisionAssigned,
    refreshData,
    getDivisionTranslation
  } = useWorkerDivisions(workerId);

  useEffect(() => {
    console.log('WorkerDivisionsManager mounted, refreshing data');
    refreshData();
  }, [workerId, refreshData]);

  const handleAssignDivision = async (divisionId: string) => {
    setLoading(prev => ({ ...prev, [divisionId]: true }));
    
    try {
      console.log(`WorkerDivisionsManager: Assigning division ${divisionId} to worker ${workerId}`);
      const success = await assignDivision(divisionId);
      
      if (success) {
        console.log('Division assigned successfully in the UI');
        // Force a refresh of the worker divisions data
        await refreshData();
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן היה להקצות את המחלקה",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in handleAssignDivision:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהקצאת המחלקה",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [divisionId]: false }));
    }
  };

  const handleRemoveDivision = async (divisionId: string) => {
    setRemoving(prev => ({ ...prev, [divisionId]: true }));
    
    try {
      console.log(`WorkerDivisionsManager: Removing division ${divisionId} from worker ${workerId}`);
      const success = await removeDivision(divisionId);
      
      if (success) {
        console.log('Division removed successfully in the UI');
        // Force a refresh of the worker divisions data
        await refreshData();
      } else {
        toast({
          title: "שגיאה",
          description: "לא ניתן היה להסיר את המחלקה",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in handleRemoveDivision:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בהסרת המחלקה",
        variant: "destructive",
      });
    } finally {
      setRemoving(prev => ({ ...prev, [divisionId]: false }));
    }
  };

  if (divisionsLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        שגיאה בטעינת נתוני מחלקות: {error}
      </div>
    );
  }

  const workerDivisionIds = workerDivisions.map(div => div.id);
  console.log(`Worker ${workerId} has divisions: ${JSON.stringify(workerDivisionIds)}`);

  return (
    <Card className="mt-4">
      <CardContent className="pt-6">
        <h3 className="text-lg font-medium mb-4">שיוך מחלקות</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {divisions.map((division) => {
            const isAssigned = isDivisionAssigned(division.id);
            const translatedName = getDivisionTranslation(division.name);
            const isActionLoading = loading[division.id] || removing[division.id];
            
            return (
              <div 
                key={division.id} 
                className="flex justify-between items-center p-3 border rounded-md"
              >
                <div>
                  <div className="font-medium">{translatedName}</div>
                  {division.description && (
                    <div className="text-sm text-gray-500">{division.description}</div>
                  )}
                </div>
                
                <Button
                  variant={isAssigned ? "destructive" : "default"}
                  size="sm"
                  disabled={isActionLoading}
                  onClick={() => isAssigned 
                    ? handleRemoveDivision(division.id)
                    : handleAssignDivision(division.id)
                  }
                >
                  {isActionLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isAssigned ? "הסר" : "הוסף"}
                </Button>
              </div>
            );
          })}
          
          {divisions.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              אין מחלקות זמינות
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkerDivisionsManager;
