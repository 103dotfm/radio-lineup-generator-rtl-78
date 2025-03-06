
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
