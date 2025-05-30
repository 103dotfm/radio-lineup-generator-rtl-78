
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { Worker, createWorker, updateWorker, deleteWorker } from '@/lib/supabase/workers';
import { useToast } from "@/hooks/use-toast";
import { useWorkers } from '@/hooks/useWorkers';
import WorkerTable from './workers/WorkerTable';
import WorkerDialog from './workers/WorkerDialog';

const StaffManagement = () => {
  const { workers, loading, error, loadWorkers } = useWorkers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    photo_url: ''
  });
  
  const { toast } = useToast();
  
  const handleOpenDialog = (worker?: Worker) => {
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
      setFormData({
        name: '',
        department: '',
        position: '',
        email: '',
        phone: '',
        photo_url: ''
      });
    }
    setDialogOpen(true);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        toast({
          title: "שגיאה",
          description: "יש להזין שם עובד",
          variant: "destructive",
        });
        return;
      }
      
      if (editingWorker) {
        const updated = await updateWorker(editingWorker.id, formData);
        if (updated) {
          toast({
            title: "עודכן בהצלחה",
            description: "פרטי העובד עודכנו בהצלחה",
          });
        } else {
          throw new Error("Failed to update worker");
        }
      } else {
        const created = await createWorker(formData);
        if (created) {
          toast({
            title: "נוסף בהצלחה",
            description: "העובד נוסף בהצלחה",
          });
        } else {
          throw new Error("Failed to create worker");
        }
      }
      
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

  // Add a no-op select handler since we don't need worker selection in this component
  const handleWorkerSelect = (worker: Worker) => {
    // No action needed in this component
    console.log("Worker selected in StaffManagement:", worker.name);
  };
  
  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>ניהול צוות</CardTitle>
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

export default StaffManagement;
