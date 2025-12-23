import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Calendar, User, Phone, Clock, Archive, ExternalLink } from "lucide-react";
import { format } from 'date-fns';
import { ShowItemBackup } from "@/lib/supabase/shows-backup";

interface SearchResultsBackupProps {
  items: ShowItemBackup[];
  isLoading: boolean;
  searchQuery: string;
}

const SearchResultsBackup = ({ items, isLoading, searchQuery }: SearchResultsBackupProps) => {
  const navigate = useNavigate();
  
  const handleItemClick = (item: ShowItemBackup) => {
    if (item.show) {
      navigate(`/backup-show/${item.show.id}`);
    }
  };
  
  const handleShowClick = (show: any) => {
    navigate(`/backup-show/${show.id}`);
  };
  
  if (!searchQuery) return null;
  
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Archive className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">תוצאות חיפוש מ-Lovable</h3>
      </div>

      {isLoading ? (
        <div className="text-center py-8">מחפש...</div>
      ) : (
        items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">לא נמצאו תוצאות</div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <Card key={item.id} className="p-4 hover:shadow-md transition-all bg-white border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-1">{item.name}</h4>
                    {item.title && (
                      <p className="text-sm text-gray-600 mb-2">{item.title}</p>
                    )}
                    {item.details && (
                      <p className="text-sm text-gray-500 line-clamp-2">{item.details}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">
                    <Archive className="h-3 w-3" />
                    <span>Lovable</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  {item.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <span>{item.phone}</span>
                    </div>
                  )}
                  {item.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{item.duration} דקות</span>
                    </div>
                  )}
                </div>
                
                {item.show && (
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>מתוכנית: {item.show.name}</span>
                        {item.show.date && (
                          <span>• {format(new Date(item.show.date), 'dd/MM/yyyy')}</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowClick(item.show);
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>צפה בתוכנית</span>
                      </button>
                    </div>
                  </div>
                )}
                
                <div 
                  className="cursor-pointer hover:bg-slate-50 transition-colors p-2 rounded-md mt-2" 
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="h-4 w-4" />
                    <span>צפה בפרטים</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default SearchResultsBackup; 