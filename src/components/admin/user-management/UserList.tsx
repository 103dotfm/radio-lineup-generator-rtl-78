
import React from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { User } from './types';
import UserRow from './UserRow';
import UserListLoading from './UserListLoading';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onResetPassword: (userId: string) => void;
  isLoading: boolean;
}

const UserList: React.FC<UserListProps> = ({ 
  users, 
  onEdit, 
  onDelete,
  onResetPassword,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Table className="direction-rtl">
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">שם משתמש</TableHead>
            <TableHead className="text-right">אימייל</TableHead>
            <TableHead className="text-right">שם מלא</TableHead>
            <TableHead className="text-right">תפקיד</TableHead>
            <TableHead className="text-right">הרשאה</TableHead>
            <TableHead className="text-right">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <UserListLoading />
      </Table>
    );
  }

  return (
    <Table dir="rtl">
      <TableHeader>
        <TableRow>
          <TableHead className="text-right">שם משתמש</TableHead>
          <TableHead className="text-right">אימייל</TableHead>
          <TableHead className="text-right">שם מלא</TableHead>
          <TableHead className="text-right">תפקיד</TableHead>
          <TableHead className="text-right">הרשאה</TableHead>
          <TableHead className="text-right">פעולות</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">לא נמצאו משתמשים</TableCell>
          </TableRow>
        ) : (
          users?.map((user) => (
            <UserRow 
              key={user.id}
              user={user}
              onEdit={onEdit}
              onDelete={onDelete}
              onResetPassword={onResetPassword}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default UserList;
