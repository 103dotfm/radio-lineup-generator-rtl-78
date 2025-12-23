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
      name: formState.name.trim(),
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
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
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
            {/* Form fields with improved mobile layout */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                <label className="text-sm font-medium text-right sm:col-span-1">שם:</label>
                <Input
                  value={formState.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="sm:col-span-3"
                  placeholder="שם הפריט"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                <label className="text-sm font-medium text-right sm:col-span-1">כותרת:</label>
                <Input
                  value={formState.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="sm:col-span-3"
                  placeholder="כותרת הפריט"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                <label className="text-sm font-medium text-right sm:col-span-1">טלפון:</label>
                <Input
                  value={formState.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="sm:col-span-3"
                  placeholder="מספר טלפון"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 items-center">
                <label className="text-sm font-medium text-right sm:col-span-1">משך (דקות):</label>
                <Input
                  type="number"
                  value={formState.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                  className="sm:col-span-3"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Details editor with improved mobile layout */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-right block">פרטים:</label>
              <div className="border rounded-md">
                <BasicEditor
                  content={formState.details}
                  onChange={(content) => handleInputChange('details', content)}
                  placeholder="הוסף פרטים על הפריט..."
                />
              </div>
            </div>

            {/* Action buttons with improved mobile layout */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-4">
              <Button 
                onClick={handleSave} 
                className="w-full sm:w-auto"
                disabled={!formState.name.trim()}
              >
                שמור
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>שינויים לא נשמרו</AlertDialogTitle>
            <AlertDialogDescription>
              יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedDialog(false)}>
              המשך עריכה
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowUnsavedDialog(false);
              onOpenChange(false);
            }}>
              צא ללא שמירה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditItemDialog;
