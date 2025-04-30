
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, List, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { Show } from "@/types/show";
import { SortOption } from './types';

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
      <h2 className="text-2xl font-semibold mb-4">ליינאפים אחרונים שנערכו במערכת</h2>
      
      <div className="flex gap-2 mb-4">
        <Button variant={sortBy === 'recent' ? 'default' : 'outline'} onClick={() => setSortBy('recent')} size="sm">
          אחרון
        </Button>
        <Button variant={sortBy === 'date' ? 'default' : 'outline'} onClick={() => setSortBy('date')} size="sm">
          <Calendar className="h-4 w-4 ml-2" />
          תאריך
        </Button>
        <Button variant={sortBy === 'time' ? 'default' : 'outline'} onClick={() => setSortBy('time')} size="sm">
          <Calendar className="h-4 w-4 ml-2" />
          שעה
        </Button>
        <Button variant={sortBy === 'name' ? 'default' : 'outline'} onClick={() => setSortBy('name')} size="sm">
          <Calendar className="h-4 w-4 ml-2" />
          שם
        </Button>
        <Button variant={sortBy === 'modified' ? 'default' : 'outline'} onClick={() => setSortBy('modified')} size="sm">
          עודכן
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">טוען...</div>
      ) : (
        shows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">לא נמצאו ליינאפים</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shows.slice(0, 6).map(show => (
              <Card key={show.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-2">
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
                <div className="cursor-pointer" onClick={() => navigate(`/show/${show.id}`)}>
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
