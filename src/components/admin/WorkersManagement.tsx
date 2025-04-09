
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Worker, getWorkers, createWorker, updateWorker, deleteWorker } from '@/lib/supabase/workers';
import { useToast } from "@/hooks/use-toast";

const WorkersManagement = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    position: '',
    email: '',
    phone: ''
  });
  
  const { toast } = useToast();
  
  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('WorkersManagement: Fetching workers...');
      const data = await getWorkers();
      console.log(`WorkersManagement: Fetched ${data.length} workers`);
      setWorkers(data);
    } catch (error) {
      console.error('Error fetching workers:', error);
      setError('שגיאה בטעינת רשימת העובדים');
      toast({
        title: "שגיאה",
        description: "שגיאה בטעינת רשימת העובדים",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenDialog = (worker?: Worker) => {
    if (worker) {
      setEditingWorker(worker);
      setFormData({
        name: worker.name,
        department: worker.department || '',
        position: worker.position || '',
        email: worker.email || '',
        phone: worker.phone || ''
      });
    } else {
      setEditingWorker(null);
      setFormData({
        name: '',
        department: '',
        position: '',
        email: '',
        phone: ''
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
        await updateWorker(editingWorker.id, formData);
        toast({
          title: "עודכן בהצלחה",
          description: "פרטי העובד עודכנו בהצלחה",
        });
      } else {
        await createWorker(formData);
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
        await deleteWorker(id);
        toast({
          title: "נמחק בהצלחה",
          description: "העובד נמחק בהצלחה",
        });
        loadWorkers();
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
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">מחלקה</TableHead>
                <TableHead className="text-right">תפקיד</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mb-2"></div>
                      <div>טוען נתונים...</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : workers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">אין עובדים להצגה</TableCell>
                </TableRow>
              ) : (
                workers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">{worker.name}</TableCell>
                    <TableCell>{worker.department || '-'}</TableCell>
                    <TableCell>{worker.position || '-'}</TableCell>
                    <TableCell>{worker.email || '-'}</TableCell>
                    <TableCell>{worker.phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenDialog(worker)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteWorker(worker.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingWorker ? 'עריכת עובד' : 'הוספת עובד חדש'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">שם</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">מחלקה</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">תפקיד</Label>
              <Input
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">אימייל</Label>
              <Input
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">טלפון</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="default" onClick={handleSubmit}>
              {editingWorker ? 'עדכון' : 'הוספה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkersManagement;
