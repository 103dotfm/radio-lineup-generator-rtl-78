import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Calendar, Clock, SortAsc, List, LogOut, Settings } from "lucide-react";
import { getShows, searchShows } from '@/lib/supabase/shows';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

type SortOption = 'recent' | 'date' | 'time' | 'name' | 'modified';

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows', searchQuery],
    queryFn: () => searchQuery ? searchShows(searchQuery) : getShows(),
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sortedShows = React.useMemo(() => {
    if (!shows) return [];
    const sortedData = [...shows];
    
    switch (sortBy) {
      case 'date':
        return sortedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'time':
        return sortedData.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      case 'name':
        return sortedData.sort((a, b) => a.name.localeCompare(b.name));
      case 'modified':
        return sortedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'recent':
      default:
        return sortedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [shows, sortBy]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">מערכת ליינאפים - 103fm</h1>
        <div className="flex gap-4">
          {isAdmin && (
            <Button 
              onClick={() => navigate('/admin')} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              ניהול מערכת
            </Button>
          )}
          <Button onClick={() => navigate('/new')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            ליינאפ חדש
          </Button>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            התנתקות
          </Button>
        </div>
      </div>

      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם תוכנית, תאריך או פריט..."
            value={searchQuery}
            onChange={handleSearch}
            className="pl-4 pr-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            onClick={() => setSortBy('recent')}
            size="sm"
          >
            אחרון
          </Button>
          <Button
            variant={sortBy === 'date' ? 'default' : 'outline'}
            onClick={() => setSortBy('date')}
            size="sm"
          >
            <Calendar className="h-4 w-4 ml-2" />
            תאריך
          </Button>
          <Button
            variant={sortBy === 'time' ? 'default' : 'outline'}
            onClick={() => setSortBy('time')}
            size="sm"
          >
            <Clock className="h-4 w-4 ml-2" />
            שעה
          </Button>
          <Button
            variant={sortBy === 'name' ? 'default' : 'outline'}
            onClick={() => setSortBy('name')}
            size="sm"
          >
            <SortAsc className="h-4 w-4 ml-2" />
            שם
          </Button>
          <Button
            variant={sortBy === 'modified' ? 'default' : 'outline'}
            onClick={() => setSortBy('modified')}
            size="sm"
          >
            עודכן
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">טוען...</div>
      ) : !searchQuery ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedShows.map((show) => (
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
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right font-bold dashboard-header-name">מרואיינ/ת</TableHead>
              <TableHead className="text-right font-bold dashboard-header-title">כותרת</TableHead>
              <TableHead className="text-right font-bold dashboard-header-phone">טלפון</TableHead>
              <TableHead className="text-right font-bold dashboard-header-show">שם תוכנית</TableHead>
              <TableHead className="text-right font-bold dashboard-header-date">תאריך</TableHead>
              <TableHead className="text-right font-bold dashboard-header-actions">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedShows.flatMap(show => 
              (show.guests || []).map((guest, index) => (
                <TableRow key={`${show.id}-${index}`}>
                  <TableCell>{guest.name}</TableCell>
                  <TableCell>{guest.title}</TableCell>
                  <TableCell>{guest.phone}</TableCell>
                  <TableCell>{show.name}</TableCell>
                  <TableCell>
                    {show.date ? format(new Date(show.date), 'dd/MM/yyyy') : 'ללא תאריך'}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/show/${show.id}`)}
                    >
                      צפייה בליינאפ
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      
      <div className="flex justify-center mt-12">
        <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="h-12 opacity-50 dashboard-logo footer-logo" />
      </div>
      <div className="flex justify-center mt-12">
        <div className="credit">הקמת מערכת: <a href="https://Yaniv.TV" target="_blank">יניב מורוזובסקי</a></div>
      </div>
    </div>
  );
};

export default Dashboard;