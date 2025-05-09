
import React from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User } from './types';
import UserRow from './UserRow';
import UserListLoading from './UserListLoading';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  isLoading: boolean;
}

const UserList: React.FC<UserListProps> = ({ 
  users, 
  onEdit, 
  onDelete,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">שם משתמש</TableHead>
            <TableHead className="text-right">אימייל</TableHead>
            <TableHead className="text-right">שם מלא</TableHead>
            <TableHead className="text-right">תפקיד</TableHead>
            <TableHead className="text-right">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <UserListLoading />
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">שם משתמש</TableHead>
          <TableHead className="text-right">אימייל</TableHead>
          <TableHead className="text-right">שם מלא</TableHead>
          <TableHead className="text-right">תפקיד</TableHead>
          <TableHead className="text-right">פעולות</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users?.map((user) => (
          <UserRow 
            key={user.id}
            user={user}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </TableBody>
    </Table>
  );
};

export default UserList;
