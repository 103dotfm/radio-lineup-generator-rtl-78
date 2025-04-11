
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, User, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DashboardHeader = () => {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="p-4 bg-white shadow-sm flex justify-between items-center">
      <div className="flex items-center">
        <img
          src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png"
          alt="103FM"
          className="h-12 w-auto"
        />
        <h1 className="ml-4 text-xl font-bold">מערכת ליינאפים</h1>
      </div>
      <div className="flex items-center space-x-2 space-x-reverse">
        {isAuthenticated && (
          <>
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin')}
                className="ml-2"
              >
                <Settings className="h-4 w-4 ml-1" />
                ניהול
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="ml-2">
                  <UserCircle className="h-5 w-5 ml-1" />
                  {user?.full_name || user?.username || user?.email || 'משתמש'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>החשבון שלי</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="ml-2 h-4 w-4" />
                  פרופיל משתמש
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="ml-2 h-4 w-4" />
                  התנתק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
