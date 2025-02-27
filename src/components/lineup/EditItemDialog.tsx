
import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from 'lucide-react';
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
  // Use refs to preserve state across re-renders from tab switching
  const formStateRef = useRef({
    name: '',
    title: '',
    phone: '',
    duration: 0,
    details: ''
  });
  
  // State for UI updates
  const [formState, setFormState] = useState({ ...formStateRef.current });
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  
  // Track if the dialog is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  // Initialize form state when dialog opens or item changes
  useEffect(() => {
    if (open && item) {
      const newState = {
        name: item.name || '',
        title: item.title || '',
        phone: item.phone || '',
        duration: item.duration || 0,
        details: item.details || ''
      };
      
      formStateRef.current = newState;
      setFormState(newState);
      setHasChanges(false);
    }
  }, [item, open]);

  // Track mount status
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Check for changes (comparing to the initial state)
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
    // Update both state and ref to ensure persistence
    setFormState(prev => {
      const newState = { ...prev, [field]: value };
      formStateRef.current = newState;
      return newState;
    });
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
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-1/2 text-right">
                      <label className="text-sm font-medium">שם</label>
                    </th>
                    <th className="w-1/2 text-right pr-4">
                      <label className="text-sm font-medium">קרדיט</label>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2">
                      <Input 
                        value={formState.name} 
                        onChange={(e) => handleInputChange('name', e.target.value)} 
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <Input 
                        value={formState.title} 
                        onChange={(e) => handleInputChange('title', e.target.value)} 
                      />
                    </td>
                  </tr>
                  {item.interviewees?.map((interviewee) => (
                    <tr key={interviewee.id}>
                      <td className="py-2">
                        <Input 
                          value={interviewee.name} 
                          disabled
                          className="bg-gray-50"
                        />
                      </td>
                      <td className="py-2 pr-4">
                        <Input 
                          value={interviewee.title} 
                          disabled
                          className="bg-gray-50"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} className="py-2">
                      <label className="text-sm font-medium text-right block">פרטים</label>
                      <BasicEditor
                        content={formState.details}
                        onChange={(html) => handleInputChange('details', html)}
                        className="min-h-[100px]"
                        align="right"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">
                      <label className="text-sm font-medium">טלפון</label>
                      <Input 
                        value={formState.phone} 
                        onChange={(e) => handleInputChange('phone', e.target.value)} 
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <label className="text-sm font-medium">משך בדקות</label>
                      <Input
                        type="number"
                        min="1"
                        value={formState.duration}
                        onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 5)}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={handleClose} variant="outline">ביטול</Button>
              <Button onClick={handleSave} disabled={!hasChanges}>שמור</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>שינויים לא שמורים</AlertDialogTitle>
            <AlertDialogDescription>
              יש לך שינויים שלא נשמרו. האם ברצונך לשמור אותם לפני הסגירה?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUnsavedDialog(false);
              onOpenChange(false);
            }}>
              התעלם משינויים
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              handleSave();
              setShowUnsavedDialog(false);
            }}>
              שמור שינויים
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditItemDialog;
