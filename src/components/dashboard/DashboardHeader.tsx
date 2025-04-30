
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import UserMenu from "@/components/UserMenu";

interface DashboardHeaderProps {
  isAdmin: boolean;
}

const DashboardHeader = ({ isAdmin }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between items-center mb-6">
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
  );
};

export default DashboardHeader;
