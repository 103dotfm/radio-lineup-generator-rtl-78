import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkerTable from './WorkerTable';
import WorkerDialog from './WorkerDialog';
import { useToast } from "@/hooks/use-toast";
import { useWorkers } from '@/hooks/useWorkers';
import { Worker, createWorker, updateWorker, deleteWorker } from '@/lib/supabase/workers';
import { createProducerUser, resetProducerPassword } from '@/lib/supabase/producers';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import WorkerDivisionsTab from './WorkerDivisionsTab';
import WorkerAccountTab from './WorkerAccountTab';
import UserManagement from '@/components/admin/user-management/UserManagement';
import { useScroll } from '@/contexts/ScrollContext';

const WorkerManagement = () => {
  const { workers, loading, error, loadWorkers } = useWorkers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [activeTab, setActiveTab] = useState<string>("list");
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    photo_url: ''
  });
  
  const { toast } = useToast();
  const { saveScrollPosition, setIsScrollLocked } = useScroll();
  
  // Prevent scroll jump when selecting a worker
  useEffect(() => {
    if (selectedWorker) {
      setIsScrollLocked(true);
      setTimeout(() => {
        setIsScrollLocked(false);
      }, 100);
    }
  }, [selectedWorker, setIsScrollLocked]);
  
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
          if (selectedWorker?.id === id) {
            setSelectedWorker(null);
            setActiveTab("list");
          }
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
    // Save the current scroll position before changing the view
    saveScrollPosition();
    
    // Set the selected worker and change tab
    setSelectedWorker(worker);
    setActiveTab("divisions");
  };
  
  const handleCreateUserAccount = async (email: string) => {
    if (!selectedWorker) return;
    
    try {
      console.log(`Creating user account for worker ${selectedWorker.name} with email ${email}`);
      const result = await createProducerUser(selectedWorker.id, email);
      
      if (result.success) {
        toast({
          title: "משתמש נוצר בהצלחה",
          description: `סיסמה זמנית: ${result.password}`,
        });
        loadWorkers();
      } else {
        console.error("Failed to create user account:", result);
        
        // Display more detailed error if available
        const errorDescription = result.details 
          ? `${result.message} - ${JSON.stringify(result.details)}`
          : result.message || "שגיאה ביצירת משתמש";
        
        toast({
          title: "שגיאה",
          description: errorDescription,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating user account:', error);
      toast({
        title: "שגיאה",
        description: `שגיאה ביצירת משתמש: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };
  
  const handleResetPassword = async () => {
    if (!selectedWorker) return;
    
    try {
      console.log(`Resetting password for worker ${selectedWorker.name}`);
      const result = await resetProducerPassword(selectedWorker.id);
      
      if (result.success) {
        toast({
          title: "איפוס סיסמה בוצע בהצלחה",
          description: `סיסמה חדשה: ${result.password}`,
        });
      } else {
        console.error("Failed to reset password:", result);
        
        // Display more detailed error if available
        const errorDescription = result.details 
          ? `${result.message} - ${JSON.stringify(result.details)}`
          : result.message || "שגיאה באיפוס סיסמה";
        
        toast({
          title: "שגיאה",
          description: errorDescription,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "שגיאה",
        description: `שגיאה באיפוס סיסמה: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>ניהול עובדים</CardTitle>
          {activeTab === "list" && (
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              הוספת עובד
            </Button>
          )}
          {activeTab !== "list" && activeTab !== "users" && selectedWorker && (
            <div className="flex items-center">
              <span className="mr-2 font-medium">עובד נבחר: {selectedWorker.name}</span>
              <Button variant="outline" onClick={() => {
                setSelectedWorker(null);
                setActiveTab("list");
              }}>
                חזרה לרשימה
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="list">רשימת עובדים</TabsTrigger>
              <TabsTrigger value="users">ניהול משתמשים</TabsTrigger>
              {selectedWorker && (
                <>
                  <TabsTrigger value="divisions">שיוך מחלקות</TabsTrigger>
                  <TabsTrigger value="account">חשבון משתמש</TabsTrigger>
                </>
              )}
            </TabsList>
            
            <TabsContent value="list">
              <WorkerTable 
                workers={workers}
                loading={loading}
                error={error}
                onEdit={handleOpenDialog}
                onDelete={handleDeleteWorker}
                onSelect={handleWorkerSelect}
              />
            </TabsContent>
            
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
            
            {selectedWorker && (
              <>
                <TabsContent value="divisions">
                  <WorkerDivisionsTab 
                    key={`divisions-${selectedWorker.id}`} 
                    workerId={selectedWorker.id} 
                  />
                </TabsContent>
                
                <TabsContent value="account">
                  <WorkerAccountTab 
                    worker={selectedWorker}
                    onCreateAccount={handleCreateUserAccount}
                    onResetPassword={handleResetPassword}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
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

export default WorkerManagement;
