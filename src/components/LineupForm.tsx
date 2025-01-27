import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Coffee, StickyNote } from "lucide-react";

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

const LineupForm = ({ onAdd, onNameChange, editingItem }: LineupFormProps) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState(5);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setTitle(editingItem.title);
      setDetails(editingItem.details);
      setPhone(editingItem.phone);
      setDuration(editingItem.duration);
    }
  }, [editingItem]);

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (newName.length > 2) {
      const data = await onNameChange(newName);
      if (data) {
        setTitle(data.title || '');
        setDetails(data.details || '');
        setPhone(data.phone || '');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ 
      name, 
      title, 
      details, 
      phone, 
      duration,
      is_break: false,
      is_note: false
    });
    setName('');
    setTitle('');
    setDetails('');
    setPhone('');
    setDuration(5);
  };

  const handleBreakAdd = () => {
    const breakItem = { 
      name: 'הפסקה מסחרית',
      title: '',
      details: '',
      phone: '',
      duration: duration,
      is_break: true, // Explicitly set to true
      is_note: false
    };
    console.log('Adding break item:', breakItem);
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
      is_note: true // Explicitly set to true
    };
    console.log('Adding note item:', noteItem);
    onAdd(noteItem);
  };

  return (
    <form onSubmit={handleSubmit} className="lineup-form space-y-4">      
      <div className="lineup-form-inputs">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input
            placeholder="שם"
            value={name}
            onChange={handleNameChange}
            required
            autoComplete="name"
            name="name"
            list="names-list"
            className="lineup-form-input-name"
          />
          <datalist id="names-list">
            {/* Add suggested names here if needed */}
          </datalist>
          <Input
            placeholder="כותרת"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoComplete="organization-title"
            name="title"
            className="lineup-form-input-title"
          />
        </div>
        <Textarea
          placeholder="פרטים"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          name="details"
          autoComplete="on"
          className="lineup-form-input-details whitespace-pre-wrap mb-4"
        />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input
            placeholder="טלפון"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            name="phone"
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