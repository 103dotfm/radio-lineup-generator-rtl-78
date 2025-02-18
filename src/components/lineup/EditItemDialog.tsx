
import React, { useEffect, useState } from 'react';
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
  const [formState, setFormState] = useState({
    name: '',
    title: '',
    phone: '',
    duration: 0,
    details: ''
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  useEffect(() => {
    if (open && item) {
      setFormState({
        name: item.name || '',
        title: item.title || '',
        phone: item.phone || '',
        duration: item.duration || 0,
        details: item.details || ''
      });
      setHasChanges(false);
    }
  }, [item, open]);

  useEffect(() => {
    if (!open) return;

    const hasEdits = 
      formState.name !== (item.name || '') ||
      formState.title !== (item.title || '') ||
      formState.phone !== (item.phone || '') ||
      formState.duration !== (item.duration || 0) ||
      formState.details !== (item.details || '');
    
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
    setFormState(prev => ({ ...prev, [field]: value }));
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
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="py-2">
                    <label className="text-sm font-medium">שם</label>
                    <Input 
                      value={formState.name} 
                      onChange={(e) => handleInputChange('name', e.target.value)} 
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <label className="text-sm font-medium">קרדיט</label>
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
                    <label className="text-sm font-medium">פרטים</label>
                    <BasicEditor
                      content={formState.details}
                      onChange={(html) => handleInputChange('details', html)}
                      className="min-h-[100px]"
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
