
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw } from 'lucide-react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import AddUserDialog from './AddUserDialog';
import UserActions from './UserActions';
import UserListLoading from './UserListLoading';
import { User } from './types';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  isLoading: boolean;
}

const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    email: '',
    username: '',
    full_name: '',
    password: '',
    is_admin: false,
  });

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">ניהול משתמשים</h1>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              משתמש חדש
            </Button>
          </DialogTrigger>
          <AddUserDialog
            isOpen={isAddUserOpen}
            setIsOpen={setIsAddUserOpen}
            newUser={newUser}
            setNewUser={setNewUser}
          />
        </Dialog>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש משתמשים..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-4 pr-10 text-right"
          />
        </div>
        <Button variant="outline" onClick={() => setSearchTerm('')}>
          <RefreshCw className="ml-2 h-4 w-4" />
          איפוס
        </Button>
      </div>
      
      {isLoading ? (
        <UserListLoading />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="text-right">
              <TableHead className="text-right">שם מלא</TableHead>
              <TableHead className="text-right">שם משתמש</TableHead>
              <TableHead className="text-right">דוא״ל</TableHead>
              <TableHead className="text-right">מנהל</TableHead>
              <TableHead className="text-left">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  לא נמצאו משתמשים התואמים את החיפוש
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="text-right">
                  <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                  <TableCell>{user.username || '-'}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>{user.is_admin ? 'כן' : 'לא'}</TableCell>
                  <TableCell className="text-left">
                    <UserActions 
                      user={user} 
                      onEdit={() => onEdit(user)} 
                      onDelete={() => onDelete(user.id)} 
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default UserList;
