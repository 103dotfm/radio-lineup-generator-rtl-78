
import React, { useEffect } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import NextShowCredits from './next-show/NextShowCredits';
import { supabase } from '@/lib/supabase';

interface ShowCreditsProps {
  editor: Editor | null;
  nextShowName?: string;
  nextShowHost?: string;
  onRemoveNextShowLine?: () => void;
}

const ShowCredits = ({ editor, nextShowName, nextShowHost, onRemoveNextShowLine }: ShowCreditsProps) => {
  // Trigger cache update when component mounts
  useEffect(() => {
    const updateCache = async () => {
      try {
        console.log('Triggering schedule cache update from ShowCredits component');
        
        // Invoke the update-schedule-cache function
        const { data, error } = await supabase.functions.invoke('update-schedule-cache', {
          body: { timestamp: new Date().toISOString() }
        });
        
        if (error) {
          console.error('Error triggering cache update:', error);
        } else {
          console.log('Cache update response:', data);
        }
      } catch (err) {
        console.error('Exception when triggering cache update:', err);
      }
    };
    
    updateCache();
  }, []);

  if (!editor) return null;

  return (
    <div className="col-span-2 space-y-4">
      <EditorContent editor={editor} className="min-h-[100px] bg-white border rounded-md text-center" />
      
      {nextShowName && (
        <NextShowCredits
          editor={editor}
          nextShowName={nextShowName}
          nextShowHost={nextShowHost}
          onRemoveLine={onRemoveNextShowLine}
        />
      )}
    </div>
  );
};

export default ShowCredits;
