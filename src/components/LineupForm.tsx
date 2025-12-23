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
      setName(editingItem.name.trim());
      setTitle(editingItem.title);
      setDetails(editingItem.details || '');
      setPhone(editingItem.phone);
      setDuration(editingItem.duration);
    }
  }, [editingItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim the name field to remove extra spaces
    const trimmedName = name.trim();

    try {
      await addGuest({
        name: trimmedName,
        title,
        phone
      });
    } catch (error) {
      console.error('Error saving guest:', error);
    }

    const newItem = {
      name: trimmedName,
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
    setName(guest.name.trim());
    setTitle(guest.title);
    setPhone(guest.phone);
  };

  return (
    <div className="glass-card p-10 rounded-[2.5rem] border-none premium-shadow space-y-8 animate-in" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
          {editingItem ? '✎' : '+'}
        </div>
        <h2 className="text-2xl font-black text-slate-800">
          {editingItem ? 'עריכת אייטם' : 'הוספת אייטם חדש'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="lineup-form space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 px-1">שם המרואיינ/ת</label>
            <GuestSearch
              value={name}
              onNameChange={(newName) => {
                setName(newName);
                onNameChange(newName);
              }}
              onGuestSelect={handleGuestSelect}
              className="rounded-2xl h-14 bg-white/50 border-slate-100 focus:border-primary/30 font-bold transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 px-1">קרדיט / תפקיד</label>
            <Input
              placeholder="למשל: כתבנו הצבאי, ח״כ וכו׳"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoComplete="off"
              name="guest-title"
              className="rounded-2xl h-14 bg-white/50 border-slate-100 focus:border-primary/30 font-bold transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-500 px-1">פרטים ותוכן השיחה</label>
          <div className="rounded-[1.5rem] border border-slate-100 bg-white/50 overflow-hidden focus-within:ring-4 focus-within:ring-primary/5 transition-all">
            <BasicEditor
              content={details}
              onChange={setDetails}
              placeholder="על מה נדבר בשיחה? נקודות חשובות..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 px-1">מספר טלפון</label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              className="rounded-2xl h-14 bg-white/50 border-slate-100 focus:border-primary/30 font-bold transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 px-1">משך זמן (דקות)</label>
            <Input
              placeholder="5"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
              required
              name="duration"
              className="rounded-2xl h-14 bg-white/50 border-slate-100 focus:border-primary/30 font-bold transition-all"
            />
          </div>
        </div>

        <div className="pt-4">
          <FormActions
            onSubmit={handleSubmit}
            onBreakAdd={handleBreakAdd}
            onNoteAdd={handleNoteAdd}
            onDividerAdd={handleDividerAdd}
            isEditing={!!editingItem}
          />
        </div>
      </form>
    </div>
  );
};

export default LineupForm;
