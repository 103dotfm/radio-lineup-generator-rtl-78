import { api } from "@/lib/api-client";
import { Show } from "@/types/show";
import { ShowItem } from "@/types/show";

export const getShows = async (limit?: number): Promise<Show[]> => {
  console.log('Fetching shows...');
  try {
    // Clear cache to ensure we get fresh data
    localStorage.removeItem('cachedShows');
    localStorage.removeItem('cachedShowsTimestamp');
    
    // If no valid cache, fetch from API
    const activeShowsResponse = await api.query('/shows', {
      order: { created_at: 'desc' },
      limit: limit || 50 // Get more shows by default
    });
    
    // Check if response contains data in the expected format
    const activeShows = Array.isArray(activeShowsResponse.data) ? activeShowsResponse.data : [];
    
    console.log('Fetched shows from API:', activeShows.length);
    
    const showIds = activeShows.map(show => show.id);
    let showItems: ShowItem[] = [];
    
    // Split into batches to avoid URI too large errors
    const batchSize = 50;
    for (let i = 0; i < showIds.length; i += batchSize) {
      const batchIds = showIds.slice(i, i + batchSize);
      const batchItemsResponse = await api.query('/show-items', {
        where: { show_id: { in: batchIds } }
      });
      const batchItems = Array.isArray(batchItemsResponse.data) ? batchItemsResponse.data : [];
      showItems = showItems.concat(batchItems);
      console.log(`Fetched batch ${i / batchSize + 1}, items: ${batchItems.length}`);
    }
    
    // Combine current shows (no backup shows since backupShowsData is not defined)
    const allShows = [...activeShows];
    
    // Associate items with their respective shows
    allShows.forEach(show => {
      show.items = showItems.filter(item => item.show_id === show.id);
    });
    
    console.log('Fetched shows count:', allShows.length);
    
    // Cache the results
    localStorage.setItem('cachedShows', JSON.stringify(allShows));
    localStorage.setItem('cachedShowsTimestamp', Date.now().toString());
    
    return allShows;
  } catch (error) {
    console.error('Error fetching shows:', error);
    throw error;
  }
};

export const getShowItems = async (showIds: string[]): Promise<ShowItem[]> => {
  console.log('Fetching show items for shows:', showIds.length);
  
  if (!showIds || showIds.length === 0) {
    return [];
  }

  const BATCH_SIZE = 50; // Define a reasonable batch size
  const results: ShowItem[] = [];

  // Split showIds into smaller batches
  for (let i = 0; i < showIds.length; i += BATCH_SIZE) {
    const batch = showIds.slice(i, i + BATCH_SIZE);
    console.log(`Fetching batch of ${batch.length} shows, starting with ${batch[0].substring(0, 8)}...`);
    
    const { data, error } = await api.query('/show-items', {
      where: { show_id: { in: batch } }
    });

    if (error) {
      console.error('Error fetching show items:', error);
      throw error;
    }

    if (data && data.length > 0) {
      results.push(...data);
    }

    // Add a small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Fetched ${results.length} show items for ${showIds.length} shows`);
  return results;
};

export const searchShows = async (query: string): Promise<Show[]> => {
  console.log('Searching shows with query:', query);
  
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  try {
    // Search current show items with improved filtering
    console.log('Searching current show items with query:', query);
    
    // Get all matching items first
    const { data: allMatchingItems, error: currentItemsError } = await api.query('/show-items', {
      where: {
        or: [
          { name: { ilike: `%${query}%` } },
          { title: { ilike: `%${query}%` } }
        ],
        is_break: false,
        is_note: false
      },
      order: { created_at: 'desc' },
      limit: 500 // Get more items to sort by relevance
    });

    if (currentItemsError) {
      console.error('Error searching current items:', currentItemsError);
      throw currentItemsError;
    }

    // Sort by relevance: exact matches first, then full name matches, then partial matches
    let currentMatchingItems = allMatchingItems || [];
    
    if (currentMatchingItems.length > 0) {
      const exactMatches = [];
      const fullNameMatches = [];
      const partialMatches = [];
      
      const queryLower = query.toLowerCase();
      
      currentMatchingItems.forEach(item => {
        const nameLower = (item.name || '').toLowerCase();
        const titleLower = (item.title || '').toLowerCase();
        
        // Exact match
        if (nameLower === queryLower || titleLower === queryLower) {
          exactMatches.push(item);
        }
        // Full name match (contains the complete query as a substring)
        else if (nameLower.includes(queryLower) || titleLower.includes(queryLower)) {
          fullNameMatches.push(item);
        }
        // Partial match
        else {
          partialMatches.push(item);
        }
      });
      
      // Combine results with exact matches first, then full name matches, then partial matches
      currentMatchingItems = [...exactMatches, ...fullNameMatches, ...partialMatches].slice(0, 200);
    }

    console.log('Current matching items found:', currentMatchingItems?.length || 0);
    if (currentMatchingItems?.length > 0) {
      console.log('Sample current items:', currentMatchingItems.slice(0, 3).map(item => ({
        name: item.name,
        title: item.title,
        created_at: item.created_at
      })));
    }

    // Search backup show items using the dedicated endpoint
    console.log('Searching backup show items...');
    const { data: backupMatchingItems, error: backupItemsError } = await api.query('/show-items-search/with-shows', {
      query,
      limit: 200 // Reduced limit to improve performance and avoid URI length issues
    });

    if (backupItemsError) {
      console.error('Error searching backup items:', backupItemsError);
      // Don't throw error, just log it and continue with current items
    }

    console.log('Backup matching items found:', backupMatchingItems?.length || 0);
    if (backupMatchingItems?.length > 0) {
      console.log('Sample backup items:', backupMatchingItems.slice(0, 3).map(item => ({
        name: item.name,
        title: item.title,
        created_at: item.created_at
      })));
    }

    // Process current items and their shows
    let currentShows: any[] = [];
    if (currentMatchingItems && currentMatchingItems.length > 0) {
      const currentShowIds = [...new Set(currentMatchingItems.map(item => item.show_id))];
      console.log('Current show IDs:', currentShowIds);
      
      if (currentShowIds.length > 0) {
        // Use a Map to avoid duplicates when batching
        const showMap = new Map();
        
        // Split into batches to avoid URI too large errors
        const batchSize = 50;
        for (let i = 0; i < currentShowIds.length; i += batchSize) {
          const batchIds = currentShowIds.slice(i, i + batchSize);
          const { data: shows, error: showsError } = await api.query('/shows', {
            where: {
              id: { in: batchIds }
            }
          });
            
          if (showsError) {
            console.error('Error fetching current shows for items:', showsError);
            throw showsError;
          }
          if (shows) {
            // Add shows to map to avoid duplicates
            shows.forEach(show => {
              if (!showMap.has(show.id)) {
                showMap.set(show.id, show);
              }
            });
          }
          console.log(`Fetched batch ${i / batchSize + 1}, shows: ${shows?.length || 0}`);
        }
        
        // Convert map back to array
        currentShows = Array.from(showMap.values());
        console.log('Total current shows fetched (deduplicated):', currentShows.length);
      }
    }

    // Process backup items and their shows
    let backupShows: any[] = [];
    if (backupMatchingItems && backupMatchingItems.length > 0) {
      // Backup items already come with show information, so we need to extract unique shows
      const backupShowMap = new Map();
      backupMatchingItems.forEach(item => {
        if (item.show && !backupShowMap.has(item.show.id)) {
          backupShowMap.set(item.show.id, { ...item.show, is_backup: true });
        }
      });
      backupShows = Array.from(backupShowMap.values());
      console.log('Backup shows extracted:', backupShows.length);
    }

    const allShows = [...currentShows, ...backupShows];
    console.log('Total shows found:', allShows.length);
    
    if (allShows.length > 0) {
      // Global deduplication: track items by ID across all shows
      const globalItemMap = new Map();
      
      // Transform results to Show objects with ONLY their matching items
      const showsWithMatchingItems = allShows.map(show => {
        let matchingItems: any[] = [];
        
        if (show.is_backup) {
          // For backup shows, filter items that match the query and belong to this show
          matchingItems = (backupMatchingItems || []).filter(item => 
            item.show_id === show.id && 
            (item.name?.toLowerCase().includes(query.toLowerCase()) || 
             item.title?.toLowerCase().includes(query.toLowerCase()))
          );
        } else {
          // For current shows, filter items that match the query and belong to this show
          matchingItems = (currentMatchingItems || []).filter(item => item.show_id === show.id);
        }
        
        // Deduplicate items globally by ID (each item ID should appear only once across all shows)
        const uniqueItems = [];
        
        matchingItems.forEach(item => {
          if (!globalItemMap.has(item.id)) {
            globalItemMap.set(item.id, item);
            uniqueItems.push(item);
          }
        });
        
        return {
          ...show,
          items: uniqueItems // Only include items that match the search query and haven't been seen before
        };
      });
      
      // Sort by relevance first, then by date (newer first)
      const queryLower = query.toLowerCase();
      
      const sortedShows = showsWithMatchingItems.sort((a, b) => {
        // Calculate relevance scores for each show
        const getRelevanceScore = (show) => {
          if (!show.items || show.items.length === 0) return 0;
          
          let maxScore = 0;
          show.items.forEach(item => {
            const nameLower = (item.name || '').toLowerCase();
            const titleLower = (item.title || '').toLowerCase();
            
            // Exact match = 100 points
            if (nameLower === queryLower || titleLower === queryLower) {
              maxScore = Math.max(maxScore, 100);
            }
            // Full name match = 50 points
            else if (nameLower.includes(queryLower) || titleLower.includes(queryLower)) {
              maxScore = Math.max(maxScore, 50);
            }
            // Partial match = 10 points
            else {
              maxScore = Math.max(maxScore, 10);
            }
          });
          return maxScore;
        };
        
        const aScore = getRelevanceScore(a);
        const bScore = getRelevanceScore(b);
        
        // Sort by relevance score first (higher score first)
        if (aScore !== bScore) {
          return bScore - aScore;
        }
        
        // If relevance is the same, sort by date (newer first)
        const aLatestItem = a.items?.sort((x, y) => 
          new Date(y.created_at || 0).getTime() - new Date(x.created_at || 0).getTime()
        )[0];
        const bLatestItem = b.items?.sort((x, y) => 
          new Date(y.created_at || 0).getTime() - new Date(x.created_at || 0).getTime()
        )[0];
        
        const aDate = aLatestItem ? new Date(aLatestItem.created_at || 0).getTime() : 0;
        const bDate = bLatestItem ? new Date(bLatestItem.created_at || 0).getTime() : 0;
        
        return bDate - aDate; // Newer first
      });
      
      console.log(`Search found ${sortedShows.length} shows with matching items`);
      console.log('Total matching items across all shows:', 
        sortedShows.reduce((total, show) => total + (show.items?.length || 0), 0)
      );
      
      return sortedShows;
    }
    
    // If no items matched or no associated shows found, return empty array
    return [];
  } catch (error) {
    console.error('Error searching shows:', error);
    throw error;
  }
};

export const getShowWithItems = async (showId: string) => {
  console.log('Fetching show with ID:', showId);
  
  if (!showId) {
    console.error('No show ID provided');
    throw new Error('No show ID provided');
  }

  // Try to fetch from current shows first
  let { data: shows, error: showError } = await api.query('/shows', {
    where: { id: showId }
  });

  let isBackup = false;

  // If not found in current shows, try backup shows
  if (!shows || shows.length === 0) {
    console.log('Show not found in current shows, trying backup...');
    const { data: backupShows, error: backupShowError } = await api.query('/shows-backup', {
      where: { id: showId }
    });

    if (backupShowError) {
      console.error('Error fetching backup show:', backupShowError);
      throw backupShowError;
    }

    shows = backupShows;
    isBackup = true;
  } else if (showError) {
    console.error('Error fetching current show:', showError);
    throw showError;
  }

  const show = shows?.[0];
  if (!show) {
    return null;
  }

  // Mark backup shows
  if (isBackup) {
    show.is_backup = true;
  }

  const { data: items, error: itemsError } = await api.query('/show-items', {
    where: { show_id: showId },
    order: { position: 'asc' }
  });

  if (itemsError) {
    console.error('Error fetching show items:', itemsError);
    throw itemsError;
  }

  console.log('Retrieved items from database:', items?.length, 'items');

  // Load interviewees for each item
  const itemsWithInterviewees = await Promise.all(
    (items || []).map(async (item) => {
      try {
        const { data: interviewees, error: intervieweesError } = await api.query('/interviewees', {
          where: { item_id: item.id }
        });

        if (intervieweesError) {
          console.error('Error fetching interviewees for item:', item.id, intervieweesError);
          return { ...item, interviewees: [] };
        }

        return { ...item, interviewees: interviewees || [] };
      } catch (error) {
        console.error('Error loading interviewees for item:', item.id, error);
        return { ...item, interviewees: [] };
      }
    })
  );

  console.log('Loaded interviewees for all items');

  return {
    show,
    items: itemsWithInterviewees
  };
};

export const getShowsByDate = async (date: string): Promise<Show[]> => {
  console.log('Fetching shows for date:', date);
  
  try {
    const { data: shows, error } = await api.query('/shows', {
      where: { date },
      order: { time: 'asc' }
    });

    if (error) {
      console.error('Error fetching shows by date:', error);
      throw error;
    }

    console.log(`Found ${shows?.length || 0} shows for date ${date}:`, shows);
    
    if (shows && shows.length > 0) {
      const showIds = shows.map(show => show.id);
      
      const { data: items, error: itemsError } = await api.query('/show-items', {
        where: { show_id: { in: showIds } },
        order: { position: 'asc' }
      });
      
      if (itemsError) {
        console.error('Error fetching items for shows:', itemsError);
        throw itemsError;
      }
      
      if (items) {
        const showsWithItems = shows.map(show => ({
          ...show,
          items: items.filter(item => item.show_id === show.id)
        }));
        
        console.log(`Added items to ${showsWithItems.length} shows`);
        return showsWithItems;
      }
    }
    
    return shows || [];
  } catch (error) {
    console.error('Error in getShowsByDate:', error);
    throw error;
  }
};

export const saveShow = async (
  show: {
    name: string;
    time: string;
    date: string;
    notes: string;
    slot_id?: string;
  },
  items: Array<{
    name: string;
    title?: string;
    details?: string;
    phone?: string;
    duration?: number;
    is_break: boolean;
    is_note: boolean;
    is_divider?: boolean;
    interviewees?: Array<{
      name: string;
      title?: string;
      phone?: string;
      duration?: number;
      id?: string;
    }>;
  }>,
  showId?: string
) => {
  try {
    // If we're updating an existing show, check if it's a backup show
    if (showId) {
      const existingShow = await getShowWithItems(showId);
      if (existingShow?.show?.is_backup) {
        throw new Error('Cannot edit backup shows from Lovable. Please create a new lineup instead.');
      }
    }

    // Create or update show
    const showData = {
      ...show
    } as {
      name: string;
      time: string;
      date: string;
      notes: string;
      slot_id?: string;
      created_at?: string;
    };

    let savedShow;
    if (showId) {
      const { data, error } = await api.mutate(`/shows/${showId}`, showData, 'PUT');
      if (error) throw error;
      savedShow = data;
    } else {
      showData.created_at = new Date().toISOString();
      const { data, error } = await api.mutate('/shows', showData, 'POST');
      if (error) throw error;
      savedShow = data;
    }

    // Delete existing items if updating
    if (showId) {
      await api.mutate(`/shows/${showId}/items`, {}, 'DELETE');
    }

    // Create new items
    const itemPromises = items.map((item, index) => {
      const itemData = {
        ...item,
        show_id: savedShow.id,
        position: index,
        created_at: new Date().toISOString()
      };
      return api.mutate('/show-items', itemData, 'POST');
    });

    await Promise.all(itemPromises);

    // Update the slot's has_lineup status if slot_id is provided
    if (show.slot_id) {
      try {
        console.log('Updating slot has_lineup status for slot_id:', show.slot_id);
        await api.mutate(`/schedule/slots/${show.slot_id}/has-lineup`, { has_lineup: true }, 'PUT');
        console.log('Successfully updated slot has_lineup status');
      } catch (error) {
        console.error('Error updating slot has_lineup status:', error);
        // Don't throw here - the lineup was saved successfully, just the slot update failed
      }
    }

    return savedShow;
  } catch (error) {
    console.error('Error saving show:', error);
    throw error;
  }
};

export const deleteShow = async (showId: string) => {
  try {
    // Get the show first to check if it has a slot_id
    const { data: shows, error: showError } = await api.query('/shows', {
      where: { id: showId }
    });
    
    if (showError) throw showError;
    
    const show = shows?.[0];
    const slotId = show?.slot_id;
    
    // Delete show items first
    await api.mutate(`/shows/${showId}/items`, null, 'DELETE');
    
    // Then delete the show
    const { error } = await api.mutate(`/shows/${showId}`, {}, 'DELETE');
    if (error) throw error;
    
    // Update the slot's has_lineup status to false if slot_id exists
    if (slotId) {
      try {
        console.log('Updating slot has_lineup status to false for slot_id:', slotId);
        await api.mutate(`/schedule/slots/${slotId}/has-lineup`, { has_lineup: false }, 'PUT');
        console.log('Successfully updated slot has_lineup status to false');
      } catch (error) {
        console.error('Error updating slot has_lineup status:', error);
        // Don't throw here - the lineup was deleted successfully, just the slot update failed
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting show:', error);
    throw error;
  }
};
