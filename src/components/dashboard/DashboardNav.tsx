
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Calendar, LayoutList, Search, Layers } from "lucide-react";

interface DashboardNavProps {
  onScrollToSchedule: () => void;
  onScrollToLineups: () => void;
  onToggleSearch: () => void;
  searchVisible: boolean;
}

const DashboardNav = ({ onScrollToSchedule, onScrollToLineups, onToggleSearch, searchVisible }: DashboardNavProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 py-4 bg-white rounded-lg shadow-sm">
      <Button 
        variant="ghost" 
        onClick={onScrollToSchedule}
        className="flex items-center gap-2 hover:bg-slate-100"
      >
        <Calendar className="h-4 w-4" />
        לוח שידורים
      </Button>
      
      <Button 
        variant="ghost" 
        asChild
        className="flex items-center gap-2 hover:bg-slate-100"
      >
        <Link to="/schedule">
          <LayoutList className="h-4 w-4" />
          סידורי עבודה
        </Link>
      </Button>
      
      <Button 
        variant={searchVisible ? "secondary" : "ghost"} 
        onClick={onToggleSearch}
        className="flex items-center gap-2"
      >
        <Search className="h-4 w-4" />
        ספר טלפונים
      </Button>
      
      <Button 
        variant="ghost" 
        onClick={onScrollToLineups}
        className="flex items-center gap-2 hover:bg-slate-100"
      >
        <Layers className="h-4 w-4" />
        ליינאפים אחרונים
      </Button>
    </div>
  );
};

export default DashboardNav;
