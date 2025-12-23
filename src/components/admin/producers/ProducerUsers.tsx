
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Worker } from '@/lib/supabase/workers';
import { api } from '@/lib/api-client';

const ProducerUsers: React.FC = () => {
  const [producers, setProducers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProducer, setSelectedProducer] = useState<Worker | null>(null);
  const [email, setEmail] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProducers();
  }, []);

  const loadProducers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await api.query('/workers', 'GET');
      if (error) throw error;
      setProducers(data || []);
    } catch (error) {
      console.error("Error loading producers:", error);
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת נתוני מפיקים",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!selectedProducer || !email) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);
    
    try {
      
      const { data: result, error } = await api.mutate(`/workers/${selectedProducer.id}/create-user`, { email }, 'POST');
      if (error) throw error;
      
      if (result.success && result.password) {
        setGeneratedPassword(result.password);
        await loadProducers(); // Refresh the list
        toast({
          title: "משתמש נוצר בהצלחה",
          description: "המשתמש נוצר בהצלחה עם סיסמה זמנית"
        });
      } else {
        setErrorMessage(result.message || "שגיאה ביצירת משתמש");
        toast({
          title: "שגיאה",
          description: result.message || "שגיאה ביצירת משתמש",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      setErrorMessage(error.message || "שגיאה לא ידועה ביצירת משתמש");
      toast({
        title: "שגיאה",
        description: "שגיאה ביצירת משתמש",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async (producer: Worker) => {
    try {
      if (!producer.user_id) {
        toast({
          title: "שגיאה",
          description: "למשתמש זה אין חשבון מערכת",
          variant: "destructive"
        });
        return;
      }

      setIsCreating(true);
      setErrorMessage(null);
      
      const { data: result, error } = await api.mutate(`/workers/${producer.id}/reset-password`, {}, 'POST');
      if (error) throw error;
      
      if (result.success && result.password) {
        setSelectedProducer(producer);
        setGeneratedPassword(result.password);
        setIsDialogOpen(true);
        await loadProducers(); // Refresh the list
        toast({
          title: "סיסמה אופסה",
          description: "הסיסמה אופסה בהצלחה"
        });
      } else {
        setErrorMessage(result.message || "שגיאה באיפוס סיסמה");
        toast({
          title: "שגיאה",
          description: result.message || "שגיאה באיפוס סיסמה",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Error resetting password:", error);
      setErrorMessage(error.message || "שגיאה לא ידועה באיפוס סיסמה");
      toast({
        title: "שגיאה",
        description: "שגיאה באיפוס סיסמה",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenCreateDialog = (producer: Worker) => {
    setSelectedProducer(producer);
    setEmail(producer.email || '');
    setGeneratedPassword('');
    setErrorMessage(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedProducer(null);
    setEmail('');
    setGeneratedPassword('');
    setErrorMessage(null);
  };

  if (isLoading) {
    return <div className="text-center py-4">טוען...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">משתמשי מפיקים</h3>
      <Card>
        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>תפקיד</TableHead>
              <TableHead>אימייל</TableHead>
              <TableHead>סטטוס משתמש</TableHead>
              <TableHead>סיסמה</TableHead>
              <TableHead>פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {producers.map((producer) => (
              <TableRow key={producer.id}>
                <TableCell className="font-medium">{producer.name}</TableCell>
                <TableCell>{producer.position || '-'}</TableCell>
                <TableCell>{producer.email || '-'}</TableCell>
                <TableCell>
                  {producer.user_id ? (
                    <Badge className="bg-green-500">פעיל</Badge>
                  ) : (
                    <Badge variant="outline">לא קיים</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-gray-500">
                    מוצפן
                  </Badge>
                </TableCell>
                <TableCell>
                  {producer.user_id ? (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(producer)}
                    >
                      איפוס סיסמה
                    </Button>
                  ) : (
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenCreateDialog(producer)}
                    >
                      צור משתמש
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {producers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  לא נמצאו נתונים
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {!generatedPassword 
                ? 'יצירת משתמש מערכת למפיק' 
                : 'פרטי משתמש מערכת'}
            </DialogTitle>
            {!generatedPassword && (
              <DialogDescription>
                יש למלא את פרטי המשתמש. סיסמה תיווצר אוטומטית.
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedProducer && (
            <div className="space-y-4 py-4">
              <div>
                <p className="font-medium">{selectedProducer.name}</p>
                {selectedProducer.position && (
                  <p className="text-sm text-muted-foreground">{selectedProducer.position}</p>
                )}
              </div>
              
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>שגיאה</AlertTitle>
                  <AlertDescription>
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}
              
              {!generatedPassword ? (
                <div className="space-y-2">
                  <label htmlFor="email">אימייל:</label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="הכנס כתובת אימייל"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="font-medium">שם משתמש / אימייל:</label>
                    <p className="mt-1 p-2 border rounded bg-gray-50">{email || selectedProducer.email}</p>
                  </div>
                  <div>
                    <label className="font-medium">סיסמה:</label>
                    <p className="mt-1 p-2 border rounded bg-gray-50 font-mono">{generatedPassword}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      שמור את הסיסמה במקום בטוח. היא לא תוצג שוב.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            {!generatedPassword ? (
              <>
                <Button variant="outline" onClick={handleCloseDialog}>
                  ביטול
                </Button>
                <Button 
                  onClick={handleCreateUser} 
                  disabled={isCreating || !email}
                >
                  {isCreating ? 'יוצר משתמש...' : 'צור משתמש'}
                </Button>
              </>
            ) : (
              <Button onClick={handleCloseDialog}>סגור</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProducerUsers;
