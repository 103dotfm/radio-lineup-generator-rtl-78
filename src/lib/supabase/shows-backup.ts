import { api } from "@/lib/api-client";
import { Show } from "@/types/show";

export interface ShowBackup {
  id: string;
  name: string;
  date?: string;
  time?: string;
  notes?: string;
  created_at?: string;
  slot_id?: string;
}

export interface ShowItemBackup {
  id: string;
  show_id: string;
  position: number;
  name: string;
  title?: string;
  details?: string;
  phone?: string;
  duration?: number;
  is_break?: boolean;
  is_note?: boolean;
  is_divider?: boolean;
  created_at?: string;
  show?: ShowBackup;
}

export const getShowsBackup = async (): Promise<ShowBackup[]> => {
  console.log('Fetching shows from backup...');
  const { data: showsData, error } = await api.query('/shows-backup', {
    order: { created_at: 'desc' },
    limit: 20
  });

  if (error) {
    console.error('Error fetching shows from backup:', error);
    throw error;
  }

  console.log('Fetched shows from backup count:', showsData?.length);
  return showsData || [];
};

export const searchShowsBackup = async (query: string): Promise<ShowBackup[]> => {
  console.log('Searching shows in backup with query:', query);
  
  try {
    const { data: shows, error } = await api.query('/shows-backup/search', {
      query
    });

    if (error) {
      console.error('Error searching shows in backup:', error);
      throw error;
    }

    console.log('Search results from backup:', shows?.length);
    return shows || [];
  } catch (error) {
    console.error('Error searching shows in backup:', error);
    throw error;
  }
};

export const getShowBackupWithItems = async (showId: string) => {
  console.log('Fetching show from backup with ID:', showId);
  
  if (!showId) {
    console.error('No show ID provided');
    throw new Error('No show ID provided');
  }

  const { data: shows, error: showError } = await api.query('/shows-backup', {
    where: { id: showId }
  });

  if (showError) {
    console.error('Error fetching show from backup:', showError);
    throw showError;
  }

  const show = shows?.[0];
  if (!show) {
    return null;
  }

  const { data: items, error: itemsError } = await api.query('/shows-backup/' + showId + '/items');

  if (itemsError) {
    console.error('Error fetching show items from backup:', itemsError);
    throw itemsError;
  }

  console.log('Retrieved items from backup database:', items?.map(item => ({
    id: item.id,
    name: item.name,
    is_divider: item.is_divider,
    is_break: item.is_break,
    is_note: item.is_note
  })));

  return {
    show,
    items: items || []
  };
};

export const searchShowItemsBackup = async (query: string): Promise<ShowItemBackup[]> => {
  console.log('Searching show items in backup with query:', query);
  
  try {
    const { data: items, error } = await api.query('/show-items-search/with-shows', {
      query,
      limit: 50
    });

    if (error) {
      console.error('Error searching show items in backup:', error);
      throw error;
    }

    console.log('Search results for items from backup:', items?.length);
    return items || [];
  } catch (error) {
    console.error('Error searching show items in backup:', error);
    throw error;
  }
};

export const getLatestShowsBackup = async (limit: number = 6): Promise<ShowBackup[]> => {
  console.log('Fetching latest shows from backup...');
  const { data: showsData, error } = await api.query('/shows-backup', {
    order: { created_at: 'desc' },
    limit
  });

  if (error) {
    console.error('Error fetching latest shows from backup:', error);
    throw error;
  }

  console.log('Fetched latest shows from backup count:', showsData?.length);
  return showsData || [];
}; 