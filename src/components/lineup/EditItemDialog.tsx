import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, X } from "lucide-react";
import { BasicEditor } from '../editor/BasicEditor';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Item } from '@/types/show';

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item;
  onSave: (updatedItem: any) => void;
}

const EditItemDialog = ({ open, onOpenChange, item, onSave }: EditItemDialogProps) => {
  const [formState, setFormState] = useState({
    name: item.name,
    title: item.title,
    details: item.details,
    phone: item.phone,
    duration: item.duration,
  });
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormState({
      name: item.name,
      title: item.title,
      details: item.details,
      phone: item.phone,
      duration: item.duration,
    });
    setHasChanges(false);
  }, [item]);

  const handleInputChange = (key: string, value: any) => {
    setFormState(prevState => ({
      ...prevState,
      [key]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(formState);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const confirmClose = () => {
    setShowUnsavedDialog(false);
    onOpenChange(false);
  };

  const handleDeleteInterviewee = (intervieweeId: string) => {
    // Placeholder for delete logic
  };

  const handleEditInterviewee = (intervieweeId: string, updatedData: Partial<any>) => {
    // Placeholder for edit logic
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
                            onClick={() => handleEditInterviewee?.(interviewee.id, {
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
                            onClick={() => handleDeleteInterviewee?.(interviewee.id)}
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
                  className="min-h-[100px]"
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
            <AlertDialogTrigger onClick={confirmClose} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">
              סגור בלי לשמור
            </AlertDialogTrigger>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditItemDialog;
