import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Editor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { X } from 'lucide-react';
import { useEditor } from '@tiptap/react';

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
  const [name, setName] = React.useState(item.name);
  const [title, setTitle] = React.useState(item.title);
  const [phone, setPhone] = React.useState(item.phone);
  const [duration, setDuration] = React.useState(item.duration);

  const editor = useEditor({
    extensions: [StarterKit],
    content: item.details,
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[100px] p-4 border rounded-md',
      },
    },
  });

  React.useEffect(() => {
    if (editor && item.details) {
      editor.commands.setContent(item.details);
    }
  }, [editor, item.details]);

  const handleSave = () => {
    onSave({
      ...item,
      name,
      title,
      details: editor?.getHTML() || '',
      phone,
      duration,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>עריכת פריט</DialogTitle>
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
            <Button onClick={() => onOpenChange(false)} variant="outline">ביטול</Button>
            <Button onClick={handleSave}>שמור</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;