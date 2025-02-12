
import { useState, useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { format } from 'date-fns';
import { toast } from "sonner";
import { saveShow, getShowWithItems } from '@/lib/supabase/shows';
import { useNavigate } from 'react-router-dom';

export const useLineupState = (showId?: string) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [showName, setShowName] = useState('');
  const [showTime, setShowTime] = useState('');
  const [showDate, setShowDate] = useState<Date>(new Date());
  const [editingItem, setEditingItem] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialState, setInitialState] = useState(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[100px] p-4',
        placeholder: 'קרדיטים',
      },
    },
    onUpdate: () => setHasUnsavedChanges(true),
  });

  useEffect(() => {
    const loadShow = async () => {
      if (showId) {
        try {
          const result = await getShowWithItems(showId);
          if (!result) {
            toast.error('התוכנית לא נמצאה');
            navigate('/');
            return;
          }
          const { show, items: showItems } = result;
          if (show) {
            setShowName(show.name);
            setShowTime(show.time);
            setShowDate(show.date ? new Date(show.date) : new Date());
            if (editor) {
              editor.commands.setContent(show.notes || '');
            }
            setInitialState({
              name: show.name,
              time: show.time,
              date: show.date ? new Date(show.date) : new Date(),
              notes: show.notes || '',
              items: showItems
            });
          }
          if (showItems) {
            setItems(showItems);
          }
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error('Error loading show:', error);
          toast.error('שגיאה בטעינת התוכנית');
          navigate('/');
        }
      }
    };

    loadShow();
  }, [showId, editor, navigate]);

  useEffect(() => {
    if (!initialState) return;

    const currentState = {
      name: showName,
      time: showTime,
      date: showDate,
      notes: editor?.getHTML() || '',
      items: items
    };

    const hasChanges = 
      currentState.name !== initialState.name ||
      currentState.time !== initialState.time ||
      currentState.date?.getTime() !== initialState.date?.getTime() ||
      currentState.notes !== initialState.notes ||
      JSON.stringify(currentState.items) !== JSON.stringify(initialState.items);

    setHasUnsavedChanges(hasChanges);
  }, [showName, showTime, showDate, items, editor, initialState]);

  return {
    items,
    setItems,
    showName,
    setShowName,
    showTime,
    setShowTime,
    showDate,
    setShowDate,
    editingItem,
    setEditingItem,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    showUnsavedDialog,
    setShowUnsavedDialog,
    isSaving,
    setIsSaving,
    initialState,
    setInitialState,
    editor
  };
};
