import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Coffee } from "lucide-react";

interface LineupFormProps {
  onAdd: (item: {
    name: string;
    title: string;
    details: string;
    phone: string;
    duration: number;
    isBreak?: boolean;
  }) => void;
  onNameChange: (name: string) => Promise<any>;
}

const LineupForm = ({ onAdd, onNameChange }: LineupFormProps) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState(5);
  const [isBreak, setIsBreak] = useState(false);

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
    onAdd({ name, title, details, phone, duration, isBreak });
    setName('');
    setTitle('');
    setDetails('');
    setPhone('');
    setDuration(5);
    setIsBreak(false);
  };

  const handleBreakAdd = () => {
    onAdd({ 
      name: 'הפסקה מסחרית',
      title: '',
      details: '',
      phone: '',
      duration: duration,
      isBreak: true 
    });
    setDuration(5);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-8">
      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder="שם"
          value={name}
          onChange={handleNameChange}
          required
          autoComplete="name"
          name="name"
        />
        <Input
          placeholder="כותרת"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoComplete="organization-title"
          name="title"
        />
      </div>
      <Textarea
        placeholder="פרטים"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        name="details"
        autoComplete="on"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder="טלפון"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
          name="phone"
        />
        <Input
          placeholder="משך בדקות"
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
          required
          name="duration"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          <Plus className="ml-2 h-4 w-4" /> הוסף לליינאפ
        </Button>
        <Button type="button" onClick={handleBreakAdd} variant="secondary" className="w-auto">
          <Coffee className="ml-2 h-4 w-4" /> הוסף הפסקה
        </Button>
      </div>
    </form>
  );
};

export default LineupForm;