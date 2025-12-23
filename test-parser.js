import textract from 'textract';
import { parseWordDocument } from './server/services/word-parser.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test with the new file
const filePath = path.join(__dirname, 'temp', '05.01.2025.doc');

console.log('Testing parser with file:', filePath);
console.log('='.repeat(80));

// First, check raw text structure for item 1
textract.fromFileWithPath(filePath, async (error, text) => {
  if (!error) {
    const phoneIndex = text.indexOf('050-6241341');
    if (phoneIndex !== -1) {
      console.log('\n=== RAW TEXT DEBUG FOR ITEM 1 ===');
      console.log('Before phone (400 chars):', text.substring(Math.max(0, phoneIndex - 400), phoneIndex));
      console.log('\nAfter phone (600 chars):', text.substring(phoneIndex + '050-6241341'.length, phoneIndex + '050-6241341'.length + 600));
      const ashelZlIndex = text.indexOf('אשל ז"ל', phoneIndex);
      console.log('\n"אשל ז"ל" found at:', ashelZlIndex !== -1 ? `index ${ashelZlIndex} (distance: ${ashelZlIndex - phoneIndex})` : 'NOT FOUND');
      if (ashelZlIndex !== -1) {
        console.log('Text around "אשל ז"ל" (200 chars):', text.substring(ashelZlIndex - 50, ashelZlIndex + 200));
      }
    }
  }
  
  // Now run the parser
  try {
    const result = await parseWordDocument(filePath);
    
    console.log('\n=== PARSING RESULT ===');
    console.log('Show Name:', result.showName);
    console.log('Show Date:', result.showDate);
    console.log('Items Count:', result.items.length);
    console.log('\n=== ITEMS ===');
    
    result.items.forEach((item, index) => {
      console.log(`\nItem ${index + 1}:`);
      console.log('  Name:', item.name);
      console.log('  Title:', item.title);
      console.log('  Phone:', item.phone);
    });
    
    // Check if we got items
    if (result.items.length > 0) {
      console.log(`\n✓ SUCCESS: Found ${result.items.length} item(s)!`);
      console.log(`✓ Show Name: "${result.showName}"`);
      console.log(`✓ Show Date: ${result.showDate}`);
      console.log('\n✓ All items parsed successfully!');
    } else {
      console.log(`\n✗ FAILED: No items found`);
    }
  } catch (error) {
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
});
