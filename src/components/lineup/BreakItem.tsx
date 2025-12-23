import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, GripVertical } from "lucide-react";

interface BreakItemProps {
  id: string;
  name: string;
  duration: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onBreakTextChange: (id: string, text: string) => void;
  isAuthenticated: boolean;
  showMinutes?: boolean;
  isBackupShow?: boolean;
}

const BreakItem = ({
  id,
  name,
  duration,
  onDelete,
  onDurationChange,
  onBreakTextChange,
  isAuthenticated,
  showMinutes = false,
  isBackupShow = false,
}: BreakItemProps) => {
  // Determine colspan based on authentication and minutes visibility
  const mainColspan = isAuthenticated ? 4 : 3;

  return (
    <>
      <td colSpan={mainColspan} className="py-4 px-6 border-b border-white/10 bg-slate-900/90 text-center">
        <Input
          value={name}
          onChange={(e) => onBreakTextChange(id, e.target.value)}
          className="w-full text-center border-0 bg-transparent font-black text-xl text-white/90 placeholder:text-white/20 focus:ring-0 focus:outline-none tracking-widest uppercase"
          placeholder="תיאור הפסקה..."
        />
      </td>
      {showMinutes && (
        <td className="py-4 px-4 border-b border-white/10 bg-slate-900 text-center w-24">
          <Input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => onDurationChange(id, parseInt(e.target.value) || 0)}
            className="w-16 h-10 text-center bg-white/10 border-white/10 rounded-xl font-black text-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all mx-auto"
          />
        </td>
      )}
      <td className="py-4 px-6 border-b border-white/10 bg-slate-900 text-center">
        <div className="flex justify-center items-center gap-2">
          {!isBackupShow && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(id)}
              className="h-10 w-10 rounded-xl text-white/40 hover:text-red-400 hover:bg-white/5 transition-all"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
          <div className="h-10 w-10 flex items-center justify-center cursor-grab active:cursor-grabbing text-white/20 hover:text-white/60 transition-colors">
            <GripVertical className="h-5 w-5" />
          </div>
        </div>
      </td>
    </>
  );
};

export default BreakItem;
