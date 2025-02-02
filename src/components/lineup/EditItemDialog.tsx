import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from 'lucide-react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[100px] p-4 bg-white border border-input rounded-md',
      },
    },
    onUpdate: ({ editor }) => {
      setFormState(prev => ({ ...prev, details: editor.getHTML() }));
    }
  });

  // Reset form when dialog opens with new item
  useEffect(() => {
    if (open) {
      console.log('EditItemDialog: Opening with item:', item);
      setFormState({
        name: item.name,
        title: item.title,
        phone: item.phone,
        duration: item.duration,
        details: item.details || ''
      });
      if (editor) {
        editor.commands.setContent(item.details || '');
      }
    }
  }, [item, open, editor]);

  // Track changes
  useEffect(() => {
    const hasEdits = 
      formState.name !== item.name ||
      formState.title !== item.title ||
      formState.phone !== item.phone ||
      formState.duration !== item.duration ||
      formState.details !== item.details;
    
    console.log('EditItemDialog: Checking for changes:', {
      name: { current: formState.name, original: item.name },
      title: { current: formState.title, original: item.title },
      phone: { current: formState.phone, original: item.phone },
      duration: { current: formState.duration, original: item.duration },
      details: { current: formState.details, original: item.details }
    });
    
    setHasChanges(hasEdits);
  }, [formState, item]);

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
      ...formState
    };
    
    console.log('EditItemDialog: Saving item:', updatedItem);
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
        <DialogContent className="w-[90vw] max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת פריט</DialogTitle>
            <button 
              onClick={handleClose}
              className="absolute left-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">שם</label>
                <Input 
                  value={formState.name} 
                  onChange={(e) => handleInputChange('name', e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">קרדיט</label>
                <Input 
                  value={formState.title} 
                  onChange={(e) => handleInputChange('title', e.target.value)} 
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">פרטים</label>
              <EditorContent editor={editor} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">טלפון</label>
                <Input 
                  value={formState.phone} 
                  onChange={(e) => handleInputChange('phone', e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">משך בדקות</label>
                <Input
                  type="number"
                  min="1"
                  value={formState.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 5)}
                />
              </div>
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