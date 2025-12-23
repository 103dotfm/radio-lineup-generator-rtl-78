import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { parseWordDocument, cleanupFile } from '../services/word-parser.js';
import { executeInsert } from '../utils/db.js';
import { query } from '../../src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
// Use storage-new/temp which is writable by the process
const tempDir = path.join(__dirname, '../../storage-new/temp/lineup-import');
fs.ensureDirSync(tempDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 1000 // Max 1000 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || ['.doc', '.docx'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .doc and .docx files are allowed'), false);
    }
  }
});

/**
 * Parse a single Word document
 * POST /api/lineup-import/parse
 */
router.post('/parse', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  console.log('Lineup import parse endpoint hit');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  console.log('Request files:', req.files);
  let filePath = null;
  
  try {
    if (!req.file) {
      console.log('No file in req.file, checking req.body and req.files');
      console.log('req.body keys:', Object.keys(req.body));
      console.log('req.files:', req.files);
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'לא הועלה קובץ'
      });
    }

    filePath = req.file.path;
    
    // Parse the document
    const parsedData = await parseWordDocument(filePath);
    
    // Clean up file immediately after parsing
    await cleanupFile(filePath);
    filePath = null;
    
    res.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error('Error parsing document:', error);
    
    // Clean up file on error
    if (filePath) {
      await cleanupFile(filePath);
    }
    
    // Provide helpful error message for missing dependencies
    let errorMessage = error.message || 'שגיאה בניתוח הקובץ';
    if (error.message && (error.message.includes('antiword') || error.message.includes('Missing system dependency'))) {
      errorMessage = 'Missing system dependency: antiword. Please install it with: sudo apt-get install antiword';
    }
    
    res.status(500).json({
      error: 'Failed to parse document',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Parse multiple Word documents
 * POST /api/lineup-import/parse-multiple
 */
router.post('/parse-multiple', requireAuth, requireAdmin, upload.array('files', 1000), async (req, res) => {
  const files = req.files || [];
  const results = [];
  const filePaths = [];
  
  try {
    if (files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'לא הועלו קבצים'
      });
    }

    if (files.length > 1000) {
      return res.status(400).json({
        error: 'Too many files',
        message: 'מקסימום 1000 קבצים בכל פעם'
      });
    }

    // Process each file
    for (const file of files) {
      const filePath = file.path;
      filePaths.push(filePath);
      
      try {
        const parsedData = await parseWordDocument(filePath);
        
        results.push({
          filename: file.originalname,
          success: true,
          data: parsedData,
          error: null
        });
        
        // Clean up file after successful parse
        await cleanupFile(filePath);
      } catch (error) {
        console.error(`Error parsing ${file.originalname}:`, error);
        
        results.push({
          filename: file.originalname,
          success: false,
          data: null,
          error: error.message || 'שגיאה בניתוח הקובץ'
        });
        
        // Clean up file even on error
        await cleanupFile(filePath);
      }
    }
    
    res.json({
      success: true,
      results: results,
      total: files.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Error processing multiple files:', error);
    
    // Clean up any remaining files
    for (const filePath of filePaths) {
      await cleanupFile(filePath);
    }
    
    res.status(500).json({
      error: 'Failed to process files',
      message: error.message || 'שגיאה בעיבוד הקבצים'
    });
  }
});

/**
 * Save parsed lineup to database
 * POST /api/lineup-import/save
 */
router.post('/save', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { showName, showDate, showTime, items } = req.body;
    
    // Validate required fields
    if (!showName || !showDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'חסרים שדות חובה: שם התוכנית ותאריך'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'No items provided',
        message: 'לא נמצאו פריטים לייבוא'
      });
    }

    // Create show
    const showData = {
      name: showName,
      date: showDate,
      time: showTime || null,
      notes: '',
      created_at: new Date().toISOString()
    };

    const showResult = await executeInsert('shows', showData);
    
    if (showResult.error) {
      console.error('Error creating show:', showResult.error);
      return res.status(500).json({
        error: 'Failed to create show',
        message: 'שגיאה ביצירת התוכנית'
      });
    }

    const showId = showResult.data[0].id;

    // Create show items
    const itemPromises = items.map((item, index) => {
      const itemData = {
        show_id: showId,
        position: index,
        name: item.name || '',
        title: item.title || null,
        phone: item.phone || null,
        details: null,
        duration: null,
        is_break: false,
        is_note: false,
        is_divider: false,
        created_at: new Date().toISOString()
      };
      
      return executeInsert('show_items', itemData);
    });

    const itemResults = await Promise.all(itemPromises);
    
    // Check for errors in item creation
    const errors = itemResults.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Errors creating show items:', errors);
      // Note: We don't fail the entire request if some items fail
      // The show is already created
    }

    res.json({
      success: true,
      showId: showId,
      itemsCreated: itemResults.filter(r => !r.error).length,
      itemsFailed: errors.length,
      message: 'הליינאפ נשמר בהצלחה'
    });
  } catch (error) {
    console.error('Error saving lineup:', error);
    res.status(500).json({
      error: 'Failed to save lineup',
      message: error.message || 'שגיאה בשמירת הליינאפ'
    });
  }
});

/**
 * Save multiple lineups to database (bulk import)
 * POST /api/lineup-import/save-multiple
 */
router.post('/save-multiple', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { lineups } = req.body;
    
    if (!lineups || !Array.isArray(lineups) || lineups.length === 0) {
      return res.status(400).json({
        error: 'No lineups provided',
        message: 'לא נמצאו ליינאפים לשמירה'
      });
    }

    const results = [];
    
    for (const lineup of lineups) {
      const { showName, showDate, showTime, items, filename } = lineup;
      
      try {
        // Validate required fields
        if (!showName || !showDate) {
          results.push({
            filename: filename || 'unknown',
            success: false,
            error: 'Missing required fields: show name and date'
          });
          continue;
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
          results.push({
            filename: filename || 'unknown',
            success: false,
            error: 'No items in lineup'
          });
          continue;
        }

        // Create show
        const showData = {
          name: showName,
          date: showDate,
          time: showTime || null,
          notes: '',
          created_at: new Date().toISOString()
        };

        const showResult = await executeInsert('shows', showData);
        
        if (showResult.error) {
          results.push({
            filename: filename || 'unknown',
            success: false,
            error: 'Failed to create show: ' + showResult.error.message
          });
          continue;
        }

        const showId = showResult.data[0].id;

        // Create show items
        const itemPromises = items.map((item, index) => {
          const itemData = {
            show_id: showId,
            position: index,
            name: item.name || '',
            title: item.title || null,
            phone: item.phone || null,
            details: null,
            duration: null,
            is_break: false,
            is_note: false,
            is_divider: false,
            created_at: new Date().toISOString()
          };
          
          return executeInsert('show_items', itemData);
        });

        const itemResults = await Promise.all(itemPromises);
        const errors = itemResults.filter(r => r.error);
        
        results.push({
          filename: filename || 'unknown',
          success: true,
          showId: showId,
          itemsCreated: itemResults.filter(r => !r.error).length,
          itemsFailed: errors.length,
          error: errors.length > 0 ? `${errors.length} items failed to create` : null
        });
      } catch (error) {
        console.error(`Error saving lineup for ${filename}:`, error);
        results.push({
          filename: filename || 'unknown',
          success: false,
          error: error.message || 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      results: results,
      total: lineups.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Error saving multiple lineups:', error);
    res.status(500).json({
      error: 'Failed to save lineups',
      message: error.message || 'שגיאה בשמירת הליינאפים'
    });
  }
});

export default router;

