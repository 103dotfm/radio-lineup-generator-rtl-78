import { api } from "@/lib/api-client";

export const searchGuests = async (query: string) => {
  console.log('Searching for guests with query:', query);
  
  try {
    const { data, error } = await api.query('/show-items', {
      where: {
        name: { ilike: `%${query}%` },
        is_break: { eq: false },
        is_note: { eq: false }
      },
      order: { created_at: 'desc' },
      limit: 100 // Get more records to ensure we have the latest data for each name
    });

    if (error) {
      console.error('Error searching guests:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data)) {
      console.log('No data returned or data is not an array');
      return [];
    }
    
    // Group by name and get the most recent record for each name
    const guestsByName = data.reduce((acc: any, current) => {
      const name = current.name;
      if (!acc[name] || new Date(current.created_at) > new Date(acc[name].created_at)) {
        acc[name] = current;
      }
      return acc;
    }, {});

    // Convert back to array and take only top 5 results
    const uniqueGuests = Object.values(guestsByName)
      .slice(0, 5)
      .map((guest: any) => ({
        name: guest.name,
        title: guest.title || '',
        phone: guest.phone || ''
      }));

    console.log('Search results:', uniqueGuests);
    return uniqueGuests;
  } catch (error) {
    console.error('Error searching guests:', error);
    return [];
  }
};

export const addGuest = async (guest: { name: string; title: string; phone: string }) => {
  // Since we're not using a separate guests table anymore, this function can be empty
  // or you might want to remove it entirely since guests are added directly to show-items
  return;
};
