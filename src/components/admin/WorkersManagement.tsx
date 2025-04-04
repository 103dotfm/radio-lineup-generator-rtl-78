
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getWorkers, createWorker, updateWorker, deleteWorker } from '@/lib/supabase/workers';
import { Worker } from '@/components/schedule/workers/WorkerSelector';

const WorkersManagement = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [currentWorker, setCurrentWorker] = useState<Worker | null>(null);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { toast } = useToast();
  
  useEffect(() => {
    loadWorkers();
  }, []);
  
  const loadWorkers = async () => {
    setIsLoading(true);
    try {
      const fetchedWorkers = await getWorkers();
      setWorkers(fetchedWorkers);
    } catch (error) {
      console.error('Error loading workers:', error);
      toast({
        title: "שגיאה בטעינת עובדים",
        description: "אירעה שגיאה בעת טעינת רשימת העובדים",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddWorker = () => {
    setDialogMode('add');
    setCurrentWorker(null);
    resetForm();
    setShowDialog(true);
  };
  
  const handleEditWorker = (worker: Worker) => {
    setDialogMode('edit');
    setCurrentWorker(worker);
    setName(worker.name);
    setDepartment(worker.department || '');
    setPosition(worker.position || '');
    setEmail(''); // Add email field if it exists in the worker object
    setPhone(''); // Add phone field if it exists in the worker object
    setShowDialog(true);
  };
  
  const resetForm = () => {
    setName('');
    setDepartment('');
    setPosition('');
    setEmail('');
    setPhone('');
  };
  
  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "שם נדרש",
        description: "נא להזין שם לעובד",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (dialogMode === 'add') {
        const newWorker = await createWorker({
          name,
          department,
          position
        });
        
        if (newWorker) {
          setWorkers([...workers, newWorker]);
          toast({
            title: "העובד נוסף בהצלחה",
            description: `העובד ${name} נוסף בהצלחה`
          });
        }
      } else if (dialogMode === 'edit' && currentWorker) {
        const updatedWorker = await updateWorker(currentWorker.id, {
          name,
          department,
          position
        });
        
        if (updatedWorker) {
          setWorkers(workers.map(w => w.id === updatedWorker.id ? updatedWorker : w));
          toast({
            title: "העובד עודכן בהצלחה",
            description: `העובד ${name} עודכן בהצלחה`
          });
        }
      }
      
      setShowDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving worker:', error);
      toast({
        title: "שגיאה בשמירת העובד",
        description: "אירעה שגיאה בעת שמירת פרטי העובד",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteWorker = async (worker: Worker) => {
    if (!confirm(`האם למחוק את העובד ${worker.name}?`)) return;
    
    try {
      const success = await deleteWorker(worker.id);
      
      if (success) {
        setWorkers(workers.filter(w => w.id !== worker.id));
        toast({
          title: "העובד נמחק בהצלחה",
          description: `העובד ${worker.name} נמחק בהצלחה`
        });
      }
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast({
        title: "שגיאה במחיקת העובד",
        description: "אירעה שגיאה בעת מחיקת העובד",
        variant: "destructive"
      });
    }
  };
  
  // Filter workers based on search query
  const filteredWorkers = workers.filter(worker => 
    worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (worker.department && worker.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (worker.position && worker.position.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>ניהול עובדים</CardTitle>
        <CardDescription>הוספה, עריכה ומחיקה של עובדים במערכת</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="חיפוש עובדים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-right"
              dir="rtl"
            />
          </div>
          <Button onClick={handleAddWorker} className="mr-2">
            <PlusCircle className="ml-2 h-4 w-4" />
            הוספת עובד
          </Button>
        </div>
        
        {isLoading ? (
          <div className="text-center p-4">טוען עובדים...</div>
        ) : filteredWorkers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right">מחלקה</TableHead>
                <TableHead className="text-right">תפקיד</TableHead>
                <TableHead className="w-24">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkers.map((worker) => (
                <TableRow key={worker.id}>
                  <TableCell className="text-right font-medium">{worker.name}</TableCell>
                  <TableCell className="text-right">{worker.department || '-'}</TableCell>
                  <TableCell className="text-right">{worker.position || '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2 space-x-reverse justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEditWorker(worker)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteWorker(worker)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center p-4 border rounded-md bg-gray-50">
            {searchQuery ? 'לא נמצאו עובדים התואמים את החיפוש' : 'אין עובדים במערכת'}
          </div>
        )}
        
        {/* Add/Edit Worker Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{dialogMode === 'add' ? 'הוספת עובד חדש' : 'עריכת פרטי עובד'}</DialogTitle>
              <DialogDescription>
                {dialogMode === 'add' 
                  ? 'הוסף עובד חדש למערכת'
                  : 'ערוך את פרטי העובד הקיים'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם העובד</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="הזן שם מלא"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">מחלקה</Label>
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="הזן מחלקה"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">תפקיד</Label>
                <Input
                  id="position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="הזן תפקיד"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="הזן אימייל"
                  type="email"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="הזן טלפון"
                  className="text-right"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                ביטול
              </Button>
              <Button onClick={handleSave}>
                {dialogMode === 'add' ? 'הוספה' : 'עדכון'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default WorkersManagement;
