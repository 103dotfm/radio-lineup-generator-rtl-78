
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, NewUser } from './types';
import { Checkbox } from "@/components/ui/checkbox";

interface UserFormProps {
  user: Partial<User> & { password?: string };
  setUser: React.Dispatch<React.SetStateAction<Partial<User> & { password?: string }>>;
  onSubmit: () => void;
  submitLabel: string;
  isLoading?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ 
  user, 
  setUser, 
  onSubmit, 
  submitLabel,
  isLoading
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="email">אימייל</Label>
        <Input
          id="email"
          value={user.email || ''}
          onChange={(e) => setUser({ ...user, email: e.target.value })}
          dir="ltr"
        />
      </div>
      <div>
        <Label htmlFor="username">שם משתמש</Label>
        <Input
          id="username"
          value={user.username || ''}
          onChange={(e) => setUser({ ...user, username: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="full_name">שם מלא</Label>
        <Input
          id="full_name"
          value={user.full_name || ''}
          onChange={(e) => setUser({ ...user, full_name: e.target.value })}
        />
      </div>
      
      {!user.id && (
        <div>
          <Label htmlFor="password">סיסמה</Label>
          <Input
            id="password"
            type="password"
            value={user.password || ''}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
            dir="ltr"
          />
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <Checkbox
          id="is_admin"
          checked={user.is_admin || false}
          onCheckedChange={(checked) => 
            setUser({ ...user, is_admin: checked === true })
          }
        />
        <Label htmlFor="is_admin" className="cursor-pointer">מנהל מערכת</Label>
      </div>
      
      <Button
        onClick={onSubmit}
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? 'מעבד...' : submitLabel}
      </Button>
    </div>
  );
};

export default UserForm;
