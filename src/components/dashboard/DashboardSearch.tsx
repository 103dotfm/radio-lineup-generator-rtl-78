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
    <div className="mb-8 animate-in" style={{ animationDelay: '0.1s' }}>
      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="חיפוש לפי שם תוכנית, תאריך או פריט..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-6 pr-12 h-14 glass-card rounded-2xl border-none text-lg focus-visible:ring-2 focus-visible:ring-primary/20 transition-all premium-shadow"
        />
        {searchQuery && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            Searching...
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardSearch;
