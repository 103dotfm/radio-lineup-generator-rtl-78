import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Calendar, List } from "lucide-react";
import { getShows, searchShows } from '@/lib/supabase/shows';
import { format } from 'date-fns';

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows', searchQuery],
    queryFn: () => searchQuery ? searchShows(searchQuery) : getShows(),
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">ליינאפ רדיו</h1>
        <Button onClick={() => navigate('/new')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          ליינאפ חדש
        </Button>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חפש לפי שם תוכנית, תאריך או פריט..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-4 pr-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">טוען...</div>
      ) : shows?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          לא נמצאו תוכניות
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shows?.map((show) => (
            <Card 
              key={show.id} 
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/show/${show.id}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{show.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {show.date ? format(new Date(show.date), 'dd/MM/yyyy') : 'ללא תאריך'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <List className="h-4 w-4" />
                <span>{show.time || 'ללא שעה'}</span>
              </div>
              {show.notes && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2"
                   dangerouslySetInnerHTML={{ __html: show.notes }} />
              )}
            </Card>
          ))}
        </div>
      )}
      
      <div className="flex justify-center mt-12">
        <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="h-12 opacity-50" />
      </div>
    </div>
  );
};

export default Dashboard;