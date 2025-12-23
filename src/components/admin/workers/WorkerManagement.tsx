import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WorkerTable from './WorkerTable';
import WorkerDialog from './WorkerDialog';
import { useToast } from "@/hooks/use-toast";
import { useWorkers } from '@/hooks/useWorkers';
import { Worker, createWorker, updateWorker, deleteWorker } from '@/lib/supabase/workers';

import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

import { api } from '@/lib/api-client';

const WorkerManagement = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
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
  
  const loadWorkers = async () => {
    setLoading(true);
    try {
      const { data, error } = await api.query('/workers');
      if (error) throw error;
      console.log('API response for workers:', data);
      if (data && Array.isArray(data.data)) {
        setWorkers(data.data);
      } else if (data && Array.isArray(data)) {
        setWorkers(data);
      } else {
        console.log('No valid data returned from workers query');
        setWorkers([]);
      }
    } catch (err) {
      console.error('Error loading workers:', err);
      setError(err instanceof Error ? err : new Error('Failed to load workers'));
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת רשימת העובדים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadWorkers();
  }, []);
  
  // Removed legacy scroll lock logic tied to undefined selectedWorker
  
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
        const { data, error } = await api.mutate(`/workers/${editingWorker.id}`, formData, 'PUT');
        if (error) throw error;
        toast({
          title: "עודכן בהצלחה",
          description: "פרטי העובד עודכנו בהצלחה",
        });
      } else {
        const { data, error } = await api.mutate('/workers', formData, 'POST');
        if (error) throw error;
        toast({
          title: "נוסף בהצלחה",
          description: "העובד נוסף בהצלחה",
        });
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
        const { error } = await api.mutate(`/workers/${id}`, {}, 'DELETE');
        if (error) throw error;
        toast({
          title: "נמחק בהצלחה",
          description: "העובד נמחק בהצלחה",
        });
        loadWorkers();
        if (editingWorker?.id === id) {
          setEditingWorker(null);
          setDialogOpen(false);
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
  

  
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleCreateUserAccount = async (email: string) => {
    if (!editingWorker) return;
    
    try {
      setIsCreatingUser(true);
      console.log(`Creating user account for worker ${editingWorker.name} with email ${email}`);
      
      // Show loading toast
      toast({
        title: "יוצר חשבון משתמש...",
        description: `עבור ${editingWorker.name}`,
      });
      
      const { data, error } = await api.mutate(`/workers/${editingWorker.id}/create-user`, { email }, 'POST');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "משתמש נוצר בהצלחה",
          description: `סיסמה זמנית: ${data.password}`,
        });
        await loadWorkers(); // Refresh data with await
        
        // Update the form data to reflect the new user account
        setFormData(prev => ({
          ...prev,
          user_id: data.user_id || 'temp-user-id', // This will be updated when we reload
          email: email
        }));
      } else {
        console.error("Failed to create user account:", data);
        let errorDescription = data.message || "שגיאה ביצירת משתמש";
        toast({
          title: "שגיאה",
          description: errorDescription,
          variant: "destructive",
        });
        throw new Error(errorDescription);
      }
    } catch (error) {
      console.error('Error creating user account:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה ביצירת חשבון משתמש",
        variant: "destructive",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };
  
  const handleResetPassword = async () => {
    if (!editingWorker) return;
    
    try {
      setIsResettingPassword(true);
      console.log(`Resetting password for worker ${editingWorker.name}`);
      
      // Show loading toast
      toast({
        title: "מאפס סיסמה...",
        description: `עבור ${editingWorker.name}`,
      });
      
      const { data, error } = await api.mutate(`/workers/${editingWorker.id}/reset-password`, {}, 'POST');
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "סיסמה אופסה",
          description: `סיסמה חדשה: ${data.password}`,
        });
        await loadWorkers(); // Refresh data with await
        
        // Password is now only shown once in the toast, not stored in form data
      } else {
        console.error("Failed to reset password:", data);
        let errorDescription = data.message || "שגיאה באיפוס סיסמה";
        toast({
          title: "שגיאה",
          description: errorDescription,
          variant: "destructive",
        });
        throw new Error(errorDescription);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה באיפוס סיסמה",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
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
        onCreateUserAccount={handleCreateUserAccount}
        onResetPassword={handleResetPassword}
        isCreatingUser={isCreatingUser}
        isResettingPassword={isResettingPassword}
        dialogTitle={editingWorker ? 'עריכת עובד' : 'הוספת עובד חדש'}
        submitLabel={editingWorker ? 'עדכון' : 'הוספה'}
      />
    </div>
  );
};

export default WorkerManagement;
