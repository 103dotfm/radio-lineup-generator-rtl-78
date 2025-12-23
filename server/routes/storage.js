import express from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs_extra from 'fs-extra';
import path from 'path';

const router = express.Router();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define storage categories
const STORAGE_CATEGORIES = {
  avatars: 'uploads/avatars',
  'work-arrangements': 'uploads/work-arrangements',
  'profile-pictures': 'uploads/profile-pictures',
  documents: 'uploads/documents',
  general: 'uploads/general'
};

// Configure storage for uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const category = req.params.category || 'general';
    const storagePath = STORAGE_CATEGORIES[category] || STORAGE_CATEGORIES.general;
    const dir = join(__dirname, '../../storage-new', storagePath);
    fs_extra.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with timestamp and random suffix
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${randomSuffix}-${sanitizedName}${extension}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Upload endpoint with category support
router.post('/upload/:category?', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const category = req.params.category || 'general';
    const storagePath = STORAGE_CATEGORIES[category] || STORAGE_CATEGORIES.general;
    const filePath = `/storage-new/${storagePath}/${req.file.filename}`;
    
    res.json({
      data: {
        path: filePath,
        fullPath: `${req.protocol}://${req.get('host')}${filePath}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        category: category
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large', details: 'Maximum file size is 10MB' });
    }
    return res.status(400).json({ error: 'Upload error', details: error.message });
  }
  next(error);
});

// List files in a category (must come before /:category/:filename)
router.get('/list/:category?', async (req, res) => {
  try {
    const category = req.params.category || 'general';
    const storagePath = STORAGE_CATEGORIES[category] || STORAGE_CATEGORIES.general;
    const dir = join(__dirname, '../../storage-new', storagePath);
    
    if (!fs_extra.existsSync(dir)) {
      return res.json({ files: [] });
    }
    
    const files = await fs.readdir(dir);
    const fileStats = await Promise.all(
      files.map(async (filename) => {
        const filePath = join(dir, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          path: `/storage-new/${storagePath}/${filename}`
        };
      })
    );
    
    res.json({ files: fileStats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files', details: error.message });
  }
});

// Check file existence endpoint
router.get('/check/:category/:path(*)', async (req, res) => {
  const { category, path: filePath } = req.params;
  const storagePath = STORAGE_CATEGORIES[category] || STORAGE_CATEGORIES.general;
  const fullPath = join(__dirname, '../../storage-new', storagePath, filePath);
  
  if (fs_extra.existsSync(fullPath)) {
    return res.status(200).send({ exists: true });
  } else {
    return res.status(404).send({ exists: false });
  }
});

// Legacy endpoint for backward compatibility
router.get('/lovable/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = join(__dirname, '../../storage/lovable', filename);
  
  if (!fs_extra.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(filePath);
});

// Get file endpoint (must come after more specific routes)
router.get('/:category/:filename', (req, res) => {
  const { category, filename } = req.params;
  const storagePath = STORAGE_CATEGORIES[category] || STORAGE_CATEGORIES.general;
  const filePath = join(__dirname, '../../storage-new', storagePath, filename);
  
  if (!fs_extra.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.sendFile(filePath);
});

// Delete file endpoint
router.delete('/:category/:filename', (req, res) => {
  const { category, filename } = req.params;
  const storagePath = STORAGE_CATEGORIES[category] || STORAGE_CATEGORIES.general;
  const filePath = join(__dirname, '../../storage-new', storagePath, filename);
  
  if (!fs_extra.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  try {
    fs_extra.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

export default router; 