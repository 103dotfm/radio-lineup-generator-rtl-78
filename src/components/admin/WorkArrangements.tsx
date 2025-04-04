
import React from 'react';
import DigitalWorkArrangement from './DigitalWorkArrangement';
import { supabase } from '@/lib/supabase';

const WorkArrangements = () => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">ניהול סידורי עבודה</h2>
      <DigitalWorkArrangement supabase={supabase} />
    </div>
  );
};

export default WorkArrangements;
