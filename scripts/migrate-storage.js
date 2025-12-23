#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_ROOT = path.join(__dirname, '../storage');

// Define the new storage structure
const NEW_STORAGE_STRUCTURE = {
  'uploads/avatars': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  'uploads/work-arrangements': ['pdf'],
  'uploads/profile-pictures': ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  'uploads/documents': ['pdf', 'doc', 'docx', 'txt', 'csv'],
  'uploads/general': ['*'] // catch-all for other files
};

async function migrateStorage() {
  console.log('Starting storage migration...');
  
  try {
    // Create new storage directories
    for (const dir of Object.keys(NEW_STORAGE_STRUCTURE)) {
      const fullPath = path.join(STORAGE_ROOT, dir);
      await fs.ensureDir(fullPath);
      console.log(`Created directory: ${dir}`);
    }
    
    // Migrate files from old lovable directory
    const lovableDir = path.join(STORAGE_ROOT, 'lovable');
    if (await fs.pathExists(lovableDir)) {
      console.log('Migrating files from lovable directory...');
      
      const files = await fs.readdir(lovableDir);
      
      for (const file of files) {
        const oldPath = path.join(lovableDir, file);
        const stats = await fs.stat(oldPath);
        
        if (stats.isFile()) {
          const extension = path.extname(file).toLowerCase().slice(1);
          let targetDir = 'uploads/general'; // default
          
          // Determine target directory based on file extension
          for (const [dir, extensions] of Object.entries(NEW_STORAGE_STRUCTURE)) {
            if (extensions.includes('*') || extensions.includes(extension)) {
              targetDir = dir;
              break;
            }
          }
          
          const newPath = path.join(STORAGE_ROOT, targetDir, file);
          
          // Check if file already exists in target location
          if (await fs.pathExists(newPath)) {
            console.log(`File already exists in ${targetDir}: ${file}`);
            continue;
          }
          
          await fs.move(oldPath, newPath);
          console.log(`Moved ${file} to ${targetDir}`);
        }
      }
      
      // Remove empty lovable directory
      const remainingFiles = await fs.readdir(lovableDir);
      if (remainingFiles.length === 0) {
        await fs.remove(lovableDir);
        console.log('Removed empty lovable directory');
      } else {
        console.log(`Lovable directory still contains ${remainingFiles.length} files`);
      }
    }
    
    // Migrate files from avatars directory
    const avatarsDir = path.join(STORAGE_ROOT, 'avatars');
    if (await fs.pathExists(avatarsDir)) {
      console.log('Migrating files from avatars directory...');
      
      const files = await fs.readdir(avatarsDir);
      
      for (const file of files) {
        const oldPath = path.join(avatarsDir, file);
        const stats = await fs.stat(oldPath);
        
        if (stats.isFile()) {
          const newPath = path.join(STORAGE_ROOT, 'uploads/avatars', file);
          
          if (await fs.pathExists(newPath)) {
            console.log(`File already exists in uploads/avatars: ${file}`);
            continue;
          }
          
          await fs.move(oldPath, newPath);
          console.log(`Moved ${file} to uploads/avatars`);
        }
      }
      
      // Remove empty avatars directory
      const remainingFiles = await fs.readdir(avatarsDir);
      if (remainingFiles.length === 0) {
        await fs.remove(avatarsDir);
        console.log('Removed empty avatars directory');
      }
    }
    
    // Create default files if they don't exist
    const defaultAvatarPath = path.join(STORAGE_ROOT, 'uploads/avatars/default-avatar.png');
    const defaultLogoPath = path.join(STORAGE_ROOT, 'uploads/general/103fm-logo.png');
    
    if (!await fs.pathExists(defaultAvatarPath)) {
      // Create a simple default avatar (you can replace this with an actual image)
      console.log('Creating default avatar...');
      await fs.writeFile(defaultAvatarPath, '');
    }
    
    if (!await fs.pathExists(defaultLogoPath)) {
      // Create a simple default logo (you can replace this with an actual image)
      console.log('Creating default logo...');
      await fs.writeFile(defaultLogoPath, '');
    }
    
    console.log('Storage migration completed successfully!');
    
    // Print summary
    console.log('\nStorage structure summary:');
    for (const [dir, extensions] of Object.entries(NEW_STORAGE_STRUCTURE)) {
      const fullPath = path.join(STORAGE_ROOT, dir);
      if (await fs.pathExists(fullPath)) {
        const files = await fs.readdir(fullPath);
        console.log(`${dir}: ${files.length} files`);
      }
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateStorage();
}

export default migrateStorage;
