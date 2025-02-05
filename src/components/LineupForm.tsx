import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Coffee, StickyNote } from "lucide-react";
import { searchGuests, addGuest } from '../lib/supabase/guests';
import { toast } from "sonner";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

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
  const [suggestions, setSuggestions] = useState<Array<{ name: string; title: string; phone: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    let cleaned = value.replace(/\D/g, '');
    
    // Replace +972 with 0
    if (cleaned.startsWith('972')) {
      cleaned = '0' + cleaned.slice(3);
    }
    
    // Add dash after third digit if there are more than 3 digits
    if (cleaned.length > 3) {
      cleaned = cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    }
    
    return cleaned;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(e.target.value);
    setPhone(formattedPhone);
  };

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    
    if (newName.length > 2) {
      setIsSearching(true);
      try {
        const guests = await searchGuests(newName);
        setSuggestions(guests.map(guest => ({
          name: guest.name,
          title: guest.title,
          phone: guest.phone || ''
        })));
      } catch (error) {
        console.error('Error searching guests:', error);
        toast.error('שגיאה בחיפוש אורחים');
      } finally {
        setIsSearching(false);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionSelect = (suggestion: { name: string; title: string; phone: string }) => {
    setName(suggestion.name);
    setTitle(suggestion.title);
    setPhone(formatPhoneNumber(suggestion.phone));
    setSuggestions([]);
  };

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
    setSuggestions([]);
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

  return (
    <form onSubmit={handleSubmit} className="lineup-form space-y-4">      
      <div className="lineup-form-inputs">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <Input
              placeholder="שם"
              value={name}
              onChange={handleNameChange}
              required
              autoComplete="off"
              name="guest-name"
              className="lineup-form-input-name"
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    <div>{suggestion.name}</div>
                    <div className="text-sm text-gray-500">{suggestion.title}</div>
                  </div>
                ))}
              </div>
            )}
            {isSearching && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 p-2 text-center text-gray-500">
                מחפש...
              </div>
            )}
          </div>
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
          <Input
            placeholder="טלפון"
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            required
            autoComplete="off"
            name="guest-phone"
            className="lineup-form-input-phone"
          />
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
      
      <div className="lineup-form-actions flex gap-2">
        <Button type="submit" className="flex-1 lineup-form-submit">
          <Plus className="ml-2 h-4 w-4" /> {editingItem ? 'עדכן פריט' : 'הוסף לליינאפ'}
        </Button>
        <Button 
          type="button" 
          onClick={handleBreakAdd} 
          variant="secondary" 
          className="w-auto lineup-form-break"
        >
          <Coffee className="ml-2 h-4 w-4" /> הוסף הפסקה
        </Button>
        <Button 
          type="button" 
          onClick={handleNoteAdd} 
          variant="secondary" 
          className="w-auto lineup-form-note"
        >
          <StickyNote className="ml-2 h-4 w-4" /> הוספת הערה
        </Button>
      </div>
    </form>
  );
};

export default LineupForm;