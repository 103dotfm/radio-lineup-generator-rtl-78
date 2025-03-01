
import React, { useState } from 'react';
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
}

const DividerItem = ({
  id,
  name,
  index,
  onDelete,
  onEdit,
  isAuthenticated,
  showMinutes = false
}: DividerItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [dividerText, setDividerText] = useState(name);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onEdit(id, { name: dividerText, is_divider: true });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDividerText(name);
    setIsEditing(false);
  };

  const colSpan = isAuthenticated ? (showMinutes ? 6 : 5) : (showMinutes ? 5 : 4);

  return (
    <tr className="divider-row">
      <td colSpan={colSpan} className="divider-cell py-2 px-4 border-0">
        <div className="divider-header">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={dividerText}
                onChange={(e) => setDividerText(e.target.value)}
                className="max-w-xs"
                autoFocus
              />
              <Button size="sm" onClick={handleSave}>שמור</Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>ביטול</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{name}</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default DividerItem;
