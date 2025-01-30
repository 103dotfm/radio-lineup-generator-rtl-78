import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Editor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { X } from 'lucide-react';
import { useEditor } from '@tiptap/react';
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
  const [name, setName] = useState(item.name);
  const [title, setTitle] = useState(item.title);
  const [phone, setPhone] = useState(item.phone);
  const [duration, setDuration] = useState(item.duration);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: item.details,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[100px] p-4 bg-white border border-input rounded-md',
      },
    },
  });

  useEffect(() => {
    if (editor && item.details) {
      editor.commands.setContent(item.details);
    }
    setName(item.name);
    setTitle(item.title);
    setPhone(item.phone);
    setDuration(item.duration);
  }, [editor, item]);

  useEffect(() => {
    const hasEdits = 
      name !== item.name ||
      title !== item.title ||
      phone !== item.phone ||
      duration !== item.duration ||
      (editor && editor.getHTML() !== item.details);
    setHasChanges(hasEdits);
  }, [name, title, phone, duration, editor, item]);

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
      name,
      title,
      details: editor?.getHTML() || '',
      phone,
      duration,
    };
    onSave(updatedItem);
    setHasChanges(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="w-[90vw] max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת פריט</DialogTitle>
            <DialogClose className="absolute left-4 top-4">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">שם</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">קרדיט</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">פרטים</label>
              <EditorContent editor={editor} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">טלפון</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">משך בדקות</label>
                <Input
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={handleClose} variant="outline">ביטול</Button>
              <Button onClick={handleSave}>שמור</Button>
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