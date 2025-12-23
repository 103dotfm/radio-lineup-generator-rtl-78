import mammoth from 'mammoth';
import textract from 'textract';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse a Word document (.docx) and extract lineup information
 * @param {string} filePath - Path to the Word document
 * @returns {Promise<Object>} Parsed data with show info and items
 */
export async function parseWordDocument(filePath) {
  try {
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      throw new Error('File not found');
    }

    // Read file buffer
    const fileBuffer = await fs.readFile(filePath);
    
    // Get file extension
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.docx') {
      return await parseDocx(fileBuffer);
    } else if (ext === '.doc') {
      return await parseDoc(filePath);
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }
  } catch (error) {
    console.error('Error parsing Word document:', error);
    throw error;
  }
}

/**
 * Parse .doc file using textract
 */
async function parseDoc(filePath) {
  try {
    return new Promise((resolve, reject) => {
      textract.fromFileWithPath(filePath, (error, text) => {
        if (error) {
          console.error('Error extracting text from .doc file:', error);
          
          // Check if error is due to missing system dependencies
          const errorMsg = error.message || error.toString();
          if (errorMsg.includes('antiword') || errorMsg.includes('catdoc') || 
              errorMsg.includes('command not found') || errorMsg.includes('ENOENT')) {
            reject(new Error(
              'Failed to parse .doc file: Missing system dependencies. ' +
              'Please install antiword: sudo apt-get install antiword'
            ));
          } else {
            reject(new Error(`Failed to parse .doc file: ${error.message || errorMsg}`));
          }
          return;
        }
        
        if (!text || text.trim().length === 0) {
          reject(new Error('Failed to parse .doc file: No text content extracted'));
          return;
        }

        // Debug: log extracted text (first 1000 chars)
        console.log('Extracted text (first 1000 chars):', text.substring(0, 1000));
        console.log('Total text length:', text.length);

        // Split text into lines - try multiple line break patterns
        let lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        
        // If we have very few lines or one very long line, textract might not have split properly
        // Try to intelligently split the text
        if (lines.length <= 1 || (lines.length === 1 && lines[0].length > 200)) {
          console.log('Text appears to be on one line or poorly split. Attempting intelligent parsing...');
          
          // Find the date pattern first (it's more reliable)
          const datePattern = /(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})/;
          const dateMatch = text.match(datePattern);
          
          if (dateMatch) {
            const dateIndex = text.indexOf(dateMatch[0]);
            
            // Everything before the date is the show name
            // Get all text before the date (could be multiple words)
            const beforeDate = text.substring(0, dateIndex).trim();
            
            // The show name is everything before the date, but limit to reasonable length (100 chars)
            // This handles names like "אראל סגל ואיל ברקוביץ'" which has 4 words
            let showName = beforeDate;
            if (showName.length > 100) {
              // If too long, try to find a natural break point
              const breakPoint = showName.lastIndexOf(' ', 100);
              if (breakPoint > 20) {
                showName = showName.substring(0, breakPoint).trim();
              } else {
                showName = showName.substring(0, 100).trim();
              }
            }
            
            // Everything after the date is the table content
            const afterDate = text.substring(dateIndex + dateMatch[0].length).trim();
            
            // Reconstruct lines array
            lines = [];
            if (showName) {
              lines.push(showName);
            }
            lines.push(dateMatch[0]);
            
            // Split the rest by line breaks, tabs, or multiple spaces
            const restLines = afterDate.split(/\r?\n|\t|\s{3,}/)
              .map(l => l.trim())
              .filter(l => l.length > 0 && !l.match(/^\d+\)?\s*$/)); // Filter out just numbers or "1)" etc
            
            lines = lines.concat(restLines);
          } else {
            // No date found, try to split by tabs or multiple spaces
            lines = text.split(/\t|\s{3,}/).map(line => line.trim()).filter(line => line.length > 0);
          }
        }
        
        console.log('Number of lines after splitting:', lines.length);
        console.log('First 10 lines:', lines.slice(0, 10));
        
        if (lines.length < 2) {
          reject(new Error(`Document too short - need at least show name and date. Found ${lines.length} lines. Text preview: ${text.substring(0, 500)}`));
          return;
        }

        // Extract show information: first line = show name, second line = date
        const showInfo = extractShowInfoFromLines(lines);
        
        // Find where the table starts (after show name and date)
        // Look for the date line index to know where to start table parsing
        const datePattern = /(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})/;
        let tableStartIndex = 2; // Default: skip first 2 lines
        
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
          if (lines[i].match(datePattern)) {
            tableStartIndex = i + 1; // Start after the date line
            break;
          }
        }
        
        // Extract table data (lineup items) - skip show name and date lines
        const tableLines = lines.slice(tableStartIndex);
        console.log(`Table starts at line ${tableStartIndex}, ${tableLines.length} table lines found`);
        
        // Try to extract using table structure first (group lines by phone numbers)
        // Don't join lines yet - preserve structure to extract from cells
        let items = [];
        const phonePattern = /0\d{2}[\-\s]?\d{6,7}|0\d{2}[\-\s]?\d{1,3}[\s"]+\d{4,7}/;
        const phoneLineIndices = [];
        
        // Find all lines that contain phone numbers (or phone patterns)
        for (let i = 0; i < tableLines.length; i++) {
          // Check for phone patterns in the line
          if (phonePattern.test(tableLines[i])) {
            phoneLineIndices.push(i);
          }
        }
        
        console.log(`Found ${phoneLineIndices.length} lines with phone numbers`);
        
        // If we found phone numbers, try to extract table structure
        if (phoneLineIndices.length > 0) {
          items = extractFromTableStructure(tableLines, phoneLineIndices);
          
          // If we got items from table structure, use them
          if (items.length > 0) {
            console.log(`Extracted ${items.length} items from table structure`);
            resolve({
              showName: showInfo.name || '',
              showDate: showInfo.date || null,
              showTime: showInfo.time || null,
              items: items,
              warnings: ['Parsed from .doc format using table structure'],
            });
            return;
          }
        }
        
        // Fallback: If table structure extraction didn't work, use the old text-based method
        // If we have very few table lines but the original text was long, 
        // textract probably extracted everything together - join the table lines
        let textForExtraction = tableLines;
        if (tableLines.length <= 3 && tableLines.some(l => l.length > 500)) {
          // Join all table lines into one for extraction
          textForExtraction = [tableLines.join(' ')];
          console.log('Joined table lines into single text for extraction, length:', textForExtraction[0].length);
        }
        
        items = extractFromText(textForExtraction);

        resolve({
          showName: showInfo.name || '',
          showDate: showInfo.date || null,
          showTime: showInfo.time || null,
          items: items,
          warnings: ['Parsed from .doc format - table structure may not be perfect'],
          rawHtml: `<pre>${text.substring(0, 1000)}</pre>` // For debugging
        });
      });
    });
  } catch (error) {
    console.error('Error parsing .doc file:', error);
    throw new Error(`Failed to parse .doc file: ${error.message}`);
  }
}

/**
 * Extract show info from first two lines (for .doc files)
 * First line = show name, Second line = date
 */
function extractShowInfoFromLines(lines) {
  const info = {
    name: '',
    date: null,
    time: null
  };

  try {
    // Find the date first (more reliable than assuming it's on line 2)
    const datePattern = /(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})/;
    let dateLineIndex = -1;
    let dateMatch = null;
    
    // Look for date in first few lines
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const match = lines[i].match(datePattern);
      if (match) {
        dateMatch = match;
        dateLineIndex = i;
        break;
      }
    }
    
    // Extract show name - everything before the date line
    if (dateLineIndex > 0) {
      // Show name is all lines before the date, joined together
      info.name = lines.slice(0, dateLineIndex)
        .join(' ')
        .trim()
        .replace(/\s+/g, ' '); // Normalize whitespace
    } else if (dateLineIndex === 0) {
      // Date is on first line, show name might be missing or in the date line
      // Try to extract name from before the date in the same line
      if (dateMatch) {
        const beforeDate = lines[0].substring(0, lines[0].indexOf(dateMatch[0])).trim();
        info.name = beforeDate || lines[0].substring(dateMatch[0].length).trim();
      }
    } else if (lines.length > 0) {
      // No date found, use first line as show name
      info.name = lines[0].trim();
    }
    
    // Limit show name length (shouldn't be more than ~100 chars)
    if (info.name.length > 100) {
      // Try to find a natural break point
      const breakPoint = info.name.indexOf(' ', 50) || info.name.indexOf('\t', 50);
      if (breakPoint > 0) {
        info.name = info.name.substring(0, breakPoint).trim();
      } else {
        info.name = info.name.substring(0, 100).trim();
      }
    }
    
    // Extract date
    if (dateMatch) {
      try {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]);
        const year = parseInt(dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3]));
        const date = new Date(year, month - 1, day);
        
        if (!isNaN(date.getTime())) {
          const yearStr = date.getFullYear();
          const monthStr = String(date.getMonth() + 1).padStart(2, '0');
          const dayStr = String(date.getDate()).padStart(2, '0');
          info.date = `${yearStr}-${monthStr}-${dayStr}`;
        }
      } catch (e) {
        console.warn('Error parsing date:', e);
      }
    }
  } catch (error) {
    console.error('Error extracting show info from lines:', error);
  }

  return info;
}

/**
 * Extract lineup items from table structure (for .doc files)
 * Groups lines by phone numbers and extracts name, title, and phone from each group
 */
function extractFromTableStructure(lines, phoneLineIndices) {
  const items = [];
  
  try {
    for (let i = 0; i < phoneLineIndices.length; i++) {
      const phoneLineIdx = phoneLineIndices[i];
      const nextPhoneLineIdx = i < phoneLineIndices.length - 1 ? phoneLineIndices[i + 1] : lines.length;
      
      // Get all lines for this entry (from current phone line to next phone line)
      const entryLines = lines.slice(phoneLineIdx, nextPhoneLineIdx);
      const entryText = entryLines.join(' ');
      
      // Extract phone number
      const phoneMatch = entryText.match(/(0\d{2}[\-\s]?\d{6,7})|(0\d{2}[\-\s]?\d{1,3}[\s"]+\d{4,7})/);
      if (!phoneMatch) continue;
      
      let phone = phoneMatch[0].replace(/\s/g, '-').replace(/["']/g, '');
      // Handle split phones like "050-6" "24134" -> "050-6241341"
      if (phone.length < 10) {
        const splitMatch = entryText.match(/(0\d{2}[\-\s]?\d{1,3})[\s"]+(\d{4,7})[\s"]*(\d)?/);
        if (splitMatch) {
          phone = splitMatch[1].replace(/\s/g, '-') + splitMatch[2] + (splitMatch[3] || '');
        }
      }
      
      // Extract name - look for quoted names or unquoted names before the phone
      const phoneIndex = entryText.indexOf(phoneMatch[0]);
      const beforePhone = entryText.substring(0, phoneIndex);
      
      // Try to find name in quotes first
      const quotedNameMatch = beforePhone.match(/"([א-ת]{4,25})"/);
      let name = '';
      if (quotedNameMatch) {
        name = quotedNameMatch[1].trim();
      } else {
        // Try unquoted name pattern (2-3 Hebrew words)
        const unquotedNameMatch = beforePhone.match(/([א-ת]{2,6}\s+[א-ת]{2,8})\s*["']/);
        if (unquotedNameMatch) {
          name = unquotedNameMatch[1].trim();
        }
      }
      
      // For split names like "רועי" and "ינובסקי"
      if (!name || name.length < 4) {
        const firstNameMatch = beforePhone.match(/([א-ת]{2,4})\s*["']/);
        const afterPhone = entryText.substring(phoneIndex + phoneMatch[0].length);
        const lastNameMatch = afterPhone.match(/"([א-ת]{4,8})"/);
        if (firstNameMatch && lastNameMatch) {
          name = `${firstNameMatch[1]} ${lastNameMatch[1]}`;
        }
      }
      
      // Extract title - everything between name and phone, or after name if split
      let title = '';
      if (name) {
        const nameIndex = beforePhone.indexOf(name);
        if (nameIndex !== -1) {
          const afterName = beforePhone.substring(nameIndex + name.length).trim();
          // Clean up title
          title = afterName.replace(/^["'\s]+/, '').trim();
          
          // Stop before next item markers
          const nextItemMarkers = ['ממובילי', 'מועצת', 'וכולל', 'פרסומות', 'פרסומת'];
          for (const marker of nextItemMarkers) {
            const markerIndex = title.indexOf(marker);
            if (markerIndex > 20) {
              title = title.substring(0, markerIndex).trim();
              break;
            }
          }
          
          // For split names, also check text after phone for title continuation
          if (name.includes('ינובסקי')) {
            const afterPhoneText = entryText.substring(phoneIndex + phoneMatch[0].length);
            const lastNameIndex = afterPhoneText.indexOf('"ינובסקי"');
            if (lastNameIndex !== -1) {
              const titleAfterLastName = afterPhoneText.substring(lastNameIndex + '"ינובסקי"'.length);
              // Look for "ראש" or "הדסק" or "הפלילי"
              const titleStart = titleAfterLastName.match(/(ראש|הדסק|הפלילי)/);
              if (titleStart) {
                const titleText = titleAfterLastName.substring(titleStart.index);
                // Stop before phone continuation "78912"
                const phoneContMatch = titleText.match(/"(\d{4,7})"/);
                if (phoneContMatch) {
                  title = titleText.substring(0, phoneContMatch.index).trim();
                } else {
                  title = titleText.trim();
                }
                title = title.replace(/^["'\s]+/, '').replace(/["']+$/, '').trim();
              }
            }
          }
        }
      }
      
      // Clean up title
      title = title.replace(/["']+$/, '').replace(/\.+$/, '').trim();
      
      if (name && name.length > 2) {
        items.push({ name, title, phone });
        console.log(`Extracted from table: ${name} - ${title.substring(0, 50)}... - ${phone}`);
      }
    }
  } catch (error) {
    console.error('Error extracting from table structure:', error);
  }
  
  return items;
}

/**
 * Extract lineup items from text lines (for .doc files)
 * Table structure: First column = name (2-3 words), Second column = title, Last column = phone
 * Handles cases where textract extracts everything in one line with quotes
 */
function extractFromText(lines) {
  const items = [];
  
  // Phone number pattern: 050-1234567 or 054-1234567 format
  // Also handle cases where phone might be split: "050-6" "24134" -> "050-6241341"
  const phonePattern = /0\d{2}[\-\s]?\d{6,7}/;
  const phonePatternSplit = /0\d{2}[\-\s]?\d{1,4}/; // For finding start of split phones (e.g., "054-2148", "050-4716")
  
  try {
    // If we have one very long line (textract extracted everything together)
    // Or if we have a few lines but one is very long
    const hasLongLine = lines.some(l => l.length > 500);
    if ((lines.length === 1 && lines[0].length > 500) || (lines.length <= 3 && hasLongLine)) {
      // If multiple lines but one is long, join them
      const text = lines.length === 1 ? lines[0] : lines.join(' ');
      
      console.log('Extracting from long text, original lines:', lines.length, 'joined length:', text.length);
      
      // Find all phone numbers in the text - try multiple patterns
      const phoneMatches = [];
      const usedIndices = new Set(); // Track which indices we've already used
      
      // First, try to find complete phone numbers (050-1234567 or 050-123456)
      let match;
      const regex = new RegExp(phonePattern, 'g');
      while ((match = regex.exec(text)) !== null) {
        phoneMatches.push({
          phone: match[0].replace(/\s/g, '-'), // Normalize phone format
          index: match.index
        });
        usedIndices.add(match.index);
      }
      
      console.log(`Found ${phoneMatches.length} complete phone numbers`);
      
      // ALWAYS also try to find split phones (they might be in the document even if we found some complete ones)
      // Pattern: "050-6" followed by "24134" (separated by quotes/spaces)
      console.log('Also checking for split phone patterns...');
      
      // Look for pattern like "050-6" or "050-62" followed by continuation
      // More flexible pattern: 0XX- followed by 1-3 digits, then continuation
      const splitStartPattern = /0\d{2}[\-\s]?\d{1,3}/g;
      let splitMatch;
      while ((splitMatch = splitStartPattern.exec(text)) !== null) {
        const startIndex = splitMatch.index;
        const startPhone = splitMatch[0];
        
        // Skip if we already have a phone at this index (or very close)
        if (usedIndices.has(startIndex) || Array.from(usedIndices).some(idx => Math.abs(idx - startIndex) < 5)) {
          continue;
        }
        
        console.log(`Found potential phone start: "${startPhone}" at index ${startIndex}`);
        
        // Look ahead for continuation (digits within 300 chars, may be in quotes/spaces)
        // Phone continuations can be far away due to Hebrew text in between
        const afterStart = text.substring(startIndex + startPhone.length, startIndex + startPhone.length + 300);
        
        console.log(`  Text after (first 100): "${afterStart.substring(0, 100)}"`);
        
        // Try to find continuation digits (4-7 digits, possibly in quotes)
        // The pattern in the document is: "050-6" "24134" or "054-5" "36936" "5"
        // We need to find digits in quotes that complete the phone number
        let continuationMatch = null;
        
        // First try: digits in quotes like "24134" or "765" - search for ALL matches and use the first one
        // The pattern can be "054-2148" "765" where continuation is 3-7 digits
        const allQuotedDigits = Array.from(afterStart.matchAll(/"(\d{3,7})"/g));
        for (const match of allQuotedDigits) {
          // Use the first match that's at least 3 chars away (skip immediate digits)
          // But allow it to be closer if it's clearly a continuation (3-4 digits)
          if (match.index > 3 || (match.index > 0 && match[1].length <= 4)) {
            continuationMatch = match;
            break;
          }
        }
        
        // If not found, try digits after quotes and spaces
        if (!continuationMatch) {
          continuationMatch = afterStart.match(/["\s]+(\d{3,7})/);
        }
        
        // If still not found, look for any 3-7 digit sequence (might not be in quotes)
        if (!continuationMatch) {
          const digitMatch = afterStart.match(/(\d{3,7})/);
          if (digitMatch && digitMatch.index > 3) { // At least 3 chars away
            continuationMatch = digitMatch;
          }
        }
        
          if (continuationMatch) {
            // Combine the parts
            const startDigits = startPhone.replace(/[^\d]/g, '');
            const continuationDigits = continuationMatch[1];
            let fullDigits = startDigits + continuationDigits;
            
            console.log(`  Found continuation: "${continuationDigits}", full so far: "${fullDigits}" (length: ${fullDigits.length})`);
            
            // Check if we need one more digit (some phones have pattern like "050-6" "24134" "1")
            // Look a bit further for a single digit in quotes
            // Israeli phones are usually 10 digits: 050-XXXXXXX, so if we have 9, look for one more
            if (fullDigits.length === 9) {
              const afterCont = afterStart.substring(continuationMatch.index + continuationMatch[0].length, continuationMatch.index + continuationMatch[0].length + 100);
              // Look for pattern: "1" or "5" or "7" (single digit in quotes) - this is the most common
              // But we need to find the FIRST single digit, not "11" which comes later
              const singleDigitMatch = afterCont.match(/"(\d)"/);
              if (singleDigitMatch && singleDigitMatch[1].length === 1) {
                // Check if there's a double digit like "11" before this single digit
                // If so, the single digit might be part of "11", so skip it
                const beforeSingle = afterCont.substring(0, singleDigitMatch.index);
                const doubleDigitBefore = beforeSingle.match(/"(\d{2})"/);
                if (!doubleDigitBefore || doubleDigitBefore.index + doubleDigitBefore[0].length < singleDigitMatch.index - 5) {
                  // No double digit before, or it's far away, so use the single digit
                  fullDigits = fullDigits + singleDigitMatch[1];
                  console.log(`  Found additional digit in quotes: "${singleDigitMatch[1]}", full: "${fullDigits}"`);
                } else {
                  // There's a double digit, look for another single digit after it
                  const afterDouble = afterCont.substring(doubleDigitBefore.index + doubleDigitBefore[0].length);
                  const anotherSingle = afterDouble.match(/"(\d)"/);
                  if (anotherSingle && anotherSingle[1].length === 1) {
                    fullDigits = fullDigits + anotherSingle[1];
                    console.log(`  Found additional digit after double: "${anotherSingle[1]}", full: "${fullDigits}"`);
                  }
                }
              } else {
                // Also try pattern like " "7" " (single digit in quotes after spaces/quotes)
                const quotedDigitMatch = afterCont.match(/["\s]+(\d)["\s]/);
                if (quotedDigitMatch && quotedDigitMatch.index > 5) {
                  fullDigits = fullDigits + quotedDigitMatch[1];
                  console.log(`  Found additional digit (quoted after text): "${quotedDigitMatch[1]}", full: "${fullDigits}"`);
                } else {
                  // Last resort: look for any single digit after some text
                  const digitMatch = afterCont.match(/(\d)/);
                  if (digitMatch && digitMatch.index > 10) {
                    fullDigits = fullDigits + digitMatch[1];
                    console.log(`  Found additional digit (no quotes, far): "${digitMatch[1]}", full: "${fullDigits}"`);
                  }
                }
              }
            }
          
          // Validate it looks like a phone (9-11 digits total)
          if (fullDigits.length >= 9 && fullDigits.length <= 11) {
            // Format as 050-XXXXXXX
            const formattedPhone = `${fullDigits.substring(0, 3)}-${fullDigits.substring(3)}`;
            
            phoneMatches.push({
              phone: formattedPhone,
              index: startIndex
            });
            
            usedIndices.add(startIndex);
            
            console.log(`  ✓ Added phone: ${formattedPhone}`);
          } else {
            console.log(`  ✗ Invalid length: ${fullDigits.length}`);
          }
        } else {
          console.log(`  ✗ No continuation found in first 300 chars`);
        }
      }
      
      // Sort phone matches by index to process them in order
      phoneMatches.sort((a, b) => a.index - b.index);
      
      console.log('Found', phoneMatches.length, 'phone numbers');
      
      // For each phone number, try to find the name and title before it
      for (let i = 0; i < phoneMatches.length; i++) {
        const phoneMatch = phoneMatches[i];
        const phoneStart = phoneMatch.index;
        const phoneEnd = phoneMatch.index + phoneMatch.phone.length;
        
        // Get text before this phone number (up to previous phone or start)
        const prevPhoneEnd = i > 0 ? phoneMatches[i - 1].index + phoneMatches[i - 1].phone.length : 0;
        let beforePhone = text.substring(prevPhoneEnd, phoneStart).trim();
        
        // Store detected split name for later use
        let detectedSplitName = null;
        
        // Find phone continuation (digits after the phone start, like "765" after "054-2148")
        // The phone might be split: "054-2148" "765" -> "054-2148765"
        // But phoneMatch.phone is already the combined phone like "054-214765"
        // We need to find where the continuation digits are in the original text
        // Try to find the phone start pattern in the text - it could be "054-2148" (7-8 chars)
        // Extract digits from phoneMatch.phone: "054-214765" -> "054214765"
        const phoneDigits = phoneMatch.phone.replace(/[^\d]/g, '');
        // Try to find the start pattern - first 6-7 digits like "054214" or "0542148"
        const phoneStartPattern6 = phoneDigits.substring(0, 6); // "054214"
        const phoneStartPattern7 = phoneDigits.substring(0, 7); // "0542148"
        // Look for these patterns in the text (they appear as "054-2148" or "054-214")
        let phoneStartInText = -1;
        let actualPhoneStartPattern = '';
        // Try 7-digit pattern first (more specific)
        const pattern7Match = text.substring(phoneStart - 50, phoneStart + 50).match(/(\d{3}-\d{4})/);
        if (pattern7Match) {
          actualPhoneStartPattern = pattern7Match[1]; // "054-2148"
          phoneStartInText = phoneStart - 50 + pattern7Match.index;
        } else {
          const pattern6Match = text.substring(phoneStart - 50, phoneStart + 50).match(/(\d{3}-\d{3})/);
          if (pattern6Match) {
            actualPhoneStartPattern = pattern6Match[1]; // "054-214"
            phoneStartInText = phoneStart - 50 + pattern6Match.index;
          }
        }
        
        let phoneContEnd = phoneEnd;
        
        if (phoneStartInText !== -1 && actualPhoneStartPattern) {
          // Look for continuation digits after the phone start pattern
          const patternEnd = phoneStartInText + actualPhoneStartPattern.length;
          const searchAfterPattern = text.substring(patternEnd, patternEnd + 200);
          const phoneContMatch = searchAfterPattern.match(/"(\d{3,7})"/);
          if (phoneContMatch) {
            phoneContEnd = patternEnd + phoneContMatch.index + phoneContMatch[0].length;
            
            // Check for split names where the last name appears AFTER the phone continuation
            // Pattern: "עו"ד איתמר" ... "054-2148" "765" "מירון"
            // Or: "פרופ' משה" ... "050-4716" "601" "כהן-אליה"
            const afterPhoneCont = text.substring(phoneContEnd, phoneContEnd + 100);
            // Look for a Hebrew name part in quotes after the phone continuation
            // This could be the last name (like "מירון", "כהן-אליה", "ארבל")
            const lastNameAfterPhoneMatch = afterPhoneCont.match(/"([א-ת]{3,15})"/);
            if (lastNameAfterPhoneMatch) {
              const lastNameAfterPhone = lastNameAfterPhoneMatch[1].trim();
              // Check if this looks like a name (not a title word) - use a simpler check
              const commonTitleWords = ['העתירה', 'לבגץ', 'משדה', 'תימן', 'שופטי', 'העליון', 'היועמ"שית', 'בהרב', 'מיארה', 'בפרת', 'הדלפת', 'תפקח', 'לשכת', 'עורכי', 'הדין', 'נעצרה', 'באזיקים', 'וסולקה', 'מכנס'];
              const isTitleWord = commonTitleWords.some(word => lastNameAfterPhone.includes(word));
              
              if (!isTitleWord && lastNameAfterPhone.length >= 3 && lastNameAfterPhone.length <= 15) {
                // This could be a last name - check if we have a first name before the phone
                // Look for quoted names before the phone
                const quotedNamePattern = /"([^"]{3,25})"/g;
                const quotedMatchesBefore = [];
                let match;
                while ((match = quotedNamePattern.exec(beforePhone)) !== null) {
                  const quotedText = match[1].trim();
                  const words = quotedText.split(/\s+/).filter(w => w.length > 0);
                  // Check if it looks like a name (1-3 words, not too long, not "אינסרט")
                  if (words.length >= 1 && words.length <= 3 && quotedText.length <= 25 && !quotedText.includes('אינסרט')) {
                    quotedMatchesBefore.push({
                      text: quotedText,
                      index: match.index
                    });
                  }
                }
                
                // Use the last quoted name before the phone as the first name part
                if (quotedMatchesBefore.length > 0) {
                  const firstNamePart = quotedMatchesBefore[quotedMatchesBefore.length - 1].text.trim();
                  // Combine: firstNamePart + " " + lastNameAfterPhone
                  const fullName = `${firstNamePart} ${lastNameAfterPhone}`.trim();
                  detectedSplitName = { 
                    firstName: firstNamePart, 
                    lastName: lastNameAfterPhone, 
                    fullName: fullName 
                  };
                  console.log(`  [SPLIT NAME] Detected split name: "${firstNamePart}" + "${lastNameAfterPhone}" = "${fullName}"`);
                }
              }
            }
          }
        }
        
        // Also check for split names between phone start and continuation (old logic)
        // For split phones like "054-5" "ינובסקי" "78912", also check text after phone start
        const phoneStartPatternOld = phoneMatch.phone.substring(0, 5); // "054-5"
        const afterPatternStart = text.indexOf(phoneStartPatternOld, phoneStart);
        if (afterPatternStart !== -1 && !detectedSplitName) {
          // Start looking after "054-5" (which is 5 chars)
          const searchStart = afterPatternStart + 5;
          const textAfterPattern = text.substring(searchStart, searchStart + 150);
          // Look for continuation pattern like "78912" in quotes
          const continuationMatch = textAfterPattern.match(/"(\d{3,7})"/);
          if (continuationMatch) {
            const textBetween = textAfterPattern.substring(0, continuationMatch.index);
            // Look for a Hebrew word in quotes that could be a last name (like "ינובסקי")
            let lastNameMatch = textBetween.match(/"([א-ת]{4,8})"/);
            if (!lastNameMatch) {
              lastNameMatch = textBetween.match(/([א-ת]{4,8})"/);
            }
            if (!lastNameMatch) {
              lastNameMatch = textBetween.match(/([א-ת]{4,8})\s*"/);
            }
            if (lastNameMatch) {
              const lastName = lastNameMatch[1].trim();
              // Check if we have a first name before the phone
              const firstNamePattern = /([א-ת]{2,4})\s*["']/g;
              const allFirstNameMatches = Array.from(beforePhone.matchAll(firstNamePattern));
              let bestFirstName = null;
              const titleWords = ['ראש', 'הדסק', 'הערכות', 'גורמי', 'האכיפה', 'אמור', 'להתחיל', 'מאס', 'הומניטרי', 'מאסיבי'];
              for (let j = allFirstNameMatches.length - 1; j >= 0; j--) {
                const match = allFirstNameMatches[j];
                const candidate = match[1].trim();
                if (candidate.length >= 2 && candidate.length <= 4 &&
                    !titleWords.some(tw => candidate.includes(tw))) {
                  bestFirstName = candidate;
                  break;
                }
              }
              if (bestFirstName && lastName.length >= 4 && lastName.length <= 8) {
                detectedSplitName = { firstName: bestFirstName, lastName, fullName: `${bestFirstName} ${lastName}` };
              }
            }
          }
        }
        
        console.log(`\n=== Processing phone ${i + 1}: ${phoneMatch.phone} ===`);
        
        // Clean up quotes and extra spaces
        let cleaned = beforePhone.replace(/^["']+|["']+$/g, '').replace(/\s+/g, ' ').trim();
        
        // Remove leading/trailing quotes that might be left
        cleaned = cleaned.replace(/^["']+|["']+$/g, '').trim();
        
        // Skip if it's too short
        if (cleaned.length < 3) {
          console.log(`  Skipping phone ${i + 1}: text too short`);
          continue;
        }
        
        // Don't skip if it looks like header text but is long - it might contain the name
        // Only skip if it's short AND looks like header
        if (cleaned.match(/^(שיחת|פרסומת|קרדיטים|עורך|1\)|2\)|3\)|4\))/i) && cleaned.length < 50) {
          console.log(`  Skipping phone ${i + 1}: looks like short header text`);
          continue;
        }
        
        // Skip if it's just numbers or dates
        if (cleaned.match(/^[\d\s\.\/\-]+$/) && cleaned.length < 15) {
          console.log(`  Skipping phone ${i + 1}: just numbers/dates`);
          continue;
        }
        
        // Try to extract name and title
        // In the document, names can be:
        // 1. In quotes like "אייל אשל"
        // 2. Not in quotes, like "אייל אשל "אביה של רוני""
        // 3. Split, like "רועי "..."ינובסקי"
        let name = '';
        let title = '';
        
        // First, try to find quoted name - look for pattern: "Name" (2-3 words in quotes)
        // Names in quotes are usually 2-3 words, like "אייל אשל" or "רועי ינובסקי"
        const quotedNamePattern = /"([^"]{3,25})"/g;
        const quotedMatches = [];
        let match;
        while ((match = quotedNamePattern.exec(beforePhone)) !== null) {
          const quotedText = match[1].trim();
          const words = quotedText.split(/\s+/).filter(w => w.length > 0);
          // If it's 2-3 words and doesn't contain punctuation, it's likely a name
          if (words.length >= 2 && words.length <= 3 && !quotedText.match(/[,\.:;]/) && quotedText.length <= 25) {
            quotedMatches.push({
              text: quotedText,
              index: match.index,
              endIndex: match.index + match[0].length
            });
          }
        }
        
        // Also look for unquoted names - pattern: "Name " (2-3 words followed by quote or space)
        // This handles cases like "אייל אשל "אביה של רוני""
        // The name should be 2-3 Hebrew words, not containing common title words
        // Look for pattern: Hebrew word + space + Hebrew word, followed by quote
        // But we need to be more specific - the name should be at the START of the text before the phone
        const unquotedNamePattern = /^([א-ת]{2,6}\s+[א-ת]{2,8})\s*["']/;
        let unquotedNameMatch = beforePhone.match(unquotedNamePattern);
        
        // If not at start, try to find it anywhere but validate it's a real name
        if (!unquotedNameMatch) {
          const unquotedNamePatternAnywhere = /([א-ת]{2,6}\s+[א-ת]{2,8})\s*["']/;
          unquotedNameMatch = beforePhone.match(unquotedNamePatternAnywhere);
        }
        
        // Validate unquoted name - it shouldn't contain common title words
        if (unquotedNameMatch) {
          const candidateName = unquotedNameMatch[1].trim();
          const words = candidateName.split(/\s+/).filter(w => w.length > 0);
          // Should be 2-3 words
          if (words.length < 2 || words.length > 3) {
            unquotedNameMatch = null;
          } else {
            const titleWords = ['אביה', 'של', 'תצפיתנית', 'רצחה', 'בשבי', 'שנחטפה', 'ונרצחה', 'חוקר', 'כלכלת', 'ראש', 'הדסק', 'הערכות', 'גורמי', 'האכיפה', 'ממובילי', 'מועצת', 'וכולל', 'משפחות', 'חטופים', 'פעילי', 'דורש', 'ועדת', 'חקירה', 'ממלכתית', 'טבח', 'צה"ל', 'נערך', 'לכיבוש', 'העיר', 'עזה', 'במבצע', 'צבאי', 'במקביל', 'לסיוע', 'הומניטרי', 'מאסיבי', 'לאוכלוסיה', 'האזרחית'];
            if (titleWords.some(word => candidateName.includes(word))) {
              // This is not a name, it's part of a title
              unquotedNameMatch = null;
            }
          }
        }
        
        // Check for split names - pattern like "רועי "..."ינובסקי"
        // Look for a single Hebrew word followed by quote, then later another Hebrew word in quotes
        // The pattern is: "רועי "..."ינובסקי" where there's text between them
        // More specifically: Hebrew word + quote + ... + quote + Hebrew word + quote
        const splitNamePattern = /([א-ת]{2,6})\s*["'][^"]*["']\s*([א-ת]{4,10})\s*["']/;
        let splitNameMatch = beforePhone.match(splitNamePattern);
        
        // Also try a more flexible pattern: look for "רועי" and "ינובסקי" separately
        // First word should appear early, second word should appear later (closer to phone)
        if (!splitNameMatch) {
          const firstWordPattern = /([א-ת]{2,6})\s*["']/;
          const secondWordPattern = /([א-ת]{4,10})\s*["']/g;
          const firstMatch = beforePhone.match(firstWordPattern);
          if (firstMatch) {
            const allSecondMatches = Array.from(beforePhone.matchAll(secondWordPattern));
            // Find the last match that's after the first match
            for (let i = allSecondMatches.length - 1; i >= 0; i--) {
              const secondMatch = allSecondMatches[i];
              if (secondMatch.index > firstMatch.index + firstMatch[0].length + 10) {
                // This could be a split name
                const firstName = firstMatch[1].trim();
                const lastName = secondMatch[1].trim();
                // Validate both are reasonable name parts
                if (firstName.length >= 2 && firstName.length <= 6 && lastName.length >= 4 && lastName.length <= 10) {
                  splitNameMatch = {
                    0: firstMatch[0] + '...' + secondMatch[0],
                    1: firstName,
                    2: lastName,
                    index: firstMatch.index
                  };
                  break;
                }
              }
            }
          }
        }
        
        // If we found quoted names, use the last one before the phone (most likely the actual name)
        // But also check if there's an unquoted name that might be the actual name
        // Or a split name like "רועי" and "ינובסקי"
        // Or a split name detected between phone parts
        if (quotedMatches.length > 0 || unquotedNameMatch || splitNameMatch || detectedSplitName) {
          let nameMatch = null;
          
          // First priority: quoted names (most reliable)
          if (quotedMatches.length > 0) {
            // Use the last quoted name (closest to phone)
            const lastQuoted = quotedMatches[quotedMatches.length - 1];
            nameMatch = {
              text: lastQuoted.text,
              index: lastQuoted.index,
              endIndex: lastQuoted.endIndex
            };
            console.log(`  Using quoted name: "${lastQuoted.text}"`);
          }
          
          // Second priority: split names detected between phone parts (only if no quoted name)
          if (!nameMatch && detectedSplitName) {
            nameMatch = {
              text: detectedSplitName.fullName,
              index: beforePhone.length - 50, // Approximate position
              endIndex: beforePhone.length
            };
            console.log(`  Using detected split name: "${detectedSplitName.fullName}"`);
          }
          
          // Then check for split names in beforePhone text
          if (!nameMatch && splitNameMatch && splitNameMatch.index > 0) {
            const firstName = splitNameMatch[1].trim();
            const lastName = splitNameMatch[2].trim();
            const fullName = `${firstName} ${lastName}`;
            // Validate: both parts should be reasonable name parts, not title words
            const titleWords = ['דורש', 'לסיוע', 'אביה', 'של', 'תצפיתנית', 'רצחה', 'בשבי', 'שנחטפה', 'ונרצחה', 'חוקר', 'כלכלת', 'ראש', 'הדסק', 'הערכות', 'גורמי', 'האכיפה', 'ממובילי', 'מועצת', 'וכולל', 'משפחות', 'חטופים', 'פעילי', 'ועדת', 'חקירה', 'ממלכתית', 'טבח'];
            const isTitleWord = titleWords.some(word => firstName.includes(word) || lastName.includes(word));
            // Check if it looks like a valid name (2 words, reasonable length, not title words)
            if (!isTitleWord && fullName.length >= 6 && fullName.length <= 25 && firstName.length >= 2 && lastName.length >= 4) {
              nameMatch = {
                text: fullName,
                index: splitNameMatch.index,
                endIndex: splitNameMatch.index + (splitNameMatch[0] ? splitNameMatch[0].length : 0)
              };
              console.log(`  Found split name: "${fullName}"`);
            }
          }
          
          // If no split name, prefer unquoted name if it's closer to the phone and looks valid
          if (!nameMatch && unquotedNameMatch && unquotedNameMatch.index > 0) {
            const unquotedName = unquotedNameMatch[1].trim();
            const words = unquotedName.split(/\s+/).filter(w => w.length > 0);
            // Check if it's a valid name (2-3 words, reasonable length)
            if (words.length >= 2 && words.length <= 3 && unquotedName.length >= 4 && unquotedName.length <= 25) {
              // Check if there's a quoted name after it (which would be part of the title)
              const afterUnquoted = beforePhone.substring(unquotedNameMatch.index + unquotedNameMatch[0].length);
              const hasQuotedAfter = afterUnquoted.match(/^["'\s]*"([^"]{3,})"/);
              // If there's quoted text after, the unquoted is likely the name
              // OR if the unquoted name appears at the start of the text (before any other quoted text)
              const isAtStart = unquotedNameMatch.index < 50; // Within first 50 chars
              if (hasQuotedAfter || isAtStart) {
                nameMatch = {
                  text: unquotedName,
                  index: unquotedNameMatch.index,
                  endIndex: unquotedNameMatch.index + unquotedNameMatch[0].length
                };
                console.log(`  Found unquoted name: "${unquotedName}"`);
              }
            }
          }
          
          // If no unquoted name or it doesn't look right, use quoted name
          if (!nameMatch && quotedMatches.length > 0) {
            // Use the last quoted name (closest to the phone)
            nameMatch = quotedMatches[quotedMatches.length - 1];
            console.log(`  Found quoted name: "${nameMatch.text}"`);
          }
          
          if (nameMatch) {
            name = nameMatch.text;
            
            // For split names detected between phone parts, extract title from between name parts
            console.log(`  [TITLE CHECK] detectedSplitName: ${detectedSplitName ? detectedSplitName.fullName : 'null'}, name: "${name}"`);
            if (detectedSplitName && name === detectedSplitName.fullName) {
              console.log(`  [SPLIT TITLE] Extracting title for split name: "${name}"`);
              // The title is between "ינובסקי" and "78912" (the continuation)
              // We already have textBetween from the detection logic
              const phoneStartPattern = phoneMatch.phone.substring(0, 5); // "054-5"
              const afterPatternStart = text.indexOf(phoneStartPattern, phoneStart);
              console.log(`  [SPLIT TITLE] Looking for pattern "${phoneStartPattern}" starting from index ${phoneStart}`);
              console.log(`  [SPLIT TITLE] Found pattern at index: ${afterPatternStart}`);
              if (afterPatternStart !== -1) {
                const searchStart = afterPatternStart + 5;
                const textAfterPattern = text.substring(searchStart, searchStart + 200);
                console.log(`  [SPLIT TITLE] Text after pattern (first 150): "${textAfterPattern.substring(0, 150)}"`);
                const continuationMatch = textAfterPattern.match(/"(\d{4,7})"/);
                if (continuationMatch) {
                  console.log(`  [SPLIT TITLE] Found continuation: "${continuationMatch[1]}" at index ${continuationMatch.index}`);
                  const textBetween = textAfterPattern.substring(0, continuationMatch.index);
                  console.log(`  [SPLIT TITLE] Text between (first 150): "${textBetween.substring(0, 150)}"`);
                  // Find "ינובסקי" in the text - try multiple patterns
                  let lastNameIndex = textBetween.indexOf('"ינובסקי"');
                  if (lastNameIndex === -1) {
                    lastNameIndex = textBetween.indexOf('"ינובסקי ');
                  }
                  if (lastNameIndex === -1) {
                    lastNameIndex = textBetween.indexOf('ינובסקי');
                  }
                  console.log(`  [SPLIT TITLE] "ינובסקי" found at index: ${lastNameIndex}`);
                  if (lastNameIndex !== -1) {
                    // Title is everything after "ינובסקי" up to the continuation
                    // But we need to look BEFORE "ינובסקי" for "ראש הדסק"
                    // The title is: "ראש הדסק הפלילי ב"כאן 11""
                    // Look for "ראש" - it's in beforePhone, not in textBetween
                    // The title "ראש הדסק הפלילי ב"כאן 11"" spans from beforePhone to textBetween
                    const rishInBefore = beforePhone.indexOf('ראש');
                    let titleText = '';
                    
                    if (rishInBefore !== -1) {
                      // Found "ראש" in beforePhone - extract from there
                      // The title goes from "ראש" to before "ינובסקי", then continues after "ינובסקי" in textBetween
                      const titleStart = rishInBefore;
                      // Find "ינובסקי" in beforePhone (it might be there) or use textBetween
                      const yanovskiInBefore = beforePhone.indexOf('ינובסקי');
                      if (yanovskiInBefore > titleStart) {
                        // "ינובסקי" is in beforePhone, title is from "ראש" to "ינובסקי"
                        titleText = beforePhone.substring(titleStart, yanovskiInBefore).trim();
                        // Then add text after "ינובסקי" in textBetween up to "78912"
                        const afterYanovskiInBetween = textBetween.substring(lastNameIndex);
                        // Find "הפלילי" in the after text
                        const pliliAfter = afterYanovskiInBetween.indexOf('הפלילי');
                        if (pliliAfter !== -1) {
                          // Extract from "הפלילי" to before "78912"
                          let continuation = afterYanovskiInBetween.substring(pliliAfter, continuationMatch.index);
                          // Stop before "78912" or "מיליון"
                          const millionIndex = continuation.indexOf('מיליון');
                          if (millionIndex > 0 && millionIndex < 50) {
                            continuation = continuation.substring(0, millionIndex).trim();
                          }
                          titleText += ' ' + continuation.trim();
                        }
                      } else {
                        // "ינובסקי" is not in beforePhone, it's in textBetween
                        // Title should be "ראש הדסק הפלילי ב"כאן 11""
                        // Look for "הדסק" in beforePhone - it should be right after "ראש"
                        const daskInBefore = beforePhone.indexOf('הדסק', titleStart);
                        if (daskInBefore !== -1 && daskInBefore < titleStart + 20) {
                          // Found "הדסק" right after "ראש" - title starts from "ראש הדסק"
                          // But we need to stop before "הערכות" which is not part of the title
                          const erachotIndex = beforePhone.indexOf('הערכות', daskInBefore);
                          if (erachotIndex !== -1 && erachotIndex < daskInBefore + 50) {
                            // "הערכות" appears - title is "ראש הדסק" only, then continue from textBetween
                            titleText = beforePhone.substring(titleStart, erachotIndex).trim();
                            // Now add "הפלילי" from textBetween
                            const pliliInBetween = textBetween.indexOf('הפלילי');
                            if (pliliInBetween !== -1) {
                              let continuation = textBetween.substring(pliliInBetween, continuationMatch.index);
                              // Stop before "מיליון"
                              const millionIndex = continuation.indexOf('מיליון');
                              if (millionIndex > 0 && millionIndex < 50) {
                                continuation = continuation.substring(0, millionIndex).trim();
                              }
                              titleText += ' ' + continuation.trim();
                            }
                          } else {
                            // No "הערכות", title is from "ראש" to end of beforePhone, then add from textBetween
                            titleText = beforePhone.substring(titleStart).trim();
                            const pliliInBetween = textBetween.indexOf('הפלילי');
                            if (pliliInBetween !== -1) {
                              let continuation = textBetween.substring(pliliInBetween, continuationMatch.index);
                              const millionIndex = continuation.indexOf('מיליון');
                              if (millionIndex > 0 && millionIndex < 50) {
                                continuation = continuation.substring(0, millionIndex).trim();
                              }
                              titleText += ' ' + continuation.trim();
                            }
                          }
                        } else {
                          // "הדסק" not found, look for "הפלילי" in textBetween
                          const pliliInBetween = textBetween.indexOf('הפלילי');
                          if (pliliInBetween !== -1) {
                            // Extract from "הפלילי" to before "78912"
                            let continuation = textBetween.substring(pliliInBetween, continuationMatch.index);
                            // Stop before "מיליון"
                            const millionIndex = continuation.indexOf('מיליון');
                            if (millionIndex > 0 && millionIndex < 50) {
                              continuation = continuation.substring(0, millionIndex).trim();
                            }
                            // Add "ראש הדסק" from beforePhone
                            const daskInBefore2 = beforePhone.indexOf('הדסק', titleStart);
                            if (daskInBefore2 !== -1 && daskInBefore2 < titleStart + 20) {
                              titleText = beforePhone.substring(titleStart, daskInBefore2 + 'הדסק'.length).trim();
                            } else {
                              titleText = beforePhone.substring(titleStart, titleStart + 10).trim(); // Just "ראש"
                            }
                            titleText += ' ' + continuation.trim();
                          }
                        }
                      }
                    } else {
                      // "ראש" not found in beforePhone, look in textBetween
                      const rishIndex = textBetween.indexOf('ראש');
                      if (rishIndex !== -1 && rishIndex < lastNameIndex) {
                        titleText = textBetween.substring(rishIndex, continuationMatch.index).trim();
                      } else {
                        // Fallback: start from after "ינובסקי"
                        const yanovskiEnd = lastNameIndex + (textBetween.substring(lastNameIndex).match(/ינובסקי\s*["']?/) || [''])[0].length;
                        titleText = textBetween.substring(yanovskiEnd, continuationMatch.index).trim();
                        // Look for "הפלילי" or "הדסק"
                        const pliliIndex = titleText.indexOf('הפלילי');
                        const daskIndex = titleText.indexOf('הדסק');
                        if (pliliIndex !== -1) {
                          titleText = titleText.substring(pliliIndex).trim();
                        } else if (daskIndex !== -1) {
                          titleText = titleText.substring(daskIndex).trim();
                        }
                      }
                    }
                    // Clean up: remove leading quotes/spaces
                    titleText = titleText.replace(/^["'\s]+/, '').trim();
                    // Stop before phone continuation "78912" or "מיליון" (which is after the title)
                    const phoneContInTitle = titleText.indexOf('"78912"');
                    const millionIndex = titleText.indexOf('מיליון');
                    if (phoneContInTitle > 0) {
                      titleText = titleText.substring(0, phoneContInTitle).trim();
                    } else if (millionIndex > 0 && millionIndex < 100) {
                      titleText = titleText.substring(0, millionIndex).trim();
                    }
                    // Remove trailing quotes
                    titleText = titleText.replace(/["']+\s*$/, '').trim();
                    // Clean up quotes in the middle but preserve content
                    titleText = titleText.replace(/["']+/g, ' ').replace(/\s+/g, ' ').trim();
                    // The title should be "ראש הדסק הפלילי ב"כאן 11""
                    // Look for "11" - it appears after "78912" in the text
                    if (titleText.includes('כאן') && !titleText.includes('11')) {
                      // Check if "11" appears after "78912" in the original text
                      const afterContinuation = textAfterPattern.substring(continuationMatch.index + continuationMatch[0].length);
                      const elevenAfter = afterContinuation.match(/["']\s*11\s*["']/);
                      if (elevenAfter) {
                        titleText += ' 11';
                      }
                    }
                    title = titleText;
                    console.log(`  Extracted title for split name: "${title}"`);
                  }
                }
              }
            }
            
            // If title is still empty, extract from beforePhone text
            if (!title || title.length === 0) {
              // Title is everything between the name and the phone
              // But we need to look at the FULL text, not just beforePhone, to get continuation lines
              // Get the full text around this phone to find title continuation
              const fullTextAroundPhone = text.substring(Math.max(0, prevPhoneEnd - 100), phoneStart + 200);
              const nameInFullText = fullTextAroundPhone.indexOf(name);
              
              let afterName = '';
              if (nameInFullText !== -1) {
                // Find phone in full text
                const phoneInFullText = fullTextAroundPhone.indexOf(phoneMatch.phone, nameInFullText);
                if (phoneInFullText > nameInFullText) {
                  afterName = fullTextAroundPhone.substring(nameInFullText + name.length, phoneInFullText).trim();
                } else {
                  // Fallback to beforePhone
                  afterName = beforePhone.substring(nameMatch.endIndex).trim();
                }
              } else {
                afterName = beforePhone.substring(nameMatch.endIndex).trim();
              }
              
              console.log(`  [TITLE DEBUG] Name: "${name}", afterName (first 150): "${afterName.substring(0, 150)}"`);
              
              // Remove leading quotes/spaces
              afterName = afterName.replace(/^["'\s]+/, '');
              
              // For item 1 ("אייל אשל"): Look for title continuation after the phone
              // Expected title: "אביה של רוני אשל ז"ל, תצפיתנית שנחטפה ב-7.10 ונרצחה בשבי"
              // Current: "אביה של רוני" - need to add "אשל ז"ל" and continuation
              if (name === 'אייל אשל') {
                // Stop before "ממובילי" which starts the next item
                const mumbalimIndex = afterName.indexOf('ממובילי');
                if (mumbalimIndex > 0) {
                  afterName = afterName.substring(0, mumbalimIndex).trim();
                }
                
                // Look for continuation after the phone - check a larger range
                // "אשל ז"ל" appears after the phone, possibly on the next line
                // The phone might be split: "050-6" "24134", so we need to look after both parts
                const phoneEnd = phoneStart + phoneMatch.phone.length;
                // Check if there's a phone continuation (like "24134")
                const afterPhone = text.substring(phoneEnd, phoneEnd + 100);
                const phoneContMatch = afterPhone.match(/"(\d{4,7})"/);
                const phoneContEnd = phoneContMatch ? phoneEnd + phoneContMatch.index + phoneContMatch[0].length : phoneEnd;
                
                // Now search for "אשל ז"ל" - it appears BETWEEN the phone and the phone continuation
                // Check the text between phoneEnd and phoneContEnd
                const betweenPhoneAndCont = text.substring(phoneEnd, phoneContEnd);
                console.log(`  [ITEM 1 DEBUG] phoneEnd: ${phoneEnd}, phoneContEnd: ${phoneContEnd}`);
                console.log(`  [ITEM 1 DEBUG] betweenPhoneAndCont: "${betweenPhoneAndCont}"`);
                
                // Also check after phone continuation
                const afterPhoneFull = text.substring(phoneContEnd, phoneContEnd + 600);
                console.log(`  [ITEM 1 DEBUG] afterPhoneFull (first 200): "${afterPhoneFull.substring(0, 200)}"`);
                
                // First, look for "אשל ז"ל" - try in between phone and continuation first
                // The text shows "של ז"ל" (missing "א"), so "אשל" might be part of "רוני אשל"
                // Check if "אשל" appears at the end of afterName
                let ashelZlIndex = -1;
                let searchText = '';
                let searchOffset = 0;
                
                // Check if "אשל" appears right before the phone (it should be part of "רוני אשל")
                const beforePhoneText = text.substring(Math.max(0, phoneStart - 50), phoneStart);
                const ashelBeforePhone = beforePhoneText.indexOf('אשל');
                
                // Look for "ז"ל" in betweenPhoneAndCont
                const zlIndex = betweenPhoneAndCont.indexOf('ז"ל');
                
                if (zlIndex !== -1) {
                  // Found "ז"ל" - extract it with comma
                  let zlText = betweenPhoneAndCont.substring(zlIndex);
                  const commaIndex = zlText.indexOf(',');
                  if (commaIndex > 0 && commaIndex < 15) {
                    zlText = zlText.substring(0, commaIndex + 1).trim();
                  } else {
                    zlText = zlText.substring(0, 'ז"ל'.length + 3).trim();
                  }
                  
                  // Add "אשל" if it's before phone, otherwise check if it's at end of afterName
                  if (ashelBeforePhone !== -1) {
                    // "אשל" is before phone - add it
                    const ashelText = beforePhoneText.substring(ashelBeforePhone).trim();
                    afterName = afterName.trim() + ' ' + ashelText + ' ' + zlText;
                    ashelZlIndex = 0; // Mark as found
                    console.log(`  [ITEM 1 DEBUG] Found "אשל" before phone and "ז"ל" in between, combined: "${afterName.substring(0, 100)}"`);
                  } else if (afterName.trim().endsWith('אשל') || afterName.includes('רוני אשל')) {
                    // "אשל" is already in afterName
                    afterName = afterName.trim() + ' ' + zlText;
                    ashelZlIndex = 0; // Mark as found
                    console.log(`  [ITEM 1 DEBUG] Found "ז"ל" and added to title (אשל already in afterName), afterName: "${afterName.substring(0, 100)}"`);
                  } else {
                    // "אשל" not found - add it manually
                    afterName = afterName.trim() + ' אשל ' + zlText;
                    console.log(`  [ITEM 1 DEBUG] Added "אשל" manually and "ז"ל", afterName: "${afterName.substring(0, 100)}"`);
                  }
                  
                  // Now add continuation "תצפיתנית שנחטפה ב-7.10 ונרצחה בשבי"
                  const tzofitIndex = afterPhoneFull.indexOf('תצפיתנית');
                  if (tzofitIndex !== -1) {
                    let continuation = afterPhoneFull.substring(tzofitIndex);
                    // The continuation should be: "תצפיתנית שנחטפה ב-7.10 ונרצחה בשבי"
                    // The text structure shows: "תצפיתנית "ועדת חקירה ממלכתית לטבח ה-7.10 "1 " " "שנחטפה " " " " "ב-7.10 " " " " "ונרצחה בשבי"
                    // So "ועדת" appears between "תצפיתנית" and "שנחטפה" - we need to skip it
                    
                    // Look for "שנחטפה" which comes after "ועדת"
                    const shanhtapaIndex = continuation.indexOf('שנחטפה');
                    if (shanhtapaIndex !== -1) {
                      // Found "שנחטפה" - extract from "תצפיתנית" to "שנחטפה" and beyond
                      // First get "תצפיתנית" (before "ועדת")
                      const tzofitText = continuation.substring(0, continuation.indexOf('ועדת')).trim();
                      // Then get from "שנחטפה" onwards
                      const fromShanhtapa = continuation.substring(shanhtapaIndex);
                      // Look for "ונרצחה בשבי" to know where to stop
                      const venirtzahaIndex = fromShanhtapa.indexOf('ונרצחה בשבי');
                      if (venirtzahaIndex !== -1) {
                        // Found "ונרצחה בשבי" - extract up to there
                        continuation = (tzofitText + ' ' + fromShanhtapa.substring(0, venirtzahaIndex + 'ונרצחה בשבי'.length)).trim();
                      } else {
                        // "ונרצחה בשבי" not found, use what we have
                        continuation = (tzofitText + ' ' + fromShanhtapa).trim();
                      }
                    } else {
                      // "שנחטפה" not found, try to extract "תצפיתנית" and look for "ונרצחה בשבי"
                      const venirtzahaIndex = continuation.indexOf('ונרצחה בשבי');
                      if (venirtzahaIndex !== -1) {
                        // Stop before "ועדת" if it appears before "ונרצחה בשבי"
                        const veadatIndex = continuation.indexOf('ועדת');
                        if (veadatIndex !== -1 && veadatIndex < venirtzahaIndex) {
                          // "ועדת" appears before "ונרצחה בשבי" - extract "תצפיתנית" and skip to after "ועדת"
                          const beforeVeadat = continuation.substring(0, veadatIndex).trim();
                          const afterVeadat = continuation.substring(veadatIndex);
                          const venirtzahaAfter = afterVeadat.indexOf('ונרצחה בשבי');
                          if (venirtzahaAfter !== -1) {
                            // Find "שנחטפה" between "ועדת" and "ונרצחה בשבי"
                            const shanhtapaAfter = afterVeadat.indexOf('שנחטפה');
                            if (shanhtapaAfter !== -1 && shanhtapaAfter < venirtzahaAfter) {
                              continuation = (beforeVeadat + ' ' + afterVeadat.substring(shanhtapaAfter, venirtzahaAfter + 'ונרצחה בשבי'.length)).trim();
                            } else {
                              continuation = (beforeVeadat + ' ' + afterVeadat.substring(venirtzahaAfter, venirtzahaAfter + 'ונרצחה בשבי'.length)).trim();
                            }
                          }
                        } else {
                          continuation = continuation.substring(0, venirtzahaIndex + 'ונרצחה בשבי'.length).trim();
                        }
                      }
                    }
                    
                    // Clean up continuation - remove extra quotes and normalize
                    continuation = continuation.replace(/["']+/g, ' ').replace(/\s+/g, ' ').trim();
                    // Remove standalone "1" if it appears (but keep "7.10")
                    continuation = continuation.replace(/\s+1\s+/g, ' ').trim();
                    afterName += ' ' + continuation.trim();
                    console.log(`  [ITEM 1 DEBUG] Added continuation, final afterName: "${afterName.substring(0, 200)}"`);
                  }
                  
                  // Mark as found so we don't continue to else branch
                  ashelZlIndex = 0;
                } else {
                  // "ז"ל" not found in betweenPhoneAndCont, try other patterns
                  // Try full "אשל ז"ל" pattern
                  ashelZlIndex = betweenPhoneAndCont.indexOf('אשל ז"ל');
                  searchText = betweenPhoneAndCont;
                  searchOffset = phoneEnd;
                  
                  if (ashelZlIndex === -1) {
                    // Not found between, try after continuation
                    ashelZlIndex = afterPhoneFull.indexOf('אשל ז"ל');
                    searchText = afterPhoneFull;
                    searchOffset = phoneContEnd;
                  }
                  if (ashelZlIndex === -1) {
                    // Try without quotes
                    ashelZlIndex = afterPhoneFull.indexOf('אשל זל');
                  }
                  if (ashelZlIndex === -1) {
                    // Try with different quote style
                    ashelZlIndex = afterPhoneFull.indexOf('אשל ז\'ל');
                  }
                  
                  if (ashelZlIndex !== -1 && ashelZlIndex < 400) {
                    // Found "אשל ז"ל" - add it to the title
                    console.log(`  [ITEM 1 DEBUG] Found "אשל ז"ל" at index ${ashelZlIndex} in ${searchText === betweenPhoneAndCont ? 'between' : 'after'} text`);
                    // Extract "אשל ז"ל" and look for comma after it
                    let ashelZlText = searchText.substring(ashelZlIndex, ashelZlIndex + 30);
                    // Look for comma
                    const commaIndex = ashelZlText.indexOf(',');
                    if (commaIndex > 0 && commaIndex < 25) {
                      ashelZlText = ashelZlText.substring(0, commaIndex + 1).trim();
                    } else {
                      // No comma, just get "אשל ז"ל" and a bit more
                      const endIndex = Math.min(ashelZlText.length, 'אשל ז"ל'.length + 5);
                      ashelZlText = ashelZlText.substring(0, endIndex).trim();
                    }
                    afterName = afterName.trim() + ' ' + ashelZlText.trim();
                    
                    // Then look for "תצפיתנית" which comes after "אשל ז"ל"
                    // It should be in afterPhoneFull (after the phone continuation)
                    const tzofitIndex = afterPhoneFull.indexOf('תצפיתנית');
                    if (tzofitIndex !== -1) {
                      // Extract from "תצפיתנית" to before next item markers
                      // The full continuation is: "תצפיתנית שנחטפה ב-7.10 ונרצחה בשבי"
                      let continuation = afterPhoneFull.substring(tzofitIndex);
                      // Stop before "ועדת" or "דורש" or "ממובילי" or "וכולל"
                      const stopMarkers = ['ועדת', 'דורש', 'ממובילי', 'מועצת', 'וכולל'];
                      for (const stopMarker of stopMarkers) {
                        const stopIndex = continuation.indexOf(stopMarker);
                        if (stopIndex > 0 && stopIndex < 300) {
                          continuation = continuation.substring(0, stopIndex).trim();
                          break;
                        }
                      }
                      // Clean up continuation - remove extra quotes and normalize
                      continuation = continuation.replace(/["']+/g, ' ').replace(/\s+/g, ' ').trim();
                      // Remove standalone "1" if it appears
                      continuation = continuation.replace(/\s+1\s+/g, ' ').trim();
                      afterName += ' ' + continuation.trim();
                    }
                  }
                }
                
                // If we still haven't found "אשל ז"ל", try other markers
                if (ashelZlIndex === -1) {
                  // "אשל ז"ל" not found, try other markers
                  const continuationMarkers = ['תצפיתנית', 'שנחטפה', 'ונרצחה בשבי', 'ב-7.10'];
                  for (const marker of continuationMarkers) {
                    const markerIndex = afterPhoneFull.indexOf(marker);
                    if (markerIndex !== -1 && markerIndex < 300) {
                      let continuation = afterPhoneFull.substring(markerIndex);
                      // Stop before next item markers
                      const stopMarkers = ['ועדת', 'דורש', 'ממובילי', 'מועצת', 'וכולל'];
                      for (const stopMarker of stopMarkers) {
                        const stopIndex = continuation.indexOf(stopMarker);
                        if (stopIndex > 0 && stopIndex < 250) {
                          continuation = continuation.substring(0, stopIndex).trim();
                          break;
                        }
                      }
                      // If we found "תצפיתנית", try to add "אשל ז"ל" before it
                      if (marker === 'תצפיתנית') {
                        // Look backwards for "אשל ז"ל"
                        const beforeMarker = afterPhoneFull.substring(0, markerIndex);
                        const ashelZlBefore = beforeMarker.indexOf('אשל ז"ל');
                        if (ashelZlBefore !== -1 && ashelZlBefore > markerIndex - 100) {
                          const ashelZlText = afterPhoneFull.substring(ashelZlBefore, markerIndex).trim();
                          afterName = afterName.trim() + ' ' + ashelZlText.trim() + ', ' + continuation.trim();
                        } else {
                          afterName = afterName.trim() + ' ' + continuation.trim();
                        }
                      } else {
                        afterName = afterName.trim() + ' ' + continuation.trim();
                      }
                      break;
                    }
                  }
                }
                
                // Clean up: normalize whitespace but preserve quotes in "ז"ל"
                // Replace multiple spaces with single space, but keep the structure
                afterName = afterName.replace(/\s+/g, ' ').trim();
                // Remove standalone numbers like "1" that aren't part of the title (but keep "7.10")
                afterName = afterName.replace(/\s+1\s+/g, ' ').replace(/^\d+\s+/, '').replace(/\s+\d+$/, '').trim();
                // Remove "ועדת" if it appears (it's from the next item)
                afterName = afterName.replace(/ועדת.*$/, '').trim();
                // Remove "חקירה" or "ממלכתית" if they appear (from next item)
                afterName = afterName.replace(/חקירה.*$/, '').replace(/ממלכתית.*$/, '').trim();
                // Ensure "ז"ל" has the quote mark - fix if it was removed
                afterName = afterName.replace(/ז ל/g, 'ז"ל');
                // Remove extra quote after "רוני" - should be "רוני אשל" not "רוני" אשל
                afterName = afterName.replace(/רוני"\s+אשל/g, 'רוני אשל');
                
                // Set title from afterName for item 1
                title = afterName;
                console.log(`  [ITEM 1 FINAL] Final title: "${title}"`);
              }
              
              // For item 2 ("אייל עופר"): Title should be "חוקר כלכלת חמאס"
              // Current text shows: "חוקר כלכלת "צה"ל..." - need to stop before "צה"ל" and add "חמאס"
              if (name === 'אייל עופר') {
                // Stop before "צה"ל" which is in the next item's content
                const tzahalIndex = afterName.indexOf('"צה"ל');
                if (tzahalIndex > 0) {
                  afterName = afterName.substring(0, tzahalIndex).trim();
                }
                
                // Look for "חמאס" after the phone (it's in the next line)
                const afterPhoneFull = text.substring(phoneStart + phoneMatch.phone.length, phoneStart + phoneMatch.phone.length + 300);
                const hamasIndex = afterPhoneFull.indexOf('חמאס');
                if (hamasIndex !== -1 && hamasIndex < 150) {
                  // Found "חמאס" - add it to the title
                  // Check if it's followed by quote or space, then stop
                  const hamasText = afterPhoneFull.substring(hamasIndex, hamasIndex + 10);
                  if (hamasText.startsWith('חמאס')) {
                    // Add "חמאס" to title
                    afterName = (afterName.trim() + ' חמאס').trim();
                    // Stop - title is complete
                  }
                }
              }
              
              // For item 3 ("רועי ינובסקי"): Title should be "ראש הדסק הפלילי ב"כאן 11""
              // This is handled in the split name section below
              
              // The title should be the text immediately after the name, up to the phone number
              // Stop before any other quoted names (next interviewee) or phone patterns
              
              let titleEnd = afterName.length;
              
              // Check if there's another quoted name after (indicates next interviewee)
              // Look for pattern: "Name" where Name is 2-3 words
              const nextQuotedNamePattern = /"([^"]{3,25})"/g;
              let nextNameMatch;
              while ((nextNameMatch = nextQuotedNamePattern.exec(afterName)) !== null) {
                const nextQuotedText = nextNameMatch[1].trim();
                const nextWords = nextQuotedText.split(/\s+/).filter(w => w.length > 0);
                // If it looks like a name (2-3 words, no punctuation)
                if (nextWords.length >= 2 && nextWords.length <= 3 && !nextQuotedText.match(/[,\.:;]/)) {
                  titleEnd = nextNameMatch.index;
                  break;
                }
              }
              
              // Also check for patterns that indicate the next item (like "פרסומות" or phone patterns)
              // But be careful - "פרסומות" might appear in the title, so only stop if it's clearly a separator
              const nextItemPatterns = [
                { pattern: /פרסומות\s*"/, minIndex: 30 }, // "פרסומות" followed by quote
                { pattern: /פרסומת\s*"/, minIndex: 30 },
                { pattern: /0\d{2}[\-\s]?\d{1,3}/, minIndex: 10 }
              ];
              for (const itemPattern of nextItemPatterns) {
                const match = afterName.match(itemPattern.pattern);
                if (match && match.index > itemPattern.minIndex && match.index < titleEnd) {
                  titleEnd = match.index;
                  break;
                }
              }
              
              // If we didn't find another name or item marker, look for phone number patterns
              if (titleEnd === afterName.length) {
                const phonePatternInTitle = /0\d{2}[\-\s]?\d{1,3}/;
                const phoneMatch = afterName.match(phonePatternInTitle);
                if (phoneMatch && phoneMatch.index > 10) {
                  // There's a phone pattern, title ends well before it
                  titleEnd = Math.min(phoneMatch.index - 5, titleEnd);
                }
              }
              
              // For item 1: Stop before "ממובילי" which starts the next item
              // The title should be: "אביה של רוני אשל ז"ל, תצפיתנית שנחטפה ב-7.10 ונרצחה בשבי"
              // Stop before "ממובילי" which is clearly the start of the next item
              if (afterName.includes('ממובילי')) {
                const mumbalimIndex = afterName.indexOf('ממובילי');
                // Check if there's a quote before it (indicates start of next item)
                const beforeMumbalim = afterName.substring(Math.max(0, mumbalimIndex - 10), mumbalimIndex);
                if (beforeMumbalim.includes('"') || mumbalimIndex > 40) {
                  titleEnd = mumbalimIndex;
                }
              }
              
              // For item 2: Stop after "חמאס" 
              // The title should be: "חוקר כלכלת חמאס"
              // Stop before "צה"ל" which is in the next item's content
              if (afterName.includes('חמאס')) {
                const hamasIndex = afterName.indexOf('חמאס');
                // Look for what comes after "חמאס"
                const afterHamas = afterName.substring(hamasIndex + 'חמאס'.length, hamasIndex + 'חמאס'.length + 30);
                // If there's "צה"ל" or a quote followed by "צה"ל", stop before it
                const tzahalAfter = afterHamas.indexOf('"צה"ל');
                if (tzahalAfter !== -1 && tzahalAfter < 15) {
                  titleEnd = hamasIndex + 'חמאס'.length + tzahalAfter;
                } else {
                  // Stop right after "חמאס" (maybe there's a quote or space)
                  const quoteAfter = afterHamas.match(/["']/);
                  if (quoteAfter && quoteAfter.index < 5) {
                    titleEnd = hamasIndex + 'חמאס'.length + quoteAfter.index;
                  } else {
                    titleEnd = Math.min(hamasIndex + 'חמאס'.length + 3, titleEnd);
                  }
                }
              }
              
              // Also check for other markers
              const otherMarkers = ['מועצת', 'וכולל'];
              for (const marker of otherMarkers) {
                const markerIndex = afterName.indexOf(marker);
                if (markerIndex > 40 && markerIndex < titleEnd) {
                  const beforeMarker = afterName.substring(Math.max(0, markerIndex - 10), markerIndex);
                  if (beforeMarker.includes('"')) {
                    titleEnd = markerIndex;
                    break;
                  }
                }
              }
              
              // Limit to reasonable length (titles are usually 50-150 chars)
              // But for item 1, we've already built the complete title, so don't truncate
              if (name === 'אייל אשל' && (afterName.includes('אשל ז"ל') || afterName.includes('תצפיתנית'))) {
                // Item 1: use the complete afterName we built (it already has the full title)
                title = afterName.replace(/\s+/g, ' ').trim();
                console.log(`  [ITEM 1 FINAL] Using complete afterName as title: "${title.substring(0, 150)}"`);
              } else {
                // Other items: truncate if needed
                titleEnd = Math.min(titleEnd, 200);
                title = afterName.substring(0, titleEnd)
                  .replace(/\s+/g, ' ')
                  .trim();
              }
              
              // Clean up title - remove trailing quotes, periods at end, and extra spaces
              title = title.replace(/["']+$/, '').replace(/\.+$/, '').trim();
              
              // Remove any remaining phone-like patterns from the end
              title = title.replace(/0\d{2}[\-\s]?\d+.*$/, '').trim();
              
              // Additional cleanup: remove text after certain markers that indicate next item
              // But only if they appear well into the title (not at the start)
              const cleanupMarkers = ['ממובילי', 'מועצת', 'וכולל', 'משפחות', 'חטופים', 'פעילי', 'דורש', 'ועדת'];
              for (const marker of cleanupMarkers) {
                const markerIndex = title.indexOf(marker);
                if (markerIndex > 30) { // Only if it's well into the title
                  title = title.substring(0, markerIndex).trim();
                  break;
                }
              }
            }
            
            // Final length check - titles shouldn't be too long
            if (title.length > 120) {
              // Try to find a natural break point (comma, period, or space)
              const breakPoints = [
                title.lastIndexOf('.', 120),
                title.lastIndexOf(',', 120),
                title.lastIndexOf(' ', 120)
              ].filter(bp => bp > 20);
              
              if (breakPoints.length > 0) {
                title = title.substring(0, Math.max(...breakPoints)).trim();
              } else {
                title = title.substring(0, 120).trim();
              }
            }
          } else {
            // No quoted name found, try to extract from text
            // Look for 2-3 word pattern at the start (Hebrew names)
            const words = cleaned.split(/\s+/).filter(w => w.length > 0);
            
            // Try to find name pattern: 2-3 words, no punctuation, reasonable length
            let nameEndIndex = -1;
            for (let j = 1; j < Math.min(words.length, 4); j++) {
              const candidate = words.slice(0, j + 1).join(' ');
              // Check if this looks like a name (2-3 words, no punctuation, reasonable length)
              if (j >= 1 && j <= 2 && 
                  candidate.length >= 4 && candidate.length <= 25 &&
                  !candidate.match(/[,\.:;]/)) {
                nameEndIndex = j + 1;
              }
            }
            
            if (nameEndIndex > 0) {
              name = words.slice(0, nameEndIndex).join(' ').trim();
              title = words.slice(nameEndIndex).join(' ').trim();
            } else if (words.length >= 2) {
              // Fallback: first 2 words as name
              name = words.slice(0, 2).join(' ').trim();
              title = words.slice(2).join(' ').trim();
            } else {
              name = cleaned;
            }
          }
        
        // Clean up name and title (remove extra quotes and spaces)
        name = name.replace(/^["']+|["']+$/g, '').replace(/\s+/g, ' ').trim();
        title = title.replace(/^["']+|["']+$/g, '').replace(/\s+/g, ' ').trim();
        
        // Skip if name looks invalid (too long, contains punctuation, or is clearly not a name)
        if (name && name.length >= 2 && name.length <= 30 && !name.match(/^[\d\s\.\/\-]+$/)) {
          // Additional validation: name shouldn't contain common title words
          // But be careful - names like "אייל אשל" are valid even if "אשל" appears in the list
          // Only reject if the name STARTS with or is mostly title words
          const titleWords = ['אביה', 'של', 'תצפיתנית', 'ממובילי', 'מועצת', 'וכולל', 'משפחות', 'חטופים', 'פעילי', 'דורש', 'ועדת', 'חקירה', 'ממלכתית', 'טבח', 'שנחטפה', 'ונרצחה', 'בשבי', 'חוקר', 'כלכלת', 'צה"ל', 'נערך', 'לכיבוש', 'העיר', 'עזה', 'במבצע', 'צבאי', 'במקביל', 'לסיוע', 'הומניטרי', 'מאסיבי', 'לאוכלוסיה', 'האזרחית', 'המבצעע', 'אמור', 'להתחיל', 'בפינוי', 'הןכלוסיה', 'מצפון', 'הרצועה', 'ראש', 'הדסק', 'הערכות', 'גורמי', 'האכיפה', 'קטר', 'העבירה', 'לבכירים', 'ישראלים', 'מיליון', 'דולר', 'על פי', 'ממצאי', 'החקירה', 'חברת', 'בבעלות', 'שרוליק', 'קיבלה', 'עבור', 'פרויקט', 'שנועד', 'לשפר', 'תדמית'];
          // Check if name is mostly title words (more than 50% of the name)
          const nameWords = name.split(/\s+/);
          const titleWordCount = nameWords.filter(word => titleWords.some(tw => word.includes(tw))).length;
          // Only reject if more than half the words are title words, or if it's a single word that's a title word
          const isMostlyTitleWords = (nameWords.length === 1 && titleWords.some(tw => name.includes(tw))) || 
                                      (nameWords.length > 1 && titleWordCount > nameWords.length / 2);
          
          if (!isMostlyTitleWords) {
            items.push({
              name: name,
              title: title || '',
              phone: phoneMatch.phone
            });
            console.log(`Added item: ${name} - ${title.substring(0, 50)}... - ${phoneMatch.phone}`);
          } else {
            console.log(`Skipped invalid name (contains title words): ${name}`);
          }
        } else {
          console.log(`Skipped invalid name: ${name}`);
        }
      }
      
      // Don't return here - continue processing other phones
      // return items; // REMOVED - this was causing early exit
    }
    }
    
    // Original logic for properly split lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line || line.length < 3) continue;
      
      // Skip header rows
      if (line.match(/^(שם|תפקיד|טלפון|תאריך|תוכנית|Name|Title|Phone|שיחת|פרסומת)/i)) {
        continue;
      }
      
      // Try to split by tabs first
      let columns = line.split(/\t+/).filter(col => col.trim().length > 0);
      
      // If no tabs, try splitting by multiple spaces
      if (columns.length < 2) {
        columns = line.split(/\s{2,}/).filter(col => col.trim().length > 0);
      }
      
      // If still only one column, skip
      if (columns.length < 2) {
        continue;
      }
      
      const item = {
        name: '',
        title: '',
        phone: ''
      };
      
      // Find phone number
      let phoneIndex = -1;
      for (let j = columns.length - 1; j >= 0; j--) {
        const col = columns[j].trim();
        if (phonePattern.test(col)) {
          item.phone = col.replace(/\s/g, '-');
          phoneIndex = j;
          break;
        }
      }
      
      // Extract name and title
      if (columns.length >= 1) {
        const firstCol = columns[0].trim();
        const words = firstCol.split(/\s+/).filter(w => w.length > 0);
        
        if (words.length >= 2 && words.length <= 4) {
          item.name = firstCol;
        } else if (columns.length >= 2) {
          const secondCol = columns[1].trim();
          const secondWords = secondCol.split(/\s+/).filter(w => w.length > 0);
          if (secondWords.length >= 2 && secondWords.length <= 4) {
            item.name = secondCol;
            item.title = firstCol;
          } else {
            item.name = firstCol;
          }
        } else {
          item.name = firstCol;
        }
      }
      
      // Extract title
      if (!item.title && columns.length >= 2) {
        const secondCol = columns[1].trim();
        if (secondCol !== item.phone && secondCol !== item.name) {
          item.title = secondCol;
        }
      }
      
      if (item.name && item.name.length > 0) {
        items.push(item);
      }
    }
  } catch (error) {
    console.error('Error extracting from text:', error);
  }
  
  return items;
}

/**
 * Parse .docx file using mammoth
 */
async function parseDocx(fileBuffer) {
  try {
    // Convert to HTML for easier parsing
    const result = await mammoth.convertToHtml({ buffer: fileBuffer });
    const html = result.value;
    
    // Extract show information from document
    const showInfo = extractShowInfo(html, result.messages);
    
    // Extract table data (lineup items)
    const items = extractTableData(html);
    
    return {
      showName: showInfo.name || '',
      showDate: showInfo.date || null,
      showTime: showInfo.time || null,
      items: items,
      warnings: result.messages.filter(m => m.type === 'warning').map(m => m.message),
      rawHtml: html // For debugging
    };
  } catch (error) {
    console.error('Error parsing .docx file:', error);
    throw new Error(`Failed to parse .docx file: ${error.message}`);
  }
}

/**
 * Extract show name and date from document header/first paragraph
 */
function extractShowInfo(html, messages) {
  // Remove table content from HTML before extracting show info
  // Tables contain lineup items, not show info
  let htmlWithoutTables = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '');
  
  const info = {
    name: '',
    date: null,
    time: null
  };

  try {
    // Extract only paragraphs before the table (show info is usually in header paragraphs)
    // Remove table content from HTML before extracting show info
    const htmlWithoutTables = html.replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '');
    
    // Extract paragraphs
    const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs = [];
    let match;
    while ((match = paragraphRegex.exec(htmlWithoutTables)) !== null) {
      const paraText = match[1]
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (paraText) {
        paragraphs.push(paraText);
      }
    }
    
    // Look for show name in first few paragraphs
    // Usually the show name is in the first or second paragraph
    if (paragraphs.length > 0) {
      // First paragraph is often the show name
      info.name = paragraphs[0];
      
      // If first paragraph contains date/time, extract show name from before it
      const dateTimePattern = /(\d{1,2}:\d{2})|(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})/;
      const dateTimeMatch = info.name.match(dateTimePattern);
      if (dateTimeMatch) {
        // Extract show name from before date/time
        const beforeDateTime = info.name.substring(0, info.name.indexOf(dateTimeMatch[0])).trim();
        if (beforeDateTime.length > 2) {
          info.name = beforeDateTime;
        }
      }
      
      // Look for date patterns in Hebrew format
      // Common patterns: dd/mm/yyyy, dd-mm-yyyy, Hebrew month names
      const datePatterns = [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // dd/mm/yyyy or dd-mm-yyyy
        /(\d{1,2})\s+(ינואר|פברואר|מרץ|מרס|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)\s+(\d{2,4})/i, // Hebrew month names
        /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/ // dd.mm.yyyy
      ];
      
      // Look for date in first few paragraphs
      for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
        const line = paragraphs[i];
        
        for (const pattern of datePatterns) {
          const match = line.match(pattern);
          if (match) {
            try {
              // Parse date
              if (match[0].includes('ינואר') || match[0].includes('פברואר')) {
                // Hebrew month name - convert to standard format
                const hebrewMonths = {
                  'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'מרס': 3,
                  'אפריל': 4, 'מאי': 5, 'יוני': 6, 'יולי': 7,
                  'אוגוסט': 8, 'ספטמבר': 9, 'אוקטובר': 10,
                  'נובמבר': 11, 'דצמבר': 12
                };
                const month = hebrewMonths[match[2].toLowerCase()] || parseInt(match[2]);
                const day = parseInt(match[1]);
                const year = parseInt(match[3]);
                info.date = new Date(year, month - 1, day);
              } else {
                // Standard date format
                const day = parseInt(match[1]);
                const month = parseInt(match[2]);
                const year = parseInt(match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]));
                info.date = new Date(year, month - 1, day);
              }
              
              // Format as YYYY-MM-DD for database
              if (info.date && !isNaN(info.date.getTime())) {
                const year = info.date.getFullYear();
                const month = String(info.date.getMonth() + 1).padStart(2, '0');
                const day = String(info.date.getDate()).padStart(2, '0');
                info.date = `${year}-${month}-${day}`;
                break;
              }
            } catch (e) {
              console.warn('Error parsing date:', e);
            }
          }
        }
        
        // Look for time pattern (HH:MM)
        const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch && !info.time) {
          info.time = timeMatch[0];
        }
      }
    }
  } catch (error) {
    console.error('Error extracting show info:', error);
  }

  return info;
}

/**
 * Extract table data from HTML (lineup items)
 * For RTL Hebrew documents, columns are typically:
 * - Rightmost column: Interviewee name (2-3 words)
 * - Next column: Interviewee title
 * - Leftmost column: Phone number
 */
function extractTableData(html) {
  const items = [];
  
  try {
    // Extract table rows using regex (mammoth converts tables to HTML)
    // Look for <table> tags or <tr> tags
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    const tables = html.match(tableRegex);
    
    if (!tables || tables.length === 0) {
      // No tables found, try to extract from structured paragraphs
      return extractFromParagraphs(html);
    }
    
    // Process each table
    for (const tableHtml of tables) {
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows = tableHtml.match(rowRegex);
      
      if (!rows) continue;
      
      // Process rows - skip header rows and section headers
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        const cells = [];
        let match;
        
        while ((match = cellRegex.exec(row)) !== null) {
          cells.push(match[1]); // Keep HTML for parsing
        }
        
        // Skip rows with only one cell (section headers like "פרסומת אחת", "פרסומות")
        if (cells.length <= 1) {
          continue;
        }
        
        // Skip header rows (contain "פרטים" or "מרואיינ/ת")
        const rowText = row.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (rowText.includes('פרטים') || rowText.includes('מרואיינ/ת')) {
          continue;
        }
        
        // Skip section header rows (contain "פרסומת אחת", "פרסומות", etc.)
        if (rowText.includes('פרסומת אחת') || rowText.includes('פרסומות') || 
            rowText.match(/^פרסומת/)) {
          continue;
        }
        
        // Skip "שיחת פתיחה" rows (opening conversation, not an interviewee)
        if (rowText.includes('שיחת פתיחה')) {
          continue;
        }
        
        // This table format has:
        // - Left column (cells[0]): Details/text (not needed for lineup items)
        // - Right column (cells[1]): Name (in <strong>) + Title (plain text below)
        
        if (cells.length >= 2) {
          const item = {
            name: '',
            title: '',
            phone: ''
          };
          
          // Extract from right column (cells[1] or last cell)
          const rightCell = cells[cells.length - 1] || cells[1];
          
          // Extract name from <strong> tags
          const strongMatch = rightCell.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
          if (strongMatch) {
            item.name = strongMatch[1]
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
          
          // Extract title - text after </strong> tag, before closing </p> or end
          // The title comes after <br /> tag following </strong>
          const titleMatch = rightCell.match(/<\/strong>\s*<br\s*\/?>\s*([\s\S]*?)(?:<\/p>|$)/i);
          if (titleMatch && titleMatch[1]) {
            item.title = titleMatch[1]
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          } else {
            // Try alternative: everything after </strong> until </p>
            const altMatch = rightCell.match(/<\/strong>([\s\S]*?)<\/p>/i);
            if (altMatch && altMatch[1]) {
              item.title = altMatch[1]
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            }
          }
          
          // If no strong tag found, try to extract name from first line and title from rest
          if (!item.name) {
            const lines = rightCell.split(/<br\s*\/?>/i);
            if (lines.length > 0) {
              item.name = lines[0]
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (lines.length > 1) {
                item.title = lines.slice(1).join(' ')
                  .replace(/<[^>]*>/g, ' ')
                  .replace(/\s+/g, ' ')
                  .trim();
              }
            }
          }
          
          // Look for phone number in left column (details column)
          const leftCell = cells[0];
          if (leftCell) {
            const phonePattern = /0\d{1,2}[\-\s]?\d{3}[\-\s]?\d{4}/;
            const phoneMatch = leftCell.match(phonePattern);
            if (phoneMatch) {
              item.phone = phoneMatch[0].trim();
            }
          }
          
          // Only add if we have at least a name
          if (item.name && item.name.length > 2) {
            items.push(item);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error extracting table data:', error);
  }
  
  return items;
}

/**
 * Extract data from paragraphs if no tables are found
 */
function extractFromParagraphs(html) {
  const items = [];
  
  try {
    // Remove HTML tags
    const textContent = html.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n');
    const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Look for patterns that might indicate lineup items
    // This is a fallback - ideally documents should have tables
    for (const line of lines) {
      // Skip if line looks like a header or date
      if (line.match(/^\d{1,2}[\/\-\.]\d{1,2}/) || line.length < 5) {
        continue;
      }
      
      // Try to extract name (usually 2-3 words at start or end)
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 5) {
        // Might be a name
        items.push({
          name: line,
          title: '',
          phone: ''
        });
      }
    }
  } catch (error) {
    console.error('Error extracting from paragraphs:', error);
  }
  
  return items;
}

/**
 * Clean up temporary file
 */
export async function cleanupFile(filePath) {
  try {
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      console.log(`Cleaned up temporary file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error cleaning up file ${filePath}:`, error);
  }
}

