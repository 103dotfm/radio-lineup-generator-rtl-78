
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import UserList from './UserList';
import EditUserDialog from './EditUserDialog';
import UserManagementHeader from './UserManagementHeader';
import { User } from './types';
import { useUsers } from './hooks/useUsers';

const UserManagement = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [newUser, setNewUser] = useState<Partial<User>>({
    email: '',
    username: '',
    full_name: '',
    password: '',
    is_admin: false,
  });

  const { users, isLoading, deleteUserMutation } = useUsers();

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
  };

  return (
    <Card className="p-6" dir="rtl">
      <UserManagementHeader
        isAddUserOpen={isAddUserOpen}
        setIsAddUserOpen={setIsAddUserOpen}
        newUser={newUser}
        setNewUser={setNewUser}
      />

      <EditUserDialog
        isOpen={isEditUserOpen}
        setIsOpen={setIsEditUserOpen}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
      />

      <UserList 
        users={users || []}
        onEdit={handleEditUser}
        onDelete={(userId) => deleteUserMutation.mutate(userId)}
        isLoading={isLoading}
      />
    </Card>
  );
};

export default UserManagement;
