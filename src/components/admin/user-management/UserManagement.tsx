
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserList from './UserList';
import EditUserDialog from './EditUserDialog';
import UserManagementHeader from './UserManagementHeader';
import { User } from './types';
import { useUsers } from './hooks/useUsers';
import ProducerUsers from '../producers/ProducerUsers';

const UserManagement = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Partial<User> | null>(null);
  const [currentTab, setCurrentTab] = useState("system-users");
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
    <Card className="p-6">
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

      <Tabs
        defaultValue="system-users"
        value={currentTab}
        onValueChange={setCurrentTab}
        className="mt-6"
      >
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="system-users">משתמשי מערכת</TabsTrigger>
          <TabsTrigger value="producer-users">משתמשי מפיקים</TabsTrigger>
        </TabsList>
        
        <TabsContent value="system-users">
          <UserList 
            users={users || []}
            onEdit={handleEditUser}
            onDelete={(userId) => deleteUserMutation.mutate(userId)}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="producer-users">
          <ProducerUsers />
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default UserManagement;
