
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Calendar, LayoutList, Search, Layers } from "lucide-react";

interface DashboardNavProps {
  onScrollToSchedule: () => void;
  onScrollToLineups: () => void;
  onOpenSearch: () => void;
}

const DashboardNav = ({ onScrollToSchedule, onScrollToLineups, onOpenSearch }: DashboardNavProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-8 py-3 bg-slate-100 rounded-lg">
      <Button 
        variant="ghost" 
        onClick={onScrollToSchedule}
        className="flex items-center gap-2"
      >
        <Calendar className="h-4 w-4" />
        לוח שידורים
      </Button>
      
      <Button 
        variant="ghost" 
        asChild
        className="flex items-center gap-2"
      >
        <Link to="/schedule">
          <LayoutList className="h-4 w-4" />
          סידורי עבודה
        </Link>
      </Button>
      
      <Button 
        variant="ghost" 
        onClick={onOpenSearch}
        className="flex items-center gap-2"
      >
        <Search className="h-4 w-4" />
        ספר טלפונים
      </Button>
      
      <Button 
        variant="ghost" 
        onClick={onScrollToLineups}
        className="flex items-center gap-2"
      >
        <Layers className="h-4 w-4" />
        ליינאפים אחרונים
      </Button>
    </div>
  );
};

export default DashboardNav;
