
import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddUserDialog from './AddUserDialog';
import { User } from './types';

interface UserManagementHeaderProps {
  isAddUserOpen: boolean;
  setIsAddUserOpen: (open: boolean) => void;
  newUser: Partial<User>;
  setNewUser: React.Dispatch<React.SetStateAction<Partial<User>>>;
}

const UserManagementHeader: React.FC<UserManagementHeaderProps> = ({
  isAddUserOpen,
  setIsAddUserOpen,
  newUser,
  setNewUser
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-between items-center mb-6">
      <Button 
        variant="outline" 
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        חזרה ללוח הבקרה
      </Button>
      <h2 className="text-2xl font-bold">ניהול משתמשים</h2>
      <AddUserDialog
        isOpen={isAddUserOpen}
        setIsOpen={setIsAddUserOpen}
        newUser={newUser}
        setNewUser={setNewUser}
      />
    </div>
  );
};

export default UserManagementHeader;
