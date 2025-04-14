// src/pages/Dashboard.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday, addDays, isTomorrow, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { CalendarIcon, ClockIcon, Edit2, LayoutList, Plus } from 'lucide-react';
import DashboardHeader from '@/components/DashboardHeader';

interface Show {
  id: string;
  name: string;
  date: string;
  time: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<'recent' | 'upcoming' | 'all'>('recent');

  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows', filter],
    queryFn: async () => {
      const today = new Date();
      
      let query = supabase
        .from('shows')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      
      if (filter === 'recent') {
        // Recent shows include yesterday, today, and upcoming days
        const yesterday = format(addDays(today, -1), 'yyyy-MM-dd');
        query = query.gte('date', yesterday);
      } else if (filter === 'upcoming') {
        // Only future shows
        const todayStr = format(today, 'yyyy-MM-dd');
        query = query.gte('date', todayStr);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching shows:', error);
        throw error;
      }
      
      return data as Show[];
    },
  });

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      
      if (isToday(date)) {
        return 'היום';
      } else if (isYesterday(date)) {
        return 'אתמול';
      } else if (isTomorrow(date)) {
        return 'מחר';
      } else {
        return format(date, 'EEEE, d בMMMM', { locale: he });
      }
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <DashboardHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">שלום!</h1>
            <p className="text-gray-600">צור ליינאפים לתוכניות הרדיו שלך בקלות</p>
          </div>
          
          <div className="flex space-x-2 space-x-reverse mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={() => navigate('/new')}
              className="mr-2"
            >
              <Plus className="ml-1 h-4 w-4" />
              צור ליינאפ חדש
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/schedule')}
            >
              <LayoutList className="ml-1 h-4 w-4" />
              לוח שידורים
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4 flex space-x-2 space-x-reverse">
            <Button
              variant={filter === 'recent' ? 'default' : 'outline'}
              onClick={() => setFilter('recent')}
              className="mr-2"
            >
              ליינאפים אחרונים
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setFilter('upcoming')}
              className="mr-2"
            >
              ליינאפים עתידיים
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              כל הליינאפים
            </Button>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent inline-block"></div>
              <p className="mt-2 text-gray-500">טוען ליינאפים...</p>
            </div>
          ) : shows?.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 p-4 rounded-lg inline-block mb-4">
                <LayoutList className="h-12 w-12 text-gray-400 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">אין ליינאפים</h3>
              <p className="mt-1 text-gray-500">לא נמצאו ליינאפים תחת הסינון הנוכחי.</p>
              <Button className="mt-4" onClick={() => navigate('/new')}>
                צור ליינאפ חדש
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תוכנית
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      תאריך
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      שעה
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      פעולות
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {shows?.map((show) => (
                    <tr key={show.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{show.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700 flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 ml-1" />
                          {formatDate(show.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700 flex items-center">
                          <ClockIcon className="h-4 w-4 text-gray-400 ml-1" />
                          {show.time || 'לא הוגדר'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/show/${show.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit2 className="h-4 w-4 ml-1" />
                          ערוך
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
