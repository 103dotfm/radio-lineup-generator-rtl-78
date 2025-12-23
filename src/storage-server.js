import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a storage handler
const createStorageHandler = () => {
  const app = express();

  // Configure storage
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const bucket = req.params.bucket || 'default';
      const dir = path.join(process.env.STORAGE_PATH || 'storage', bucket);
      fs.ensureDirSync(dir);
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = uuidv4();
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });

  const upload = multer({ storage: storage });

  // Error handling middleware
  const asyncHandler = fn => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };

  // Upload file endpoint - default bucket
  app.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const bucket = 'default';
    const filePath = `/storage/${bucket}/${req.file.filename}`;
    
    res.json({
      data: {
        path: filePath,
        fullPath: `${req.protocol}://${req.get('host')}${filePath}`,
      }
    });
  }));

  // Upload file endpoint - specific bucket
  app.post('/upload/:bucket', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const bucket = req.params.bucket;
    const filePath = `/storage/${bucket}/${req.file.filename}`;
    
    res.json({
      data: {
        path: filePath,
        fullPath: `${req.protocol}://${req.get('host')}${filePath}`,
      }
    });
  }));

  // Get file endpoint
  app.get('/files/:bucket/:filename', asyncHandler(async (req, res) => {
    const { bucket, filename } = req.params;
    
    if (!bucket || !filename) {
      return res.status(400).json({ error: 'Missing bucket or filename' });
    }
    
    const filePath = path.join(process.env.STORAGE_PATH || 'storage', bucket, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.sendFile(filePath);
  }));

  // Delete file endpoint
  app.delete('/files/:bucket/:filename', asyncHandler(async (req, res) => {
    const { bucket, filename } = req.params;
    
    if (!bucket || !filename) {
      return res.status(400).json({ error: 'Missing bucket or filename' });
    }
    
    const filePath = path.join(process.env.STORAGE_PATH || 'storage', bucket, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    await fs.unlink(filePath);
    res.json({ success: true });
  }));

  // List files in a bucket
  app.get('/buckets/:bucket', asyncHandler(async (req, res) => {
    const { bucket } = req.params;
    
    if (!bucket) {
      return res.status(400).json({ error: 'Missing bucket' });
    }
    
    const bucketPath = path.join(process.env.STORAGE_PATH || 'storage', bucket);
    
    if (!fs.existsSync(bucketPath)) {
      return res.json({ data: [] });
    }
    
    const files = await fs.readdir(bucketPath);
    const fileDetails = await Promise.all(
      files
        .filter(async file => (await fs.stat(path.join(bucketPath, file))).isFile())
        .map(async file => {
          const stats = await fs.stat(path.join(bucketPath, file));
          return {
            name: file,
            path: `/storage/${bucket}/${file}`,
            fullPath: `${req.protocol}://${req.get('host')}/storage/${bucket}/${file}`,
            size: stats.size,
            created: stats.birthtime
          };
        })
    );
    
    res.json({ data: fileDetails });
  }));

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Storage server error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message
    });
  });

  return app;
};

export default createStorageHandler; 