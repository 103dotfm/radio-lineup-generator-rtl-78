
import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { User } from './types';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserActionsProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

const UserActions: React.FC<UserActionsProps> = ({ user, onEdit, onDelete }) => {
  const handleDelete = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
      onDelete(user.id);
    }
  };

  return (
    <div className="flex gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(user)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>ערוך משתמש</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>מחק משתמש</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default UserActions;
