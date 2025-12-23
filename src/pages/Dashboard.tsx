import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { getShows, searchShows, deleteShow } from '@/lib/supabase/shows';
import { SortOption } from '@/components/dashboard/types';
import { Search as DashboardSearchIcon } from "lucide-react";
import UserMenu from "@/components/UserMenu";
import { Button } from '@/components/ui/button';

// Import the extracted components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardNav from '@/components/dashboard/DashboardNav';
import DashboardSearch from '@/components/dashboard/DashboardSearch';
import SearchResultsTable from '@/components/dashboard/SearchResultsTable';
import ScheduleSection from '@/components/dashboard/ScheduleSection';
import LineupCards from '@/components/dashboard/LineupCards';
import { StorageWarning } from '@/components/dashboard/StorageWarning';
import { getStorageUsage } from '@/lib/api/storage-management';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const queryClient = useQueryClient();

  // Refs for scroll functionality
  const scheduleRef = useRef<HTMLDivElement>(null);
  const lineupsRef = useRef<HTMLDivElement>(null);

  const { data: shows, isLoading } = useQuery({
    queryKey: ['shows', searchQuery],
    queryFn: () => {
      if (searchQuery && searchQuery.trim().length >= 2) {
        return searchShows(searchQuery);
      } else {
        return getShows(20); // Fetch at least 20 shows to ensure we have enough for the latest 6
      }
    },
    staleTime: 30000, // 30 seconds stale time to reduce frequent refetches
    refetchOnWindowFocus: true
  });

  // Fetch storage usage for admins
  const { data: storageUsage } = useQuery({
    queryKey: ['storage-usage-dashboard'],
    queryFn: getStorageUsage,
    enabled: isAdmin,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 60000 // 1 minute stale time
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

  const toggleSearch = () => {
    setIsSearchVisible(prev => !prev);
    if (!isSearchVisible) {
      // Reset search when opening
      setSearchQuery('');
    }
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
    <div className="space-y-8 animate-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">סקירה כללית</h1>
        <div className="flex items-center gap-4">
          <Button onClick={toggleSearch} variant="ghost" size="icon" className="rounded-full hover:bg-white/50">
            <DashboardSearchIcon className="h-5 w-5" />
          </Button>
          <UserMenu />
        </div>
      </div>

      {/* Storage Warning for Admins */}
      {isAdmin && storageUsage && (
        <StorageWarning usagePercent={storageUsage.usePercent} />
      )}

      <DashboardSearch
        searchQuery={searchQuery}
        handleSearch={handleSearch}
        isVisible={isSearchVisible}
      />

      {searchQuery && searchQuery.trim().length >= 2 && isSearchVisible && (
        <SearchResultsTable shows={sortedShows} isLoading={isLoading && searchQuery.length > 0} />
      )}

      {searchQuery && searchQuery.trim().length === 1 && isSearchVisible && (
        <div className="mb-8 text-center py-8 text-gray-500">
          אנא הקלד לפחות 2 תווים לחיפוש
        </div>
      )}

      <div ref={scheduleRef} className="mb-12">
        <ScheduleSection isAdmin={isAdmin} />
      </div>

      <div ref={lineupsRef} className="mb-12">
        <LineupCards
          shows={sortedShows}
          isAdmin={isAdmin}
          handleDelete={handleDelete}
          sortBy={sortBy}
          setSortBy={setSortBy}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default Dashboard;
