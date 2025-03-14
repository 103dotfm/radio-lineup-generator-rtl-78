
import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User } from './types';

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
  if (isLoading) return <div>טוען משתמשים...</div>;

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
          <TableRow key={user.id}>
            <TableCell>{user.username}</TableCell>
            <TableCell dir="ltr">{user.email}</TableCell>
            <TableCell>{user.full_name}</TableCell>
            <TableCell>{user.is_admin ? 'מנהל' : 'משתמש'}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(user)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => {
                    if (window.confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) {
                      onDelete(user.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default UserList;
