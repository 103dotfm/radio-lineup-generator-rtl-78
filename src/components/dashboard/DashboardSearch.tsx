
import React from 'react';
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface DashboardSearchProps {
  searchQuery: string;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isVisible: boolean;
}

const DashboardSearch = ({ searchQuery, handleSearch, isVisible }: DashboardSearchProps) => {
  if (!isVisible) return null;
  
  return (
    <div className="mb-8 animate-fade-in">
      <div className="relative mb-4">
        <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
        <Input 
          placeholder="חיפוש לפי שם תוכנית, תאריך או פריט..." 
          value={searchQuery} 
          onChange={handleSearch} 
          className="pl-4 pr-10 shadow-sm border-slate-200" 
        />
      </div>
    </div>
  );
};

export default DashboardSearch;
