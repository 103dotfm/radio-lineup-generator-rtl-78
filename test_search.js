import { executeSelect } from './server/utils/db.js';

async function testSearch() {
  try {
    console.log('Testing search functionality...');
    
    // First, let's see how many total items we have
    const totalItemsResult = await executeSelect('show_items', {
      select: 'COUNT(*) as total'
    });
    
    console.log('Total items in database:', totalItemsResult.data?.[0]?.total);
    
    // Search for צבי יחזקאלי specifically
    console.log('\nSearching for צבי יחזקאלי...');
    const searchResult = await executeSelect('show_items', {
      select: '*',
      where: {
        'or': [
          { 'name ILIKE': '%צבי יחזקאלי%' },
          { 'title ILIKE': '%צבי יחזקאלי%' }
        ]
      },
      orderBy: { created_at: 'DESC' },
      limit: 100
    });
    
    console.log(`Found ${searchResult.data?.length || 0} items for צבי יחזקאלי`);
    
    if (searchResult.data && searchResult.data.length > 0) {
      console.log('Sample results:');
      searchResult.data.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.title} (${item.created_at})`);
      });
    }
    
    // Search for just צבי
    console.log('\nSearching for צבי...');
    const searchResult2 = await executeSelect('show_items', {
      select: '*',
      where: {
        'or': [
          { 'name ILIKE': '%צבי%' },
          { 'title ILIKE': '%צבי%' }
        ]
      },
      orderBy: { created_at: 'DESC' },
      limit: 100
    });
    
    console.log(`Found ${searchResult2.data?.length || 0} items for צבי`);
    
    // Check for any items with צ in the name
    console.log('\nSearching for צ...');
    const searchResult3 = await executeSelect('show_items', {
      select: '*',
      where: {
        'or': [
          { 'name ILIKE': '%צ%' },
          { 'title ILIKE': '%צ%' }
        ]
      },
      orderBy: { created_at: 'DESC' },
      limit: 100
    });
    
    console.log(`Found ${searchResult3.data?.length || 0} items for צ`);
    
    if (searchResult3.data && searchResult3.data.length > 0) {
      console.log('Sample results with צ:');
      searchResult3.data.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} - ${item.title}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing search:', error);
  }
}

testSearch(); 