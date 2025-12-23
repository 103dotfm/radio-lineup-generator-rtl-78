import { supabase } from './supabase';

export interface UploadResponse {
  path: string;
  fullPath: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  category: string;
}

export interface FileInfo {
  filename: string;
  size: number;
  created: Date;
  modified: Date;
  path: string;
}

export class StorageService {
  private baseUrl: string;

  constructor() {
    // Use the same logic as api-client.ts for consistency
    this.baseUrl = import.meta.env.VITE_API_URL || (() => {
      const currentHost = window.location.hostname;
      const currentPort = window.location.port;
      const protocol = window.location.protocol;
      
      // If we're on a remote URL, use the same protocol, host and port for API
      if (currentHost === '212.179.162.102' || currentHost === 'logger.103.fm' || currentHost === 'l.103.fm') {
        return `${protocol}//${currentHost}:${currentPort || '8080'}`;
      }
      
      // For local development, use the same protocol, host and port for API
      if (currentHost === '192.168.10.121' || currentHost === 'localhost' || currentHost === '127.0.0.1') {
        return `${protocol}//${currentHost}:${currentPort || '8080'}`;
      }
      
      // Fallback to localhost:8080
      return 'http://localhost:8080';
    })();
  }

  /**
   * Upload a file to the storage system
   */
  async uploadFile(
    file: File, 
    category: 'avatars' | 'work-arrangements' | 'profile-pictures' | 'documents' | 'general' = 'general'
  ): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const uploadUrl = `${this.baseUrl}/api/storage/upload/${category}`;
    console.log('Storage upload - URL:', uploadUrl);
    console.log('Storage upload - baseUrl:', this.baseUrl);

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          // Don't set Content-Type for FormData, let browser set it with boundary
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Storage upload error:', error);
      console.error('Storage upload - Full error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to storage service');
      }
      throw error;
    }
  }

  /**
   * Get the full URL for a file
   */
  getFileUrl(path: string): string {
    try {
      // eslint-disable-next-line no-console
      console.debug('[storage.getFileUrl] input path:', path);
    } catch {}
    if (!path) {
      return '';
    }

    // Full URL already
    if (path.startsWith('http://') || path.startsWith('https://')) {
      // Normalize accidental prefixes: '/storage//storage-new/', '/storage/storage-new/', or '//storage-new/' → '/storage-new/'
      const fixed = path
        .replace('/storage//storage-new/', '/storage-new/')
        .replace('/storage/storage-new/', '/storage-new/')
        .replace('//storage-new/', '/storage-new/');
      try { console.debug('[storage.getFileUrl] return full URL:', fixed); } catch {}
      return fixed;
    }

    // If path is absolute (starts with /), prepend baseUrl and normalize duplicate segments
    if (path.startsWith('/')) {
      const normalizedPath = path
        .replace('/storage//storage-new/', '/storage-new/')
        .replace('/storage/storage-new/', '/storage-new/')
        .replace('//storage-new/', '/storage-new/');
      const out = `${this.baseUrl}${normalizedPath}`;
      try { console.debug('[storage.getFileUrl] absolute ->', out); } catch {}
      return out;
    }

    // Normalize common cases where callers pass paths that already include storage directories
    if (path.includes('storage-new/')) {
      const normalized = `/${path.substring(path.indexOf('storage-new/'))}`;
      const out = `${this.baseUrl}${normalized}`;
      try { console.debug('[storage.getFileUrl] normalize storage-new ->', out); } catch {}
      return out;
    }
    if (path.includes('storage/')) {
      // If someone passed a path like 'storage/storage-new/...', collapse to '/storage-new/...'
      const storageNewIndex = path.indexOf('storage-new/');
      const normalized = storageNewIndex >= 0
        ? `/${path.substring(storageNewIndex)}`
        : `/${path.substring(path.indexOf('storage/'))}`;
      const out = `${this.baseUrl}${normalized}`;
      try { console.debug('[storage.getFileUrl] normalize storage ->', out); } catch {}
      return out;
    }

    // Default to old storage bucket prefix for bare relative paths
    const out = `${this.baseUrl}/storage/${path}`
      .replace('/storage//storage-new/', '/storage-new/')
      .replace('/storage/storage-new/', '/storage-new/')
      .replace('//storage-new/', '/storage-new/');
    try { console.debug('[storage.getFileUrl] default ->', out); } catch {}
    return out;
  }

  /**
   * Check if a file exists
   */
  async fileExists(category: string, path: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/check/${category}/${encodeURIComponent(path)}`, {
        credentials: 'include'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(category: string, filename: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/${category}/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List files in a category
   */
  async listFiles(category: string = 'general'): Promise<FileInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/list/${category}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to list files: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.files.map((file: any) => ({
        ...file,
        created: new Date(file.created),
        modified: new Date(file.modified)
      }));
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  /**
   * Get a default avatar URL
   */
  getDefaultAvatarUrl(): string {
    return '/storage/uploads/avatars/default-avatar.png';
  }

  /**
   * Get a default logo URL
   */
  getDefaultLogoUrl(): string {
    return '/storage/uploads/general/103fm-logo.png';
  }

  /**
   * Migrate from old lovable storage format
   */
  migrateFromLovable(oldPath: string): string {
    // If it's already a new format path, return as is
    if (oldPath.startsWith('/storage/uploads/')) {
      return oldPath;
    }

    // Handle old lovable paths
    if (oldPath.includes('lovable-uploads')) {
      // Extract filename from old path
      const filename = oldPath.split('/').pop();
      if (filename) {
        // Determine category based on file extension or path
        if (filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          return `/storage/uploads/profile-pictures/${filename}`;
        } else if (filename.match(/\.(pdf|doc|docx)$/i)) {
          return `/storage/uploads/documents/${filename}`;
        } else {
          return `/storage/uploads/general/${filename}`;
        }
      }
    }

    // If it's a Supabase URL, try to extract the filename
    if (oldPath.includes('supabase.co')) {
      const urlParts = oldPath.split('/');
      const filename = urlParts[urlParts.length - 1];
      if (filename) {
        return `/storage/uploads/general/${filename}`;
      }
    }

    return oldPath;
  }
}

// Create a singleton instance
export const storageService = new StorageService();

// Legacy compatibility functions
export const uploadToStorage = (file: File, category?: string) => 
  storageService.uploadFile(file, category as any);

export const getStorageUrl = (path: string) => 
  storageService.getFileUrl(path);
