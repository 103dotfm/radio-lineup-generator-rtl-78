
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getShowWithItems } from '@/lib/supabase/shows';
import PrintPreview from '@/components/lineup/PrintPreview';

const Print = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [show, setShow] = useState<any>(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showMinutes = searchParams.get('minutes') === 'true';

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

  // Add inline script to ensure column width CSS works with print
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
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
  );
};

export default Print;
