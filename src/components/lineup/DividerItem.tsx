import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";

interface DividerItemProps {
  id: string;
  name: string;
  index: number;
  onDelete: (id: string) => void;
  onEdit: (id: string, updatedItem: any) => void;
  isAuthenticated: boolean;
  showMinutes?: boolean;
  isBackupShow?: boolean;
}

const DividerItem = ({
  id,
  name,
  index,
  onDelete,
  onEdit,
  isAuthenticated,
  showMinutes = false,
  isBackupShow = false
}: DividerItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [dividerText, setDividerText] = useState(name);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const updateData = {
      name: dividerText,
      is_divider: true,
      is_break: false,
      is_note: false
    };
    onEdit(id, updateData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDividerText(name);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(id);
  };

  const colSpan = isAuthenticated ? (showMinutes ? 6 : 5) : (showMinutes ? 5 : 4);

  return (
    <tr className="divider-row group">
      <td colSpan={colSpan} className="py-8 px-6 border-0">
        <div className="relative flex items-center gap-6">
          <div className="flex-grow h-px bg-gradient-to-l from-primary/50 to-transparent"></div>

          <div className="relative z-10 glass-card px-8 py-3 rounded-2xl border-none premium-shadow bg-primary/5">
            {isEditing ? (
              <div className="flex items-center gap-3">
                <Input
                  value={dividerText}
                  onChange={(e) => setDividerText(e.target.value)}
                  className="w-48 h-10 bg-white border-primary/20 rounded-xl font-black text-primary animate-in zoom-in-95"
                  autoFocus
                />
                <Button size="sm" onClick={handleSave} className="rounded-xl h-10 px-4 font-black transition-all hover:scale-105 active:scale-95">שמור</Button>
                <Button size="sm" variant="ghost" onClick={handleCancel} className="rounded-xl h-10 px-4 font-bold text-slate-500 hover:bg-slate-50">ביטול</Button>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <h2 className="text-2xl font-black text-primary tracking-tight uppercase">{name}</h2>
                {!isBackupShow && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleEdit}
                      className="h-10 w-10 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      <Edit2 className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDelete}
                      className="h-10 w-10 rounded-xl text-primary/40 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-grow h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
        </div>
      </td>
    </tr>
  );
};

export default DividerItem;
