import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { saveShow, getShowWithItems, getShowsByDate } from '@/lib/supabase/shows';
import { DropResult } from 'react-beautiful-dnd';
import LineupEditor from '../components/lineup/LineupEditor';
import PrintPreview from '../components/lineup/PrintPreview';
import { getNextShow } from '@/lib/getNextShow';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';

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
  const [nextShowInfo, setNextShowInfo] = useState<{ name: string; host?: string } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const isNewLineup = !showId;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Underline
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[100px] p-4',
        placeholder: 'קרדיטים',
      },
    },
    onUpdate: () => setHasUnsavedChanges(true),
  });

  const fetchNextShowInfo = useCallback(async () => {
    if (showDate && showTime) {
      try {
        console.log('Fetching next show info for exact date:', format(showDate, 'yyyy-MM-dd'), showTime);
        const nextShow = await getNextShow(showDate, showTime);
        console.log('Next show info result:', nextShow);
        setNextShowInfo(nextShow);
      } catch (error) {
        console.error('Error fetching next show:', error);
        setNextShowInfo(null);
      }
    }
  }, [showDate, showTime]);

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

  useEffect(() => {
    fetchNextShowInfo();
  }, [fetchNextShowInfo]);

  const handleEdit = useCallback(async (id: string, updatedItem: any) => {
    console.log(`Editing item ${id} with data:`, updatedItem);
    
    setItems(prevItems => {
      const updatedItems = prevItems.map(item => 
        item.id === id 
          ? {
              ...item,
              ...updatedItem,
              is_divider: updatedItem.is_divider === undefined ? item.is_divider : updatedItem.is_divider,
              is_break: updatedItem.is_break === undefined ? item.is_break : updatedItem.is_break,
              is_note: updatedItem.is_note === undefined ? item.is_note : updatedItem.is_note,
              interviewees: updatedItem.interviewees
            }
          : item
      );
      
      console.log('After edit, items are:', updatedItems.map(item => ({
        id: item.id,
        name: item.name,
        is_divider: item.is_divider,
        is_break: item.is_break,
        is_note: item.is_note
      })));
      
      return updatedItems;
    });
    
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      console.log('Items before saving:', items.map(item => ({
        name: item.name,
        is_divider: item.is_divider,
        is_divider_type: typeof item.is_divider,
        is_break: item.is_break,
        is_note: item.is_note
      })));
      
      const show = {
        name: showName,
        time: showTime,
        date: showDate ? format(showDate, 'yyyy-MM-dd') : '',
        notes: editor?.getHTML() || '',
        slot_id: state?.slotId
      };

      const itemsToSave = items.map(({ id: itemId, ...item }) => {
        console.log(`Preparing item to save: ${item.name}`, {
          is_divider: item.is_divider,
          is_divider_type: typeof item.is_divider,
          is_break: item.is_break,
          is_note: item.is_note
        });
        
        return {
          name: item.name,
          title: item.title,
          details: item.details,
          phone: item.phone,
          duration: item.duration,
          is_break: Boolean(item.is_break),
          is_note: Boolean(item.is_note),
          is_divider: Boolean(item.is_divider),
          interviewees: item.interviewees || []
        };
      });
      
      console.log('Final items to save:', itemsToSave.map(item => ({
        name: item.name,
        is_divider: item.is_divider,
        is_divider_type: typeof item.is_divider,
        is_break: item.is_break,
        is_note: item.is_note
      })));

      const savedShow = await saveShow(show, itemsToSave, showId);
      
      if (savedShow && !showId) {
        navigate(`/show/${savedShow.id}`, { replace: true });
      }
      
      const result = await getShowWithItems(showId || savedShow.id);
      if (result) {
        console.log('Items after reloading:', result.items.map(item => ({
          name: item.name,
          is_divider: item.is_divider,
          is_break: item.is_break,
          is_note: item.is_note
        })));
        
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
      
      fetchNextShowInfo();
    } catch (error) {
      console.error('Error saving show:', error);
      toast.error('שגיאה בשמירת הליינאפ');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, showName, showTime, showDate, editor, items, state, showId, navigate, fetchNextShowInfo]);

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
      const shareUrl = `${window.location.origin}/print/${showId}${showMinutes ? '?minutes=true' : ''}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('קישור לליינאפ הועתק ללוח');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('שגיאה בשיתוף הליינאפ');
    }
  }, [showId, showMinutes]);

  const handleBackToDashboard = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      navigate('/');
    }
  }, [hasUnsavedChanges, navigate]);

  const handleExportPDF = useCallback(() => {
    if (showId) {
      const pdfUrl = `${window.location.origin}/print/${showId}?export=pdf${showMinutes ? '&minutes=true' : ''}`;
      window.open(pdfUrl, '_blank');
    } else {
      toast.error('נא לשמור את הליינאפ לפני יצירת PDF');
    }
  }, [showId, showMinutes]);

  const handleNameChange = useCallback((name: string) => {
    setShowName(name);
    setHasUnsavedChanges(true);
  }, []);

  const handleTimeChange = useCallback((time: string) => {
    setShowTime(time);
    setHasUnsavedChanges(true);
    fetchNextShowInfo();
  }, [fetchNextShowInfo]);

  const handleDateChange = useCallback((date: Date | undefined) => {
    setShowDate(date || new Date());
    setHasUnsavedChanges(true);
    setTimeout(fetchNextShowInfo, 100);
  }, [fetchNextShowInfo]);

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

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleAddDivider = useCallback(() => {
    const newDivider = {
      id: crypto.randomUUID(),
      name: "שעה שנייה",
      position: items.length,
      is_divider: true,
      is_break: false,
      is_note: false,
      duration: 0,
      details: '',
      title: '',
      phone: ''
    };
    
    console.log('Creating new divider with is_divider:', newDivider.is_divider);
    console.log('Full divider object:', newDivider);
    
    setItems(prevItems => {
      const updatedItems = [...prevItems, newDivider];
      console.log('Updated items after adding divider:', updatedItems.map(item => ({
        id: item.id,
        name: item.name,
        is_divider: item.is_divider,
        is_break: item.is_break,
        is_note: item.is_note
      })));
      return updatedItems;
    });
    
    setHasUnsavedChanges(true);
    toast.success('הפרדה נוספה בהצלחה');
  }, [items]);

  const handleRemoveNextShowLine = useCallback(() => {
    setTimeout(fetchNextShowInfo, 100);
  }, [fetchNextShowInfo]);

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
          onPrint={handlePrint}
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
          showMinutes={showMinutes}
          onToggleMinutes={handleToggleMinutes}
          onDividerAdd={handleAddDivider}
          isSaving={isSaving}
          nextShowName={nextShowInfo?.name}
          nextShowHost={nextShowInfo?.host}
          onRemoveNextShowLine={handleRemoveNextShowLine}
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
              יש ��ך שינויים שלא נשמרו. האם ברצונך לשמור אותם לפני החזרה ללוח הבקרה?
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
