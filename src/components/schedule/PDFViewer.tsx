
import React from 'react';
import { storageService } from "@/lib/storage";

interface PdfViewerProps {
  url: string | null;
  filename?: string; // Added filename as an optional prop to match how it's being used
}

export default function PdfViewer({ url }: PdfViewerProps) {
  if (!url) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <p className="text-gray-500">אין קובץ זמין לשבוע זה</p>
      </div>
    );
  }
  
  // Make sure we have a proper URL to the file
  const validatedUrl = url.startsWith('http') 
    ? url 
    : storageService.getFileUrl(url);
  
  
  
  return (
    <div className="w-full h-screen md:h-[800px]">
      <object data={validatedUrl} type="application/pdf" className="w-full h-full">
        <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg">
          <p className="text-gray-500 mb-4">לא ניתן להציג את הקובץ במכשירך</p>
          <a 
            href={validatedUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
          >
            הורד את הקובץ
          </a>
        </div>
      </object>
    </div>
  );
}
