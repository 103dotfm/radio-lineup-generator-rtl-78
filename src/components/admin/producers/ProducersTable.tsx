
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash } from 'lucide-react';
import { getProducers } from '@/lib/supabase/producers';
import { Worker, createWorker, updateWorker, deleteWorker } from '@/lib/supabase/workers';

const ProducersTable = () => {
  const [producers, setProducers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentProducer, setCurrentProducer] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    department: 'producers',
    position: '',
    email: '',
    phone: ''
  });
  
  const { toast } = useToast();
  
  useEffect(() => {
    loadProducers();
  }, []);
  
  const loadProducers = async () => {
    setIsLoading(true);
    try {
      const data = await getProducers();
      setProducers(data);
    } catch (error) {
      console.error('Error loading producers:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את רשימת עובדי ההפקה",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOpenDialog = (producer?: Worker) => {
    if (producer) {
      setCurrentProducer(producer);
      setFormData({
        name: producer.name,
        department: producer.department || 'producers',
        position: producer.position || '',
        email: producer.email || '',
        phone: producer.phone || ''
      });
    } else {
      setCurrentProducer(null);
      setFormData({
        name: '',
        department: 'producers',
        position: '',
        email: '',
        phone: ''
      });
    }
    setIsDialogOpen(true);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "שגיאה",
        description: "יש להזין שם עובד",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (currentProducer) {
        const updated = await updateWorker(currentProducer.id, formData);
        if (updated) {
          toast({
            title: "עודכן בהצלחה",
            description: "פרטי העובד עודכנו בהצלחה"
          });
        } else {
          throw new Error("Failed to update worker");
        }
      } else {
        const created = await createWorker(formData);
        if (created) {
          toast({
            title: "נוסף בהצלחה",
            description: "העובד נוסף בהצלחה"
          });
        } else {
          throw new Error("Failed to create worker");
        }
      }
      
      setIsDialogOpen(false);
      loadProducers();
    } catch (error) {
      console.error('Error saving producer:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשמירת העובד",
        variant: "destructive"
      });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את העובד?')) {
      try {
        const success = await deleteWorker(id);
        if (success) {
          toast({
            title: "נמחק בהצלחה",
            description: "העובד נמחק בהצלחה"
          });
          loadProducers();
        } else {
          throw new Error("Failed to delete worker");
        }
      } catch (error) {
        console.error('Error deleting producer:', error);
        toast({
          title: "שגיאה",
          description: "שגיאה במחיקת העובד",
          variant: "destructive"
        });
      }
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">עובדי הפקה ועריכה</h3>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף עובד
        </Button>
      </div>
      
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>תפקיד</TableHead>
              <TableHead>אימייל</TableHead>
              <TableHead>טלפון</TableHead>
              <TableHead className="text-left">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">טוען...</TableCell>
              </TableRow>
            ) : producers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">לא נמצאו עובדי הפקה</TableCell>
              </TableRow>
            ) : (
              producers.map(producer => (
                <TableRow key={producer.id}>
                  <TableCell>{producer.name}</TableCell>
                  <TableCell>{producer.position || '-'}</TableCell>
                  <TableCell>{producer.email || '-'}</TableCell>
                  <TableCell>{producer.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(producer)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(producer.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentProducer ? 'ערוך עובד' : 'הוסף עובד חדש'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name">שם:</label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="הזן שם"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="position">תפקיד:</label>
              <Input
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="הזן תפקיד"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email">אימייל:</label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="הזן אימייל"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="phone">טלפון:</label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="הזן טלפון"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>{currentProducer ? 'שמור שינויים' : 'הוסף עובד'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProducersTable;
