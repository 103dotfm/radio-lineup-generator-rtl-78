import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Calendar, LayoutList, Search, Layers, Clock, Gift } from "lucide-react";

interface DashboardNavProps {
  onScrollToSchedule: () => void;
  onScrollToLineups: () => void;
  onToggleSearch: () => void;
  searchVisible: boolean;
}

const DashboardNav = ({ onScrollToSchedule, onScrollToLineups, onToggleSearch, searchVisible }: DashboardNavProps) => {
  return (
    <div className="mb-8 py-4 bg-white rounded-lg shadow-sm">
      {/* Desktop Navigation */}
      <div className="hidden md:flex flex-wrap justify-center gap-2 md:gap-4">
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
          asChild
          className="flex items-center gap-2 hover:bg-slate-100"
        >
          <Link to="/studio-schedule">
            <Clock className="h-4 w-4" />
            לוח אולפנים
          </Link>
        </Button>
        
        <Button 
          variant="ghost" 
          asChild
          className="flex items-center gap-2 hover:bg-slate-100"
        >
          <Link to="/prizes">
            <Gift className="h-4 w-4" />
            ניהול פרסים
          </Link>
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

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="ghost" 
            onClick={onScrollToSchedule}
            className="flex flex-col items-center gap-1 py-3 text-sm"
          >
            <Calendar className="h-5 w-5" />
            <span>לוח שידורים</span>
          </Button>
          
          <Button 
            variant="ghost" 
            asChild
            className="flex flex-col items-center gap-1 py-3 text-sm"
          >
            <Link to="/schedule">
              <LayoutList className="h-5 w-5" />
              <span>סידורי עבודה</span>
            </Link>
          </Button>
          
          <Button 
            variant={searchVisible ? "secondary" : "ghost"} 
            onClick={onToggleSearch}
            className="flex flex-col items-center gap-1 py-3 text-sm"
          >
            <Search className="h-5 w-5" />
            <span>ספר טלפונים</span>
          </Button>
          
          <Button 
            variant="ghost" 
            asChild
            className="flex flex-col items-center gap-1 py-3 text-sm"
          >
            <Link to="/studio-schedule">
              <Clock className="h-5 w-5" />
              <span>לוח אולפנים</span>
            </Link>
          </Button>
          
          <Button 
            variant="ghost" 
            asChild
            className="flex flex-col items-center gap-1 py-3 text-sm"
          >
            <Link to="/prizes">
              <Gift className="h-5 w-5" />
              <span>ניהול פרסים</span>
            </Link>
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={onScrollToLineups}
            className="flex flex-col items-center gap-1 py-3 text-sm"
          >
            <Layers className="h-5 w-5" />
            <span>ליינאפים אחרונים</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardNav;
