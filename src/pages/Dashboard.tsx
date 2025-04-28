import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Calendar, Clock, SortAsc, List, LogOut, Settings, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from 'date-fns';
import { getShows, searchShows, deleteShow } from '@/lib/supabase/shows';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "@/hooks/use-toast";
import { ScheduleView } from '@/components/schedule/ScheduleView';
import UserMenu from "@/components/UserMenu";

type SortOption = 'recent' | 'date' | 'time' | 'name' | 'modified';

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const queryClient = useQueryClient();
  
  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows', searchQuery],
    queryFn: () => searchQuery ? searchShows(searchQuery) : getShows(),
    refetchOnWindowFocus: true
  });
  
  const deleteShowMutation = useMutation({
    mutationFn: (showId: string) => deleteShow(showId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['shows']
      });
      toast({
        title: 'הליינאפ נמחק בהצלחה'
      });
    },
    onError: error => {
      toast({
        title: 'שגיאה במחיקת הליינאפ',
        variant: "destructive"
      });
      console.error('Error deleting show:', error);
    }
  });
  
  const handleDelete = (showId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק ליינאפ זה?')) {
      deleteShowMutation.mutate(showId);
    }
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const sortedShows = React.useMemo(() => {
    if (!shows) return [];
    
    console.log("Sorting shows, total count:", shows.length);
    
    const sortedData = [...shows];
    switch (sortBy) {
      case 'date':
        return sortedData.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
      case 'time':
        return sortedData.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      case 'name':
        return sortedData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      case 'modified':
        return sortedData.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      case 'recent':
      default:
        return sortedData.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
  }, [shows, sortBy]);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <UserMenu />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold dashboardTitle">מערכת ליינאפים // 103fm</h1>
        <div className="flex gap-4">
          {isAdmin && <Button onClick={() => navigate('/admin')} variant="outline" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              ניהול מערכת
            </Button>}
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

      <div className="mb-8">
        <div className="relative mb-4">
          <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          <Input placeholder="חיפוש לפי שם תוכנית, תאריך או פריט..." value={searchQuery} onChange={handleSearch} className="pl-4 pr-10" />
        </div>

        {searchQuery && (
          <div className="mb-8">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right font-bold">מרואיינ/ת</TableHead>
                  <TableHead className="text-right font-bold">כותרת</TableHead>
                  <TableHead className="text-right font-bold">טלפון</TableHead>
                  <TableHead className="text-right font-bold">שם תוכנית</TableHead>
                  <TableHead className="text-right font-bold">תאריך</TableHead>
                  <TableHead className="text-right font-bold">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedShows.flatMap(show => 
                  show.items?.filter(item => !item.is_break && !item.is_note).map((item, index) => (
                    <TableRow key={`${show.id}-${index}`}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.phone}</TableCell>
                      <TableCell>{show.name}</TableCell>
                      <TableCell>
                        {show.date ? format(new Date(show.date), 'dd/MM/yyyy') : 'ללא תאריך'}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/show/${show.id}`)}>
                          צפייה בליינאפ
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) || []
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">לוח שידורים שבועי</h2>
        <ScheduleView selectedDate={new Date()} isAdmin={isAdmin} />
      </div>

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
            <Clock className="h-4 w-4 ml-2" />
            שעה
          </Button>
          <Button variant={sortBy === 'name' ? 'default' : 'outline'} onClick={() => setSortBy('name')} size="sm">
            <SortAsc className="h-4 w-4 ml-2" />
            שם
          </Button>
          <Button variant={sortBy === 'modified' ? 'default' : 'outline'} onClick={() => setSortBy('modified')} size="sm">
            עודכן
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">טוען...</div>
        ) : (
          sortedShows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">לא נמצאו ליינאפים</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedShows.slice(0, 15).map(show => (
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
      
      <div className="flex justify-center mt-12">
        <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="h-12 opacity-50 dashboard-logo footer-logo" />
      </div>
    </div>
  );
};

export default Dashboard;
