
import React, { useState } from 'react';
import { Worker } from '@/lib/supabase/workers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createProducerUser, resetProducerPassword } from "@/lib/supabase/producers";
import WorkerDivisionsManager from './WorkerDivisionsManager';
import { UserIcon, Key, Mail, AtSign } from 'lucide-react';

interface WorkerDetailDialogProps {
  worker: Worker | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WorkerDetailDialog: React.FC<WorkerDetailDialogProps> = ({ worker, open, onOpenChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!worker) return null;

  const handleCreateUser = async () => {
    if (!worker.email) {
      toast({
        title: "שגיאה",
        description: "יש להזין אימייל לעובד לפני יצירת משתמש",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const result = await createProducerUser(worker.id, worker.email);
      
      if (result.success) {
        toast({
          title: "משתמש נוצר בהצלחה",
          description: `הסיסמה הזמנית: ${result.password}`,
        });
      } else {
        toast({
          title: "שגיאה",
          description: result.message || "אירעה שגיאה ביצירת המשתמש",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה ביצירת המשתמש",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!worker.user_id) {
      toast({
        title: "שגיאה",
        description: "לעובד זה אין חשבון משתמש",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const result = await resetProducerPassword(worker.id);
      
      if (result.success) {
        toast({
          title: "סיסמה אופסה בהצלחה",
          description: `הסיסמה החדשה: ${result.password}`,
        });
      } else {
        toast({
          title: "שגיאה",
          description: result.message || "אירעה שגיאה באיפוס הסיסמה",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה באיפוס הסיסמה",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{worker.name}</DialogTitle>
          <DialogDescription>{worker.position || worker.department}</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-6 py-4">
          <div className="col-span-1 flex flex-col items-center space-y-3">
            <Avatar className="h-24 w-24">
              <AvatarImage src={worker.photo_url} />
              <AvatarFallback className="text-2xl">
                {worker.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h3 className="font-semibold">{worker.name}</h3>
              <p className="text-sm text-gray-500">{worker.position || ''}</p>
              <p className="text-sm text-gray-500">{worker.department || ''}</p>
            </div>
            
            {worker.user_id ? (
              <Button 
                onClick={handleResetPassword} 
                className="w-full"
                disabled={isLoading}
              >
                <Key className="mr-2 h-4 w-4" />
                איפוס סיסמה
              </Button>
            ) : (
              <Button 
                onClick={handleCreateUser} 
                className="w-full"
                disabled={isLoading || !worker.email}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                יצירת משתמש
              </Button>
            )}
          </div>
          
          <div className="col-span-2">
            <Tabs defaultValue="contact">
              <TabsList className="w-full">
                <TabsTrigger value="contact">פרטי קשר</TabsTrigger>
                <TabsTrigger value="divisions">מחלקות</TabsTrigger>
              </TabsList>
              
              <TabsContent value="contact" className="pt-4">
                <div className="space-y-3">
                  {worker.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{worker.email}</span>
                    </div>
                  )}
                  
                  {worker.phone && (
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-500">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span>{worker.phone}</span>
                    </div>
                  )}
                  
                  {worker.user_id && (
                    <div className="flex items-center gap-2">
                      <AtSign className="h-4 w-4 text-gray-500" />
                      <span>יש חשבון משתמש</span>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="divisions" className="pt-4">
                <WorkerDivisionsManager workerId={worker.id} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkerDetailDialog;
