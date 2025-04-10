
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory path based on the provided path
    const uploadPath = path.join(process.cwd(), 'public', 'uploads', req.body.path || '');
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Use the original filename
    cb(null, path.basename(file.originalname));
  }
});

const upload = multer({ storage });

// Extend the Request type to include the file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export default function handler(req: MulterRequest, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  // Use multer's single file upload
  upload.single('file')(req, res, function (err) {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ message: 'Error uploading file', error: err.message });
    }
    
    // Return the file info
    return res.status(200).json({
      message: 'File uploaded successfully',
      filename: req.file?.filename,
      path: req.file?.path
    });
  });
}
