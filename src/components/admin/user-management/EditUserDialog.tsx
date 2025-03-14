
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import UserForm from './UserForm';
import { User } from './types';
import { useUsers } from './hooks/useUsers';

interface EditUserDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedUser: Partial<User> | null;
  setSelectedUser: React.Dispatch<React.SetStateAction<Partial<User> | null>>;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ 
  isOpen, 
  setIsOpen,
  selectedUser,
  setSelectedUser
}) => {
  const { updateUserMutation } = useUsers();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-right">עריכת משתמש</DialogTitle>
        </DialogHeader>
        {selectedUser && (
          <UserForm 
            user={selectedUser}
            setUser={setSelectedUser}
            onSubmit={() => updateUserMutation.mutate(selectedUser as User)}
            submitLabel="עדכן משתמש"
            isLoading={updateUserMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
