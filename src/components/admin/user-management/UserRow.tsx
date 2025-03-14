
import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { User } from './types';
import UserActions from './UserActions';

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

const UserRow: React.FC<UserRowProps> = ({ user, onEdit, onDelete }) => {
  return (
    <TableRow key={user.id}>
      <TableCell>{user.username}</TableCell>
      <TableCell dir="ltr">{user.email}</TableCell>
      <TableCell>{user.full_name}</TableCell>
      <TableCell>{user.is_admin ? 'מנהל' : 'משתמש'}</TableCell>
      <TableCell>
        <UserActions 
          user={user} 
          onEdit={onEdit} 
          onDelete={onDelete} 
        />
      </TableCell>
    </TableRow>
  );
};

export default UserRow;
