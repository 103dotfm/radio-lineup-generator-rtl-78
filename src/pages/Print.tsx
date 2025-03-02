
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getShowWithItems } from '@/lib/supabase/shows';
import PrintPreview from '@/components/lineup/PrintPreview';

const Print = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [show, setShow] = useState<any>(null);
  const [items, setItems] = useState([]);
  const showMinutes = searchParams.get('minutes') === 'true';

  useEffect(() => {
    const loadShow = async () => {
      if (id) {
        try {
          const { show: loadedShow, items: showItems } = await getShowWithItems(id);
          if (loadedShow) {
            setShow(loadedShow);
          }
          if (showItems) {
            // Ensure items are correctly ordered
            setItems(showItems);
          }
        } catch (error) {
          console.error('Error loading show:', error);
        }
      }
    };

    loadShow();
  }, [id]);

  if (!show) return null;

  return (
    <div className="container mx-auto py-4 px-2 print-container">
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
