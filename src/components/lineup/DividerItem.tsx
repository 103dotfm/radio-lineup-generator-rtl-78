
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DividerItemProps {
  id: string;
  name: string;
  onDelete: (id: string) => void;
  onNameChange?: (id: string, name: string) => void;
  isAuthenticated: boolean;
  showMinutes?: boolean;
}

const DividerItem = ({
  id,
  name,
  onDelete,
  onNameChange,
  isAuthenticated,
  showMinutes = false
}: DividerItemProps) => {
  return (
    <>
      <td colSpan={showMinutes ? 2 : 1} className="bg-gray-200 font-bold">
        {isAuthenticated ? (
          <Input
            value={name}
            onChange={(e) => onNameChange && onNameChange(id, e.target.value)}
            className="border-0 bg-transparent font-bold"
            placeholder="שם החלק"
          />
        ) : (
          <div className="p-2">{name}</div>
        )}
      </td>
      <td className="bg-gray-200 text-right">
        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(id)}
            className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </td>
    </>
  );
};

export default DividerItem;
