
import React from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { User } from './types';
import UserActions from './UserActions';
import { Badge } from '@/components/ui/badge';

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

const UserRow: React.FC<UserRowProps> = ({ user, onEdit, onDelete }) => {
  // Determine if this user is linked to a worker account
  const isProducerAccount = user.id && user.title?.includes('producer');

  return (
    <TableRow key={user.id}>
      <TableCell>{user.username || user.email?.split('@')[0]}</TableCell>
      <TableCell dir="ltr">{user.email}</TableCell>
      <TableCell>{user.full_name || '-'}</TableCell>
      <TableCell>
        {user.title ? user.title : '-'}
        {user.id.startsWith('00000000-0000-0000-0000') && (
          <Badge variant="outline" className="ml-2">מערכת</Badge>
        )}
        {isProducerAccount && (
          <Badge variant="secondary" className="ml-2">מפיק</Badge>
        )}
      </TableCell>
      <TableCell>
        {user.is_admin ? 
          <Badge className="bg-blue-500">מנהל</Badge> : 
          <Badge variant="outline">משתמש</Badge>
        }
      </TableCell>
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
