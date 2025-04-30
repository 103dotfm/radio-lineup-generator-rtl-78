
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Calendar, List, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { Show } from "@/types/show";
import { SortOption } from './types';
import { Button } from "@/components/ui/button";

interface LineupCardsProps {
  shows: Show[];
  isAdmin: boolean;
  handleDelete: (showId: string) => void;
  sortBy: SortOption;
  setSortBy: (sortBy: SortOption) => void;
  isLoading: boolean;
}

const LineupCards = ({ shows, isAdmin, handleDelete, sortBy, setSortBy, isLoading }: LineupCardsProps) => {
  const navigate = useNavigate();
  
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">ליינאפים אחרונים שנערכו במערכת</h2>

      {isLoading ? (
        <div className="text-center py-8">טוען...</div>
      ) : (
        shows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">לא נמצאו ליינאפים</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shows.slice(0, 6).map(show => (
              <Card key={show.id} className="p-5 hover:shadow-md transition-all bg-white border-slate-100">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg">{show.name || 'ללא שם'}</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-gray-500 flex items-center">
                      <Calendar className="h-4 w-4 ml-1" />
                      {show.date ? format(new Date(show.date), 'dd/MM/yyyy') : 'ללא תאריך'}
                    </div>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(show.id);
                        }} 
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div 
                  className="cursor-pointer hover:bg-slate-50 transition-colors p-2 rounded-md" 
                  onClick={() => navigate(`/show/${show.id}`)}
                >
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <List className="h-4 w-4" />
                    <span>{show.time || 'ללא שעה'}</span>
                  </div>
                  {show.notes && (
                    <p 
                      className="mt-2 text-sm text-gray-600 line-clamp-2" 
                      dangerouslySetInnerHTML={{
                        __html: show.notes
                      }} 
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default LineupCards;
