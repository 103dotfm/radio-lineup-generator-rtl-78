import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface LineupFormProps {
  onAdd: (item: {
    name: string;
    title: string;
    details: string;
    phone: string;
    duration: number;
  }) => void;
}

const LineupForm = ({ onAdd }: LineupFormProps) => {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [phone, setPhone] = useState('');
  const [duration, setDuration] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ name, title, details, phone, duration });
    setName('');
    setTitle('');
    setDetails('');
    setPhone('');
    setDuration(5);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-8">
      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder="שם"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          placeholder="כותרת"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <Textarea
        placeholder="פרטים"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          placeholder="טלפון"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <Input
          placeholder="משך בדקות"
          type="number"
          min="1"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value) || 5)}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        <Plus className="ml-2 h-4 w-4" /> הוסף לליינאפ
      </Button>
    </form>
  );
};

export default LineupForm;