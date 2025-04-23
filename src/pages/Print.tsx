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

  useEffect(() => {
    if (exportPdf && !loading && show && pdfRef.current) {
      setTimeout(() => {
        const exportToPdf = () => {
          const style = document.createElement('style');
          style.innerHTML = `
            @page {
              size: A4 portrait;
              margin: 5mm 5mm 15mm 5mm !important; /* Minimal left/right margins, increased bottom margin */
            }
            
            .lineup-pdf-export {
              direction: rtl;
              font-family: 'Heebo', sans-serif;
              padding: 5mm; /* Reduced padding */
              font-size: 11pt;
            }
          `;
          document.head.appendChild(style);
          
          const element = pdfRef.current;
          
          if (!element) {
            console.error('PDF reference element not found');
            return;
          }
          
          const opt = {
            margin: [10, 5, 20, 5], // [top, right, bottom, left] in mm - minimal margins
            filename: `${show.name || 'lineup'}-${format(show.date ? new Date(show.date) : new Date(), 'dd-MM-yyyy')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
              scale: 2,
              useCORS: true,
              logging: true,
              letterRendering: true,
              allowTaint: true,
              windowWidth: 1000
            },
            jsPDF: { 
              unit: 'mm', 
              format: 'a4', 
              orientation: 'portrait',
              compress: true,
              precision: 2,
              putOnlyUsedFonts: true
            }
          };
          
          element.style.display = 'block';
          element.style.visibility = 'visible';
          element.style.height = 'auto';
          element.style.overflow = 'visible';
          
          html2pdf()
            .from(element)
            .set(opt)
            .save()
            .then(() => {
              console.log('PDF generation complete');
              document.head.removeChild(style);
              
              setTimeout(() => {
                window.close();
              }, 1000);
            })
            .catch(err => {
              console.error('Error generating PDF:', err);
              alert('שגיאה ביצירת ה-PDF. נסה שוב.');
              document.head.removeChild(style);
            });
        };
        
        exportToPdf();
      }, 2000);
    }
  }, [exportPdf, loading, show, items]);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          size: portrait;
          margin: 10mm 10mm 15mm 10mm !important;
        }
        
        tr, td, th {
          page-break-inside: avoid !important;
        }
        
        .divider-row {
          page-break-after: avoid !important;
          page-break-before: auto !important;
          margin-top: 20px !important;
        }
        
        table {
          margin-bottom: 8mm !important;
        }
        
        tr td {
          padding-top: 2mm !important;
          padding-bottom: 2mm !important;
        }
        
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
      
      <div ref={pdfRef} className="lineup-pdf-export" style={{ display: exportPdf ? 'block' : 'none', visibility: 'visible', height: 'auto', overflow: 'visible' }}>
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
