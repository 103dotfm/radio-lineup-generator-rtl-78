
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { Worker, createWorker, updateWorker, deleteWorker } from '@/lib/supabase/workers';
import { useToast } from "@/hooks/use-toast";
import { useWorkers } from '@/hooks/useWorkers';
import WorkerTable from './workers/WorkerTable';
import WorkerDialog from './workers/WorkerDialog';
import { assignDivisionToWorker, removeDivisionFromWorker } from '@/lib/supabase/divisions';

const emptyFormData = {
  name: '',
  department: '',
  position: '',
  email: '',
  phone: '',
  photo_url: ''
};

const WorkersManagement = () => {
  const { workers, loading, error, loadWorkers } = useWorkers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  
  const { toast } = useToast();
  
  const handleOpenDialog = useCallback((worker?: Worker) => {
    if (worker) {
      setEditingWorker(worker);
      setFormData({
        name: worker.name,
        department: worker.department || '',
        position: worker.position || '',
        email: worker.email || '',
        phone: worker.phone || '',
        photo_url: worker.photo_url || ''
      });
    } else {
      setEditingWorker(null);
      setFormData(emptyFormData);
    }
    setDialogOpen(true);
  }, []);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleSubmit = async (selectedDivisions: string[] = []) => {
    try {
      if (!formData.name.trim()) {
        toast({
          title: "שגיאה",
          description: "יש להזין שם עובד",
          variant: "destructive",
        });
        return;
      }
      
      let workerId: string;
      
      if (editingWorker) {
        const updated = await updateWorker(editingWorker.id, formData);
        if (!updated) {
          throw new Error("Failed to update worker");
        }
        
        workerId = editingWorker.id;
        toast({
          title: "עודכן בהצלחה",
          description: "פרטי העובד עודכנו בהצלחה",
        });
      } else {
        const created = await createWorker(formData);
        if (!created || !created.id) {
          throw new Error("Failed to create worker");
        }
        
        workerId = created.id;
        toast({
          title: "נוסף בהצלחה",
          description: "העובד נוסף בהצלחה",
        });
      }
      
      // Now update the worker's divisions if we have a worker ID
      if (workerId) {
        // Process each selected division
        try {
          // Clear cached division data for this worker
          sessionStorage.removeItem(`worker-divisions-${workerId}`);
          
          // For performance, get the existing worker divisions and determine what needs to be added/removed
          for (const divisionId of selectedDivisions) {
            await assignDivisionToWorker(workerId, divisionId);
          }
        } catch (error) {
          console.error('Error updating worker divisions:', error);
          toast({
            title: "אזהרה",
            description: "עובד נוצר אך הייתה בעיה בהקצאת מחלקות",
            variant: "destructive",
          });
        }
      }
      
      // Clear cached data for workers to ensure fresh data on reload
      sessionStorage.removeItem('all-worker-divisions');
      
      setDialogOpen(false);
      loadWorkers();
    } catch (error) {
      console.error('Error saving worker:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשמירת העובד",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteWorker = async (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את העובד?')) {
      try {
        const success = await deleteWorker(id);
        if (success) {
          // Clear cached data
          sessionStorage.removeItem(`worker-divisions-${id}`);
          sessionStorage.removeItem('all-worker-divisions');
          
          toast({
            title: "נמחק בהצלחה",
            description: "העובד נמחק בהצלחה",
          });
          loadWorkers();
        } else {
          throw new Error("Failed to delete worker");
        }
      } catch (error) {
        console.error('Error deleting worker:', error);
        toast({
          title: "שגיאה",
          description: "שגיאה במחיקת העובד",
          variant: "destructive",
        });
      }
    }
  };

  const handleWorkerSelect = (worker: Worker) => {
    console.log("Worker selected in WorkersManagement:", worker.name);
  };
  
  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>ניהול עובדים</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            הוספת עובד
          </Button>
        </CardHeader>
        <CardContent>
          <WorkerTable 
            workers={workers}
            loading={loading}
            error={error}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteWorker}
            onSelect={handleWorkerSelect}
          />
        </CardContent>
      </Card>
      
      <WorkerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingWorker={editingWorker}
        formData={formData}
        onFormChange={handleInputChange}
        onSubmit={handleSubmit}
        dialogTitle={editingWorker ? 'עריכת עובד' : 'הוספת עובד חדש'}
        submitLabel={editingWorker ? 'עדכון' : 'הוספה'}
      />
    </div>
  );
};

export default React.memo(WorkersManagement);
