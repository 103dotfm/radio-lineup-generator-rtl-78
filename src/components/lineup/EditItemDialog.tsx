import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Edit2, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BasicEditor from '../editor/BasicEditor';
import { Interviewee } from '@/types/show';

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    title: string;
    details: string;
    phone: string;
    duration: number;
    interviewees?: Interviewee[];
  };
  onSave: (updatedItem: any) => void;
}

const EditItemDialog = ({ open, onOpenChange, item, onSave }: EditItemDialogProps) => {
  const formDataRef = useRef({
    name: item?.name || '',
    title: item?.title || '',
    phone: item?.phone || '',
    duration: item?.duration || 0,
    details: item?.details || ''
  });

  const [formState, setFormState] = useState(formDataRef.current);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  useEffect(() => {
    if (open && item) {
      const initialState = {
        name: item.name || '',
        title: item.title || '',
        phone: item.phone || '',
        duration: item.duration || 0,
        details: item.details || ''
      };
      
      formDataRef.current = initialState;
      setFormState(initialState);
      setHasChanges(false);
    }
  }, [open, item?.id]);

  useEffect(() => {
    if (!open) return;
    
    const initialState = {
      name: item.name || '',
      title: item.title || '',
      phone: item.phone || '',
      duration: item.duration || 0,
      details: item.details || ''
    };

    const hasEdits = 
      formState.name !== initialState.name ||
      formState.title !== initialState.title ||
      formState.phone !== initialState.phone ||
      formState.duration !== initialState.duration ||
      formState.details !== initialState.details;
    
    setHasChanges(hasEdits);
  }, [formState, item, open]);

  const handleClose = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleSave = () => {
    const updatedItem = {
      ...item,
      name: formState.name,
      title: formState.title,
      phone: formState.phone,
      duration: formState.duration,
      details: formState.details,
      interviewees: item.interviewees || []
    };
    
    onSave(updatedItem);
    setHasChanges(false);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string | number) => {
    formDataRef.current = {
      ...formDataRef.current,
      [field]: value
    };
    
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditInterviewee = (intervieweeId: string, updatedData: Partial<Interviewee>) => {
    console.log('Edit interviewee:', intervieweeId, updatedData);
  };

  const handleDeleteInterviewee = (intervieweeId: string) => {
    console.log('Delete interviewee:', intervieweeId);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[90vw] max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת פריט</DialogTitle>
            <button 
              onClick={handleClose}
              className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="w-full">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-right pb-2">
                      <label className="text-sm font-medium">שם</label>
                    </th>
                    <th className="text-right pb-2">
                      <label className="text-sm font-medium">קרדיט</label>
                    </th>
                    <th className="text-right pb-2">
                      <label className="text-sm font-medium">טלפון</label>
                    </th>
                    <th className="w-[80px]"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">
                      <Input 
                        value={formState.name} 
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="text-base" 
                      />
                    </td>
                    <td className="py-2 pl-2">
                      <Input 
                        value={formState.title} 
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="text-base" 
                      />
                    </td>
                    <td className="py-2 pl-2">
                      <Input 
                        value={formState.phone} 
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="text-base" 
                      />
                    </td>
                    <td></td>
                  </tr>
                  {item.interviewees?.map((interviewee) => (
                    <tr key={interviewee.id} className="border-t">
                      <td className="py-2">
                        <div className="text-base">{interviewee.name}</div>
                      </td>
                      <td className="py-2 pl-2">
                        <div className="text-base">{interviewee.title}</div>
                      </td>
                      <td className="py-2 pl-2">
                        <div className="text-base">{interviewee.phone}</div>
                      </td>
                      <td className="py-2 pl-2">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditInterviewee(interviewee.id, {
                              name: prompt('שם חדש:', interviewee.name) || interviewee.name,
                              title: prompt('תפקיד חדש:', interviewee.title) || interviewee.title,
                              phone: prompt('טלפון חדש:', interviewee.phone) || interviewee.phone,
                            })}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleDeleteInterviewee(interviewee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4">
                <label className="text-sm font-medium text-right block mb-2">פרטים</label>
                <BasicEditor
                  content={formState.details}
                  onChange={(html) => handleInputChange('details', html)}
                  align="right"
                />
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium">משך בדקות</label>
                <Input
                  type="number"
                  min="1"
                  value={formState.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 5)}
                  className="w-24"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={handleClose} variant="outline">ביטול</Button>
              <Button onClick={handleSave} disabled={!hasChanges}>שמור</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>לסגור בלי לשמור?</AlertDialogTitle>
            <AlertDialogDescription>
              יש שינויים שלא נשמרו. האם אתה בטוח שברצונך לסגור את החלון בלי לשמור?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedDialog(false)}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowUnsavedDialog(false);
              onOpenChange(false);
            }} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">
              סגור בלי לשמור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditItemDialog;
