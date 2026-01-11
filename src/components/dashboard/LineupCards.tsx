import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Calendar, List, Trash2, Archive } from "lucide-react";
import { format } from 'date-fns';
import { Show } from "@/types/show";
import { SortOption } from './types';
import { Button } from "@/components/ui/button";
import { sanitizeNotes } from '@/utils/sanitize';

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
    <div className="animate-in" style={{ animationDelay: '0.2s' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 id="lineups" className="text-2xl font-bold tracking-tight text-slate-800">ליינאפים אחרונים</h2>
        <div className="flex items-center gap-2 bg-white/50 p-1 rounded-lg border border-slate-200">
          <Button
            variant={sortBy === 'recent' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('recent')}
            className="text-xs h-8"
          >
            אחרונים
          </Button>
          <Button
            variant={sortBy === 'date' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('date')}
            className="text-xs h-8"
          >
            לפי תאריך
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        shows.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-slate-500">
            <Archive className="h-12 w-12 mx-auto mb-4 opacity-20" />
            לא נמצאו ליינאפים במערכת
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shows.slice(0, 6).map((show, index) => (
              <Card
                key={show.id}
                className="group glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 cursor-pointer border-none premium-shadow"
                onClick={() => navigate(`/show/${show.id}`)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-xl text-slate-800 group-hover:text-primary transition-colors line-clamp-1">
                        {show.name || 'ללא שם'}
                      </h3>
                      <div className="flex items-center gap-3 text-slate-400 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{show.date ? format(new Date(show.date), 'dd/MM/yyyy') : 'ללא תאריך'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <List className="h-4 w-4" />
                          <span>{show.time || '--:--'}</span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && !show.is_backup && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => {
                          e.stopPropagation();
                          handleDelete(show.id);
                        }}
                        className="text-slate-300 hover:text-destructive hover:bg-destructive/5 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {show.notes ? (
                    <div className="relative">
                      <p
                        className="text-sm text-slate-600 line-clamp-3 leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeNotes(show.notes || '')
                        }}
                      />
                      <div className="absolute bottom-0 right-0 left-0 h-6 bg-gradient-to-t from-white/70 to-transparent" />
                    </div>
                  ) : (
                    <div className="h-12 flex items-center text-slate-300 text-sm italic">
                      אין הערות נוספות
                    </div>
                  )}
                </div>

                <div className="px-6 py-3 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <span>ID: {show.id.slice(0, 8)}</span>
                  {show.is_backup && (
                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Backup</span>
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
