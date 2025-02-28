import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { saveShow, getShowWithItems } from '@/lib/supabase/shows';
import { DropResult } from 'react-beautiful-dnd';
import LineupEditor from '../components/lineup/LineupEditor';
import PrintPreview from '../components/lineup/PrintPreview';

const Index = () => {
  const { id: showId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [items, setItems] = useState([]);
  const [showName, setShowName] = useState('');
  const [showTime, setShowTime] = useState('');
  const [showDate, setShowDate] = useState<Date>(new Date());
  const [editingItem, setEditingItem] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [initialState, setInitialState] = useState(null);
  const [showMinutes, setShowMinutes] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const isNewLineup = !showId;

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
    if (isNewLineup && state) {
      let displayName;
      if (state.generatedShowName) {
        displayName = state.generatedShowName;
      } else {
        displayName = state.showName === state.hostName
          ? state.hostName
          : `${state.showName} עם ${state.hostName}`;
      }
      
      setShowName(displayName);
      setShowTime(state.time || '');
      
      if (state.date) {
        setShowDate(new Date(state.date));
      }

      setInitialState({
        name: displayName,
        time: state.time || '',
        date: state.date ? new Date(state.date) : new Date(),
        notes: '',
        items: []
      });
    }
  }, [isNewLineup, state]);

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
    if (state && isNewLineup) {
      setHasUnsavedChanges(false);
    }
  }, [state, isNewLineup]);

  const handleEdit = useCallback(async (id: string, updatedItem: any) => {
    setItems(prevItems => 
      prevItems.map(item => 
        item.id === id 
          ? {
              ...item,
              ...updatedItem,
              interviewees: updatedItem.interviewees
            }
          : item
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      const show = {
        name: showName,
        time: showTime,
        date: showDate ? format(showDate, 'yyyy-MM-dd') : '',
        notes: editor?.getHTML() || '',
        slot_id: state?.slotId
      };

      const itemsToSave = items.map(({ id: itemId, ...item }) => ({
        name: item.name,
        title: item.title,
        details: item.details,
        phone: item.phone,
        duration: item.duration,
        is_break: item.is_break || false,
        is_note: item.is_note || false,
        interviewees: item.interviewees || []
      }));

      const savedShow = await saveShow(show, itemsToSave, showId);
      
      if (savedShow && !showId) {
        navigate(`/show/${savedShow.id}`, { replace: true });
      }
      
      const result = await getShowWithItems(showId || savedShow.id);
      if (result) {
        setItems(result.items);
        setInitialState({
          name: showName,
          time: showTime,
          date: showDate,
          notes: editor?.getHTML() || '',
          items: result.items
        });
      }
      
      setHasUnsavedChanges(false);
      toast.success('הליינאפ נשמר בהצלחה');
    } catch (error) {
      console.error('Error saving show:', error);
      toast.error('שגיאה בשמירת הליינאפ');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, showName, showTime, showDate, editor, items, state, showId, navigate]);

  const handleAdd = useCallback((newItem) => {
    if (editingItem) {
      setItems(items.map(item => 
        item.id === editingItem.id 
          ? { ...newItem, id: editingItem.id }
          : item
      ));
      setEditingItem(null);
    } else {
      const item = {
        ...newItem,
        id: crypto.randomUUID(),
      };
      setItems([...items, item]);
    }
    setHasUnsavedChanges(true);
  }, [editingItem, items]);

  const handleDetailsChange = useCallback((id: string, details: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, details } : item
    ));
    setHasUnsavedChanges(true);
  }, [items]);

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = `${window.location.origin}/print/${showId}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('קישור לליינאפ הועתק ללוח');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('שגיאה בשיתוף הליינאפ');
    }
  }, [showId]);

  const handleBackToDashboard = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      navigate('/');
    }
  }, [hasUnsavedChanges, navigate]);

  const handleExportPDF = useCallback(() => {
    if (!printRef.current) return;
    
    const element = printRef.current;
    const opt = {
      margin: [5, 5],
      filename: `${showName || 'lineup'}-${format(showDate || new Date(), 'dd-MM-yyyy')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: true,
        letterRendering: true
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    element.style.display = 'block';
    
    html2pdf().set(opt).from(element).save()
      .then(() => {
        toast.success('PDF נוצר בהצלחה');
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        toast.error('שגיאה ביצירת ה־PDF');
      });
  }, [printRef, showName, showDate]);

  const handleNameChange = useCallback((name: string) => {
    setShowName(name);
    setHasUnsavedChanges(true);
  }, []);

  const handleTimeChange = useCallback((time: string) => {
    setShowTime(time);
    setHasUnsavedChanges(true);
  }, []);

  const handleDateChange = useCallback((date: Date | undefined) => {
    setShowDate(date || new Date());
    setHasUnsavedChanges(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setItems(items.filter(item => item.id !== id));
    setHasUnsavedChanges(true);
    toast.success('פריט נמחק בהצלחה');
  }, [items]);

  const handleDurationChange = useCallback((id: string, duration: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, duration } : item
    ));
    setHasUnsavedChanges(true);
  }, [items]);

  const handleBreakTextChange = useCallback((id: string, text: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, name: text } : item
    ));
    setHasUnsavedChanges(true);
  }, [items]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
    setHasUnsavedChanges(true);
  }, [items]);

  const handleToggleMinutes = useCallback((show: boolean) => {
    setShowMinutes(show);
  }, []);

  return (
    <>
      <div className="container mx-auto py-8 px-4">
        <LineupEditor
          showName={showName}
          showTime={showTime}
          showDate={showDate}
          items={items}
          editor={editor}
          editingItem={editingItem}
          onNameChange={handleNameChange}
          onTimeChange={handleTimeChange}
          onDateChange={handleDateChange}
          onSave={handleSave}
          onShare={handleShare}
          onPrint={() => window.print()}
          onExportPDF={handleExportPDF}
          onAdd={handleAdd}
          onDelete={handleDelete}
          onDurationChange={handleDurationChange}
          onEdit={handleEdit}
          onBreakTextChange={handleBreakTextChange}
          onDragEnd={handleDragEnd}
          handleNameLookup={async () => null}
          onBackToDashboard={handleBackToDashboard}
          onDetailsChange={handleDetailsChange}
          onToggleMinutes={handleToggleMinutes}
          showMinutes={showMinutes}
        />

        <div ref={printRef} className="hidden print:block print:mt-0">
          <PrintPreview
            showName={showName}
            showTime={showTime}
            showDate={showDate}
            items={items}
            editorContent={editor?.getHTML() || ''}
            showMinutes={showMinutes}
          />
        </div>
      </div>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>שינויים לא שמורים</AlertDialogTitle>
            <AlertDialogDescription>
              יש לך שינויים שלא נשמרו. האם ברצונך לשמור אותם לפני החזרה ללוח הבקרה?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate('/')}>
              התעלם משינויים
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleSave();
                navigate('/');
              }}
            >
              שמור שינויים
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Index;
