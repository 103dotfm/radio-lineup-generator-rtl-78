import { lazy } from 'react';

// Lazy load Word export libraries
export const lazyWordExport = {
  docx: () => import('docx'),
  fileSaver: () => import('file-saver')
};

// Helper function to load Word export functionality
export const loadWordExport = async () => {
  const [docx, fileSaver] = await Promise.all([
    lazyWordExport.docx(),
    lazyWordExport.fileSaver()
  ]);
  
  return {
    Document: docx.Document,
    Packer: docx.Packer,
    Paragraph: docx.Paragraph,
    Table: docx.Table,
    TableRow: docx.TableRow,
    TableCell: docx.TableCell,
    TextRun: docx.TextRun,
    AlignmentType: docx.AlignmentType,
    WidthType: docx.WidthType,
    saveAs: fileSaver.saveAs
  };
};

