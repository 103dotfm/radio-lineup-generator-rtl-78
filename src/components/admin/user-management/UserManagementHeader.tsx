
import React from 'react';
import AddUserDialog from './AddUserDialog';
import { User } from './types';
import { Separator } from '@/components/ui/separator';

interface UserManagementHeaderProps {
  isAddUserOpen: boolean;
  setIsAddUserOpen: (open: boolean) => void;
  newUser: Partial<User> & { password: string };
  setNewUser: React.Dispatch<React.SetStateAction<Partial<User> & { password: string }>>;
}

const UserManagementHeader: React.FC<UserManagementHeaderProps> = ({
  isAddUserOpen,
  setIsAddUserOpen,
  newUser,
  setNewUser
}) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ניהול משתמשים</h2>
        <AddUserDialog
          isOpen={isAddUserOpen}
          setIsOpen={setIsAddUserOpen}
          newUser={newUser}
          setNewUser={setNewUser}
        />
      </div>
      <p className="text-muted-foreground mb-4">צור, ערוך ושנה הרשאות למשתמשי המערכת</p>
      <Separator />
    </div>
  );
};

export default UserManagementHeader;
