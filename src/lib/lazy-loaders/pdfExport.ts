import { lazy } from 'react';

// Lazy load PDF export libraries
export const lazyPDFExport = {
  jsPDF: () => import('jspdf'),
  html2canvas: () => import('html2canvas'),
  html2pdf: () => import('html2pdf.js')
};

// Helper function to load PDF export functionality
export const loadPDFExport = async () => {
  const [jsPDF, html2canvas, html2pdf] = await Promise.all([
    lazyPDFExport.jsPDF(),
    lazyPDFExport.html2canvas(),
    lazyPDFExport.html2pdf()
  ]);
  
  return {
    jsPDF: jsPDF.default,
    html2canvas: html2canvas.default,
    html2pdf: html2pdf.default
  };
};

