
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from 'lucide-react';
import UserForm from './UserForm';
import { User } from './types';
import { useUsers } from './hooks/useUsers';

interface AddUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  newUser: Partial<User>;
  setNewUser: React.Dispatch<React.SetStateAction<Partial<User>>>;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({ 
  isOpen, 
  setIsOpen,
  newUser,
  setNewUser
}) => {
  const { createUserMutation } = useUsers();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          הוסף משתמש
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-right">הוסף משתמש חדש</DialogTitle>
        </DialogHeader>
        <UserForm 
          user={newUser}
          setUser={setNewUser}
          onSubmit={() => createUserMutation.mutate(newUser as Partial<User> & { password: string })}
          submitLabel="צור משתמש"
          isLoading={createUserMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddUserDialog;
