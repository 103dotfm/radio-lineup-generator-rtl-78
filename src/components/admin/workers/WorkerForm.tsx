
import React from 'react';
import { Worker } from '@/lib/supabase/workers';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkerFormProps {
  formData: Partial<Worker>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const WorkerForm: React.FC<WorkerFormProps> = ({ formData, onChange }) => {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">שם</Label>
        <Input
          id="name"
          name="name"
          value={formData.name || ''}
          onChange={onChange}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="department" className="text-right">מחלקה</Label>
        <Input
          id="department"
          name="department"
          value={formData.department || ''}
          onChange={onChange}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="position" className="text-right">תפקיד</Label>
        <Input
          id="position"
          name="position"
          value={formData.position || ''}
          onChange={onChange}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right">אימייל</Label>
        <Input
          id="email"
          name="email"
          value={formData.email || ''}
          onChange={onChange}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="phone" className="text-right">טלפון</Label>
        <Input
          id="phone"
          name="phone"
          value={formData.phone || ''}
          onChange={onChange}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="photo_url" className="text-right">תמונה (URL)</Label>
        <Input
          id="photo_url"
          name="photo_url"
          value={formData.photo_url || ''}
          onChange={onChange}
          className="col-span-3"
          placeholder="https://example.com/photo.jpg"
        />
      </div>
    </div>
  );
};

export default WorkerForm;
