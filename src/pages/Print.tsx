
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getShowWithItems } from '@/lib/supabase/shows';
import PrintPreview from '@/components/lineup/PrintPreview';
import html2pdf from 'html2pdf.js';
import { format } from 'date-fns';

const Print = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [show, setShow] = useState<any>(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showMinutes = searchParams.get('minutes') === 'true';
  const exportPdf = searchParams.get('export') === 'pdf';
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadShow = async () => {
      if (id) {
        try {
          setLoading(true);
          const { show: loadedShow, items: showItems } = await getShowWithItems(id);
          if (loadedShow) {
            setShow(loadedShow);
          } else {
            setError('לא נמצאה תוכנית');
          }
          if (showItems) {
            // Ensure items are correctly ordered
            setItems(showItems);
          }
        } catch (error) {
          console.error('Error loading show:', error);
          setError('שגיאה בטעינת התוכנית');
        } finally {
          setLoading(false);
        }
      }
    };

    loadShow();
  }, [id]);

  // Export PDF automatically if ?export=pdf param is present
  useEffect(() => {
    if (exportPdf && !loading && show && pdfRef.current) {
      const exportToPdf = () => {
        // Add CSS for PDF export
        const style = document.createElement('style');
        style.innerHTML = `
          .lineup-pdf-export {
            direction: rtl;
            font-family: 'Heebo', sans-serif;
            padding: 15mm;
          }
          
          @page {
            size: A4 portrait;
            margin: 15mm 10mm 20mm 10mm !important;
          }
          
          .lineup-pdf-export .print-avoid-break {
            page-break-inside: avoid !important;
          }
          
          .lineup-pdf-export .divider-row {
            page-break-before: auto !important;
            page-break-after: avoid !important;
            margin-top: 10mm !important;
          }
          
          .lineup-pdf-export .credits {
            page-break-before: avoid !important;
            margin-top: 30mm !important;
          }
          
          .lineup-pdf-export table {
            width: 100% !important;
            border-collapse: collapse !important;
            margin-bottom: 5mm !important;
          }
          
          .lineup-pdf-export td, .lineup-pdf-export th {
            padding: 3mm !important;
            font-size: 11pt !important;
            border: 1px solid #e2e8f0 !important;
          }
          
          .lineup-pdf-export .col-print-name { 
            width: 15% !important; 
          }
          
          .lineup-pdf-export .col-print-details { 
            width: 65% !important; 
          }
          
          .lineup-pdf-export .col-print-phone { 
            width: 15% !important; 
          }
          
          .lineup-pdf-export .col-print-minutes { 
            width: 5% !important; 
          }
          
          .lineup-pdf-export .divider-heading {
            padding: 2mm !important;
            margin: 5mm 0 !important;
            background-color: #f3f4f6 !important;
            font-size: 14pt !important;
            font-weight: bold !important;
          }
        `;
        document.head.appendChild(style);
        
        const element = pdfRef.current;
        const opt = {
          margin: [15, 10, 20, 10], // [top, right, bottom, left] in mm
          filename: `${show.name || 'lineup'}-${format(show.date ? new Date(show.date) : new Date(), 'dd-MM-yyyy')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true,
            precision: 2,
          }
        };
        
        html2pdf().set(opt).from(element).save().then(() => {
          // Clean up
          document.head.removeChild(style);
          window.close(); // Close the window after download
        });
      };
      
      // Small delay to ensure the DOM is fully rendered
      setTimeout(exportToPdf, 1000);
    }
  }, [exportPdf, loading, show, items]);

  // Add print styles for lineup
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: portrait;
          margin: 10mm 10mm 15mm 10mm !important;
        }
        
        /* Prevent content from being split across pages */
        tr, td, th {
          page-break-inside: avoid !important;
        }
        
        /* Ensure dividers don't break awkwardly */
        .divider-row {
          page-break-after: avoid !important;
          page-break-before: auto !important;
          margin-top: 20px !important;
        }
        
        /* Add more spacing between sections to encourage better page breaks */
        table {
          margin-bottom: 8mm !important;
        }
        
        /* Ensure table rows have more breathing room */
        tr td {
          padding-top: 2mm !important;
          padding-bottom: 2mm !important;
        }
        
        /* Column widths with !important to override any other styles */
        .col-print-name, th.col-print-name, td.col-print-name { 
          width: 16% !important; 
          min-width: 16% !important; 
          max-width: 16% !important; 
        }
        .col-print-title, th.col-print-title, td.col-print-title { 
          width: 16% !important; 
          min-width: 16% !important; 
          max-width: 16% !important; 
        }
        .col-print-details, th.col-print-details, td.col-print-details { 
          width: 56% !important; 
          min-width: 56% !important; 
          max-width: 56% !important; 
        }
        .col-print-phone, th.col-print-phone, td.col-print-phone { 
          width: 12% !important; 
          min-width: 12% !important; 
          max-width: 12% !important; 
        }
        .col-print-minutes, th.col-print-minutes, td.col-print-minutes { 
          width: 48px !important; 
          min-width: 48px !important; 
          max-width: 48px !important; 
        }
        .details-column { 
          font-size: 0.95rem !important; 
          line-height: 1.3 !important; 
        }
        .print-divider-cell {
          border-left: 0 !important;
          border-right: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (loading) return <div className="container mx-auto py-8 px-2 text-center">טוען...</div>;
  if (error) return <div className="container mx-auto py-8 px-2 text-center">{error}</div>;
  if (!show) return <div className="container mx-auto py-8 px-2 text-center">לא נמצאה תוכנית</div>;

  return (
    <>
      <div className="container mx-auto py-8 px-2 print-container lineup-print">
        <PrintPreview
          showName={show.name}
          showTime={show.time}
          showDate={show.date ? new Date(show.date) : undefined}
          items={items}
          editorContent={show.notes || ''}
          showMinutes={showMinutes}
        />
      </div>
      
      {/* Hidden element for PDF export */}
      <div ref={pdfRef} className="hidden">
        <PrintPreview
          showName={show.name}
          showTime={show.time}
          showDate={show.date ? new Date(show.date) : undefined}
          items={items}
          editorContent={show.notes || ''}
          showMinutes={showMinutes}
          isPdfExport={true}
        />
      </div>
    </>
  );
};

export default Print;
