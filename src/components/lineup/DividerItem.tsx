
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

  // Add debug logging to identify where the component is being rendered
  useEffect(() => {
    console.log(`DividerItem ${id} (${name}) mounted at index ${index}`);
    console.log(`DividerItem props check - this MUST be a divider item`);
    
    return () => {
      console.log(`DividerItem ${id} (${name}) unmounted`);
    };
  }, [id, name, index]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    console.log(`Saving divider ${id} with text "${dividerText}"`);
    
    // CRITICAL: Make sure we explicitly set is_divider to true when saving
    const updateData = { 
      name: dividerText, 
      is_divider: true,
      is_break: false,
      is_note: false
    };
    
    console.log(`Divider update data:`, updateData);
    onEdit(id, updateData);
    
    console.log(`After save: explicitly set is_divider to true for item ${id}`);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDividerText(name);
    setIsEditing(false);
  };

  const handleDelete = () => {
    console.log(`Deleting divider ${id}`);
    onDelete(id);
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
                <Button variant="ghost" size="icon" onClick={handleDelete}>
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
