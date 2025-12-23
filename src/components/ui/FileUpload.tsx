import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { storageService, UploadResponse } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onUploadComplete: (result: UploadResponse) => void;
  onUploadError?: (error: string) => void;
  category?: 'avatars' | 'work-arrangements' | 'profile-pictures' | 'documents' | 'general';
  accept?: string;
  maxSize?: number; // in bytes
  className?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  category = 'general',
  accept = '*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  className = '',
  label = 'Upload File',
  placeholder = 'Choose a file...',
  disabled = false
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    if (file.size > maxSize) {
      const errorMsg = `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`;
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
      onUploadError?.(errorMsg);
      return;
    }

    setIsUploading(true);
    try {
      const result = await storageService.uploadFile(file, category);
      onUploadComplete(result);
      toast({
        title: "Success",
        description: "File uploaded successfully"
      });
    } catch (error: any) {
      const errorMsg = error.message || 'Upload failed';
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
      onUploadError?.(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="h-4 w-4" />;
    } else if (['pdf'].includes(extension || '')) {
      return <FileText className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        <div className="space-y-2">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">
              {isUploading ? 'Uploading...' : placeholder}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Drag and drop or click to select
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FilePreviewProps {
  file: UploadResponse | null;
  onRemove?: () => void;
  className?: string;
}

export function FilePreview({ file, onRemove, className = '' }: FilePreviewProps) {
  if (!file) return null;

  const isImage = file.mimetype.startsWith('image/');
  const fileUrl = storageService.getFileUrl(file.path);

  return (
    <div className={`flex items-center space-x-3 p-3 border rounded-lg ${className}`}>
      {isImage ? (
        <img 
          src={fileUrl} 
          alt={file.originalName}
          className="h-12 w-12 object-cover rounded"
        />
      ) : (
        <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center">
          {getFileIcon(file.originalName)}
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.originalName}</p>
        <p className="text-xs text-gray-500">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
      
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
