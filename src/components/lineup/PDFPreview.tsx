import React, { forwardRef } from 'react';
import PrintPreview from './PrintPreview';

interface PDFPreviewProps {
  showName: string;
  showTime: string;
  showDate?: Date;
  items: any[];
  editorContent: string;
}

const PDFPreview = forwardRef<HTMLDivElement, PDFPreviewProps>(
  ({ showName, showTime, showDate, items, editorContent }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-white">
        <PrintPreview
          showName={showName}
          showTime={showTime}
          showDate={showDate}
          items={items}
          editorContent={editorContent}
        />
      </div>
    );
  }
);

PDFPreview.displayName = 'PDFPreview';

export default PDFPreview;