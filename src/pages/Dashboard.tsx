// src/pages/Dashboard.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LayoutList, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import DashboardHeader from '@/components/DashboardHeader';
import { Show } from '@/types/show';

const Dashboard = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'recent'>('all');

  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows', filter],
    queryFn: async () => {
      let query = supabase
        .from('shows')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      
      if (filter === 'recent') {
        // Recent shows
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        query = query.gte('date', todayStr);
      } else if (filter === 'upcoming') {
        // Only future shows
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <DashboardHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">שלום!</h1>
            <p className="text-gray-600">צור ליינאפים לתוכניות הרדיו שלך בקלות</p>
          </div>
          
          <div className="flex space-x-2 space-x-reverse">
            <Button
              variant="outline"
              onClick={() => navigate('/schedule')}
              className="mr-2"
            >
              <LayoutList className="ml-1 h-4 w-4" />
              לוח שידורים
            </Button>
            <Button 
              onClick={() => navigate('/new')}
            >
              <Plus className="ml-1 h-4 w-4" />
              צור ליינאפ חדש
            </Button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4 flex space-x-2 space-x-reverse">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="mr-2"
            >
              כל הליינאפים
            </Button>
            <Button
              variant={filter === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setFilter('upcoming')}
              className="mr-2"
            >
              ליינאפים עתידיים
            </Button>
            <Button
              variant={filter === 'recent' ? 'default' : 'outline'}
              onClick={() => setFilter('recent')}
            >
              ליינאפים אחרונים
            </Button>
          </div>
          
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent inline-block"></div>
              <p className="mt-2 text-gray-500">טוען ליינאפים...</p>
            </div>
          ) : shows?.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-100 p-8 rounded-lg inline-block mb-4">
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
                        <div className="text-sm text-gray-700">{show.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{show.time || 'לא הוגדר'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/show/${show.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
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
