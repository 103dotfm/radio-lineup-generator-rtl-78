import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { addGuest } from '../lib/supabase/guests';
import { toast } from "sonner";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import PhoneInput from './lineup/form/PhoneInput';
import GuestSearch from './lineup/form/GuestSearch';
import FormActions from './lineup/form/FormActions';

interface LineupFormProps {
  onAdd: (item: {
    name: string;
    title: string;
    details: string;
    phone: string;
    duration: number;
    is_break?: boolean;
    is_note?: boolean;
  }) => void;
  onNameChange: (name: string) => Promise<any>;
  onBackToDashboard: () => void;
  editingItem?: {
    name: string;
    title: string;
    details: string;
    phone: string;
    duration: number;
    is_break?: boolean;
    is_note?: boolean;
  } | null;
}

const LineupForm = ({ onAdd, onNameChange, editingItem, onBackToDashboard }: LineupFormProps) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState(5);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-base focus:outline-none min-h-[100px] p-4 border rounded-md text-right',
      },
    },
  });

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setTitle(editingItem.title);
      if (editor) {
        editor.commands.setContent(editingItem.details || '');
      }
      setPhone(editingItem.phone);
      setDuration(editingItem.duration);
    }
  }, [editingItem, editor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await addGuest({
        name,
        title,
        phone
      });
    } catch (error) {
      console.error('Error saving guest:', error);
    }

    const newItem = { 
      name, 
      title, 
      details: editor?.getHTML() || '', 
      phone, 
      duration,
      is_break: false,
      is_note: false
    };
    
    onAdd(newItem);

    setName('');
    setTitle('');
    if (editor) {
      editor.commands.setContent('');
    }
    setPhone('');
    setDuration(5);
  };

  const handleBreakAdd = () => {
    const breakItem = { 
      name: 'פרסומות',
      title: '',
      details: '',
      phone: '',
      duration: duration,
      is_break: true,
      is_note: false
    };
    onAdd(breakItem);
    setDuration(5);
  };

  const handleNoteAdd = () => {
    const noteItem = {
      name: 'הערה',
      title: '',
      details: '',
      phone: '',
      duration: 0,
      is_break: false,
      is_note: true
    };
    onAdd(noteItem);
  };

  const handleGuestSelect = (guest: { name: string; title: string; phone: string }) => {
    setName(guest.name);
    setTitle(guest.title);
    setPhone(guest.phone);
  };

  return (
    <form onSubmit={handleSubmit} className="lineup-form space-y-4">      
      <div className="lineup-form-inputs">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <GuestSearch 
            onNameChange={(newName) => {
              setName(newName);
              onNameChange(newName);
            }}
            onGuestSelect={handleGuestSelect}
          />
          <Input
            placeholder="קרדיט"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoComplete="off"
            name="guest-title"
            className="lineup-form-input-title"
          />
        </div>
        <div className="mb-4">
          <EditorContent editor={editor} className="note-editor" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <PhoneInput value={phone} onChange={setPhone} />
          <Input
            placeholder="משך בדקות"
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
            required
            name="duration"
            className="lineup-form-input-duration"
          />
        </div>
      </div>
      
      <FormActions
        onSubmit={handleSubmit}
        onBreakAdd={handleBreakAdd}
        onNoteAdd={handleNoteAdd}
        isEditing={!!editingItem}
      />
    </form>
  );
};

export default LineupForm;