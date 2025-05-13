
import React, { useState } from 'react';
import { useUsers } from './hooks/useUsers';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from 'lucide-react';

const DeleteUserByEmail: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { deleteUserByEmailMutation } = useUsers();

  const handleDelete = async () => {
    if (!email) return;
    
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${email}?`)) {
      setIsDeleting(true);
      try {
        await deleteUserByEmailMutation.mutateAsync(email);
        setEmail('');
      } catch (error) {
        console.error('Failed to delete user:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          מחיקת משתמש לפי אימייל
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <label htmlFor="email-delete" className="text-sm font-medium">
            אימייל המשתמש למחיקה
          </label>
          <Input
            id="email-delete"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="הזן אימייל של משתמש שאינו מוצג ברשימה"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          variant="destructive" 
          onClick={handleDelete} 
          disabled={!email || isDeleting}
        >
          {isDeleting ? 'מוחק...' : 'מחק משתמש'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DeleteUserByEmail;
