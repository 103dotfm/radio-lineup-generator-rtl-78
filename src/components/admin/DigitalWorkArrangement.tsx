
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Worker, getWorkers, createWorker, updateWorker, deleteWorker } from '@/lib/supabase/workers';
import DigitalWorkArrangementEditor from './DigitalWorkArrangementEditor';

// Worker management component
const WorkerManagement: React.FC = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
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
    try {
      const workersList = await getWorkers();
      setWorkers(workersList);
      setLoading(false);
    } catch (error) {
      console.error('Error loading workers:', error);
      toast({
        title: "Error",
        description: "Failed to load workers",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleAddWorker = () => {
    setEditingWorker(null);
    setFormData({
      name: '',
      department: '',
      position: '',
      email: '',
      phone: ''
    });
    setDialogOpen(true);
  };

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      department: worker.department || '',
      position: worker.position || '',
      email: worker.email || '',
      phone: worker.phone || ''
    });
    setDialogOpen(true);
  };

  const handleDeleteWorker = async (id: string) => {
    try {
      const success = await deleteWorker(id);
      if (success) {
        toast({
          title: "Success",
          description: "Worker deleted successfully",
        });
        loadWorkers();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete worker",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name.trim()) {
        toast({
          title: "Error",
          description: "Worker name is required",
          variant: "destructive"
        });
        return;
      }

      if (editingWorker) {
        // Update existing worker
        const updatedWorker = await updateWorker(editingWorker.id, formData);
        if (updatedWorker) {
          toast({
            title: "Success",
            description: "Worker updated successfully",
          });
        }
      } else {
        // Create new worker
        const newWorker = await createWorker(formData);
        if (newWorker) {
          toast({
            title: "Success",
            description: "Worker added successfully",
          });
        }
      }
      
      setDialogOpen(false);
      loadWorkers();
    } catch (error) {
      console.error('Error saving worker:', error);
      toast({
        title: "Error",
        description: "Failed to save worker data",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Worker Management</h2>
        <Button onClick={handleAddWorker}>
          <Plus className="mr-2 h-4 w-4" /> Add Worker
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center p-6">Loading workers...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">No workers found</TableCell>
                  </TableRow>
                ) : (
                  workers.map(worker => (
                    <TableRow key={worker.id}>
                      <TableCell className="font-medium">{worker.name}</TableCell>
                      <TableCell>{worker.department}</TableCell>
                      <TableCell>{worker.position}</TableCell>
                      <TableCell>{worker.email}</TableCell>
                      <TableCell>{worker.phone}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditWorker(worker)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteWorker(worker.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingWorker ? 'Edit Worker' : 'Add Worker'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                Department
              </Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Position
              </Label>
              <Input
                id="position"
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
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
            <Button type="submit" onClick={handleSubmit}>
              {editingWorker ? 'Save Changes' : 'Add Worker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main component
const DigitalWorkArrangement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("schedule");

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Digital Work Arrangement</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="schedule">Schedule Editor</TabsTrigger>
          <TabsTrigger value="workers">Worker Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule">
          <DigitalWorkArrangementEditor />
        </TabsContent>
        
        <TabsContent value="workers">
          <WorkerManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DigitalWorkArrangement;
