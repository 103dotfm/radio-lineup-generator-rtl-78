
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { getShows, searchShows, deleteShow } from '@/lib/supabase/shows';
import { SortOption } from '@/components/dashboard/types';

// Import the extracted components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardNav from '@/components/dashboard/DashboardNav';
import DashboardSearch from '@/components/dashboard/DashboardSearch';
import SearchResultsTable from '@/components/dashboard/SearchResultsTable';
import ScheduleSection from '@/components/dashboard/ScheduleSection';
import LineupCards from '@/components/dashboard/LineupCards';
import SearchDialog from '@/components/dashboard/SearchDialog';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const queryClient = useQueryClient();
  
  // Refs for scroll functionality
  const scheduleRef = useRef<HTMLDivElement>(null);
  const lineupsRef = useRef<HTMLDivElement>(null);
  
  // Search dialog state
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  
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
  
  // Scroll handlers
  const scrollToSchedule = () => {
    scheduleRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const scrollToLineups = () => {
    lineupsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const openSearchDialog = () => {
    setIsSearchDialogOpen(true);
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
      <DashboardHeader isAdmin={isAdmin} />

      {/* Navigation section */}
      <DashboardNav 
        onScrollToSchedule={scrollToSchedule}
        onScrollToLineups={scrollToLineups}
        onOpenSearch={openSearchDialog}
      />

      <DashboardSearch searchQuery={searchQuery} handleSearch={handleSearch} />

      {searchQuery && <SearchResultsTable shows={sortedShows} />}

      <div ref={scheduleRef}>
        <ScheduleSection isAdmin={isAdmin} />
      </div>

      <div ref={lineupsRef}>
        <LineupCards 
          shows={sortedShows}
          isAdmin={isAdmin}
          handleDelete={handleDelete}
          sortBy={sortBy}
          setSortBy={setSortBy}
          isLoading={isLoading}
        />
      </div>
      
      <div className="flex justify-center mt-12">
        <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="h-12 opacity-50 dashboard-logo footer-logo" />
      </div>
      
      {/* Search Dialog */}
      <SearchDialog 
        isOpen={isSearchDialogOpen} 
        onClose={() => setIsSearchDialogOpen(false)} 
      />
    </div>
  );
};

export default Dashboard;
