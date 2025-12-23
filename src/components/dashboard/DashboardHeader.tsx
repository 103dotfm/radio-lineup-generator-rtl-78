
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Plus, Settings, Menu, X } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardHeaderProps {
  isAdmin: boolean;
}

const DashboardHeader = ({ isAdmin }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Get user display name
  const displayName = user?.full_name || user?.email || "משתמש";
  
  return (
    <div className="mb-6">
      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center">
        <h1 className="text-3xl font-bold dashboardTitle">מערכת ליינאפים // 103fm</h1>
        <div className="flex gap-4">
          {isAdmin && <Button onClick={() => navigate('/admin')} variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              ניהול מערכת
            </Button>}
          <Button onClick={() => navigate('/new')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            ליינאפ חדש
          </Button>
          <UserMenu />
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold dashboardTitle">מערכת ליינאפים // 103fm</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="mt-4 bg-white rounded-lg shadow-lg border p-4 space-y-3">
            <Button 
              onClick={() => { navigate('/new'); setMobileMenuOpen(false); }} 
              className="w-full justify-start"
            >
              <Plus className="h-4 w-4 ml-2" />
              ליינאפ חדש
            </Button>
            {isAdmin && (
              <Button 
                onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }} 
                variant="outline" 
                className="w-full justify-start"
              >
                <Settings className="h-4 w-4 ml-2" />
                ניהול מערכת
              </Button>
            )}
            <div className="pt-2 border-t">
              <div className="text-sm text-gray-600 mb-2">מחובר כ:</div>
              <div className="text-sm font-medium mb-2">{displayName}</div>
              <UserMenu />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
