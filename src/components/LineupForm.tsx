import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { addGuest } from '../lib/supabase/guests';
import { toast } from "sonner";
import PhoneInput from './lineup/form/PhoneInput';
import GuestSearch from './lineup/form/GuestSearch';
import FormActions from './lineup/form/FormActions';
import BasicEditor from './editor/BasicEditor';

interface LineupFormProps {
  onAdd: (item: {
    name: string;
    title: string;
    details: string;
    phone: string;
    duration: number;
    is_break?: boolean;
    is_note?: boolean;
    is_divider?: boolean;
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
    is_divider?: boolean;
  } | null;
  onDividerAdd?: () => void;
}

const LineupForm = ({ onAdd, onNameChange, editingItem, onBackToDashboard, onDividerAdd }: LineupFormProps) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState(5);
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setTitle(editingItem.title);
      setDetails(editingItem.details || '');
      setPhone(editingItem.phone);
      setDuration(editingItem.duration);
    }
  }, [editingItem]);

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
      details, 
      phone, 
      duration,
      is_break: false,
      is_note: false,
      is_divider: false
    };
    
    console.log('Adding regular item:', newItem);
    onAdd(newItem);
    clearForm();
  };

  const clearForm = () => {
    setName('');
    setTitle('');
    setDetails('');
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
      is_note: false,
      is_divider: false
    };
    console.log('Adding break item with flags:', {
      is_break: breakItem.is_break,
      is_note: breakItem.is_note,
      is_divider: breakItem.is_divider
    });
    
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
      is_note: true,
      is_divider: false
    };
    console.log('Adding note item with flags:', {
      is_break: noteItem.is_break,
      is_note: noteItem.is_note,
      is_divider: noteItem.is_divider
    });
    
    onAdd(noteItem);
  };

  const handleDividerAdd = () => {
    if (onDividerAdd) {
      console.log('Using parent onDividerAdd handler');
      onDividerAdd();
    } else {
      const dividerItem = {
        name: 'שעה שנייה',
        title: '',
        details: '',
        phone: '',
        duration: 0,
        is_break: false,
        is_note: false,
        is_divider: true
      };
      
      console.log('Adding divider item with flags:', {
        is_break: dividerItem.is_break,
        is_note: dividerItem.is_note,
        is_divider: dividerItem.is_divider
      });
      
      onAdd(dividerItem);
    }
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
            value={name}
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
          <BasicEditor
            content={details}
            onChange={setDetails}
            placeholder="פרטים"
          />
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
        onDividerAdd={handleDividerAdd}
        isEditing={!!editingItem}
      />
    </form>
  );
};

export default LineupForm;
