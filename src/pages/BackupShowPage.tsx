import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getShowBackupWithItems } from '@/lib/supabase/shows-backup';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, List, ArrowLeft, Archive, User, Phone, Clock as ClockIcon } from "lucide-react";
import { format } from 'date-fns';

const BackupShowPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: showData, isLoading, error } = useQuery({
    queryKey: ['backup-show', id],
    queryFn: () => getShowBackupWithItems(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/50 backdrop-blur-md rounded-2xl border border-slate-100 shadow-xl animate-pulse">
          <div className="w-4 h-4 rounded-full bg-primary animate-bounce"></div>
          <span className="font-black text-slate-800">טוען נתוני ארכיון...</span>
        </div>
      </div>
    );
  }

  if (error || !showData) {
    return (
      <div className="container mx-auto py-12 px-4 text-center">
        <div className="inline-flex flex-col items-center gap-4 px-8 py-8 bg-red-50 rounded-[2.5rem] border border-red-100 shadow-2xl">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center text-red-500">
            <Archive className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-red-900 tracking-tight">שגיאה בטעינת התוכנית</h2>
          <Button variant="ghost" onClick={() => navigate('/')} className="text-red-600 hover:bg-red-100/50">חזרה ללוח הבקרה</Button>
        </div>
      </div>
    );
  }

  const { show, items } = showData;

  return (
    <div className="container mx-auto py-12 px-6 animate-in fade-in duration-1000" dir="rtl">
      <div className="mb-10">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          <span className="font-bold">חזרה ללוח הבקרה</span>
        </Button>
      </div>

      <div className="glass-card p-10 rounded-[2.5rem] border-none premium-shadow space-y-8 mb-12">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner">
            <Archive className="h-8 w-8" />
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-2">ארכיון LOVABLE</span>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{show.name}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
          {show.date && (
            <div className="flex items-center gap-4 text-slate-600">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">תאריך</span>
                <span className="font-bold text-lg">{format(new Date(show.date), 'dd/MM/yyyy')}</span>
              </div>
            </div>
          )}
          {show.time && (
            <div className="flex items-center gap-4 text-slate-600">
              <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">שעה</span>
                <span className="font-bold text-lg">{show.time}</span>
              </div>
            </div>
          )}
          <div className="flex items-center gap-4 text-blue-600">
            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Archive className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">מקור</span>
              <span className="font-black text-lg">Lovable Snapshot</span>
            </div>
          </div>
        </div>

        {show.notes && (
          <div className="mt-8 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-4 text-slate-400">
              <List className="h-4 w-4" />
              <h3 className="text-xs font-black uppercase tracking-widest">הערות תוכנית</h3>
            </div>
            <div
              className="text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: show.notes }}
            />
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight whitespace-nowrap">תוכן התוכנית
            <span className="mr-3 text-slate-300 font-light text-xl">({items.length} פריטים)</span>
          </h2>
          <div className="h-px w-full bg-slate-100"></div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-[2rem] border-dashed border-slate-200 bg-slate-50/30">
            <p className="text-slate-400 font-bold">לא נמצא תוכן לתוכנית זו</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item, index) => (
              <div key={item.id} className="glass-card p-6 rounded-[1.5rem] border-none shadow-sm hover:shadow-xl hover:translate-y-[-2px] transition-all bg-white/60 group">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-slate-200">
                        {item.position}
                      </span>
                      <h3 className="font-black text-xl text-slate-900">{item.name}</h3>

                      <div className="flex gap-2">
                        {Boolean(item.is_break) && (
                          <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200 uppercase tracking-wider">הפסקה</span>
                        )}
                        {Boolean(item.is_note) && (
                          <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">הערה</span>
                        )}
                        {Boolean(item.is_divider) && (
                          <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 uppercase tracking-wider">מפריד</span>
                        )}
                      </div>
                    </div>

                    {item.title && (
                      <p className="text-slate-500 font-bold text-lg leading-tight">{item.title}</p>
                    )}

                    {item.details && (
                      <div className="text-slate-400 text-sm leading-relaxed max-w-3xl" dangerouslySetInnerHTML={{ __html: item.details }}></div>
                    )}

                    <div className="flex flex-wrap items-center gap-6 pt-4 text-sm text-slate-400 border-t border-slate-100/50 group-hover:border-slate-100 transition-colors">
                      {item.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span className="font-mono font-medium">{item.phone}</span>
                        </div>
                      )}
                      {item.duration && (
                        <div className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          <span className="font-bold">{item.duration} דקות</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupShowPage; 