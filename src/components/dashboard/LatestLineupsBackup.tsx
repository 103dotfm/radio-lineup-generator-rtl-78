import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Calendar, List, Clock, Archive } from "lucide-react";
import { format } from 'date-fns';
import { ShowBackup } from "@/lib/supabase/shows-backup";
import { sanitizeNotes } from '@/utils/sanitize';

interface LatestLineupsBackupProps {
  shows: ShowBackup[];
  isLoading: boolean;
}

const LatestLineupsBackup = ({ shows, isLoading }: LatestLineupsBackupProps) => {
  const navigate = useNavigate();
  
  const handleShowClick = (show: ShowBackup) => {
    // Navigate to a backup show view
    navigate(`/backup-show/${show.id}`);
  };
  
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Archive className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-semibold">ליינאפים אחרונים מ-Lovable</h2>
      </div>

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
                  <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    <Archive className="h-3 w-3" />
                    <span>Lovable</span>
                  </div>
                </div>
                <div 
                  className="cursor-pointer hover:bg-slate-50 transition-colors p-2 rounded-md" 
                  onClick={() => handleShowClick(show)}
                >
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Calendar className="h-4 w-4" />
                    {show.date ? format(new Date(show.date), 'dd/MM/yyyy') : 'ללא תאריך'}
                  </div>
                  {show.time && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Clock className="h-4 w-4" />
                      <span>{show.time}</span>
                    </div>
                  )}
                  {show.notes && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <List className="h-4 w-4" />
                      <span>הערות</span>
                    </div>
                  )}
                  {show.notes && (
                    <p 
                      className="mt-2 text-sm text-gray-600 line-clamp-3" 
                      dangerouslySetInnerHTML={{
                        __html: sanitizeNotes(show.notes || '')
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

export default LatestLineupsBackup; 