import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [showName, setShowName] = useState('');
  const [showTime, setShowTime] = useState('');
  const [showDate, setShowDate] = useState<Date>();
  const [editingItem, setEditingItem] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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
      if (id) {
        try {
          const { show, items: showItems } = await getShowWithItems(id);
          if (show) {
            setShowName(show.name);
            setShowTime(show.time);
            setShowDate(show.date ? new Date(show.date) : undefined);
            if (editor) {
              editor.commands.setContent(show.notes || '');
            }
          }
          if (showItems) {
            setItems(showItems);
          }
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error('Error loading show:', error);
          toast.error('שגיאה בטעינת התוכנית');
        }
      }
    };

    loadShow();
  }, [id, editor]);

  const handleAdd = (newItem) => {
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
        id: Date.now().toString(),
      };
      setItems([...items, item]);
    }
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      const show = {
        name: showName,
        time: showTime,
        date: showDate ? format(showDate, 'yyyy-MM-dd') : '',
        notes: editor?.getHTML() || '',
      };

      const itemsToSave = items.map(({ id: itemId, ...item }) => ({
        name: item.name,
        title: item.title,
        details: item.details,
        phone: item.phone,
        duration: item.duration,
        is_break: item.isBreak || false,
        is_note: item.isNote || false
      }));

      console.log('Saving items:', itemsToSave);

      const savedShow = await saveShow(show, itemsToSave, id);
      if (savedShow && !id) {
        navigate(`/show/${savedShow.id}`);
      }
      setHasUnsavedChanges(false);
      toast.success('הליינאפ נשמר בהצלחה');
    } catch (error) {
      console.error('Error saving show:', error);
      toast.error('שגיאה בשמירת הליינאפ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDetailsChange = (id: string, details: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, details } : item
    ));
    setHasUnsavedChanges(true);
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/print/${id}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('קישור לליינאפ הועתק ללוח');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('שגיאה בשיתוף הליינאפ');
    }
  };

  const handleBackToDashboard = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      navigate('/');
    }
  };

  const handleExportPDF = () => {
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
  };

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
          onNameChange={(name) => {
            setShowName(name);
            setHasUnsavedChanges(true);
          }}
          onTimeChange={(time) => {
            setShowTime(time);
            setHasUnsavedChanges(true);
          }}
          onDateChange={(date) => {
            setShowDate(date);
            setHasUnsavedChanges(true);
          }}
          onSave={handleSave}
          onShare={handleShare}
          onPrint={() => window.print()}
          onExportPDF={handleExportPDF}
          onAdd={handleAdd}
          onDelete={(id) => {
            setItems(items.filter(item => item.id !== id));
            setHasUnsavedChanges(true);
            toast.success('פריט נמחק בהצלחה');
          }}
          onDurationChange={(id, duration) => {
            setItems(items.map(item => 
              item.id === id ? { ...item, duration } : item
            ));
            setHasUnsavedChanges(true);
          }}
          onEdit={(id) => {
            const item = items.find(item => item.id === id);
            if (item && !item.isBreak) {
              setEditingItem(item);
            }
          }}
          onBreakTextChange={(id, text) => {
            setItems(items.map(item => 
              item.id === id ? { ...item, name: text } : item
            ));
            setHasUnsavedChanges(true);
          }}
          onDragEnd={(result: DropResult) => {
            if (!result.destination) return;
            const newItems = Array.from(items);
            const [reorderedItem] = newItems.splice(result.source.index, 1);
            newItems.splice(result.destination.index, 0, reorderedItem);
            setItems(newItems);
            setHasUnsavedChanges(true);
          }}
          handleNameLookup={async () => null}
          onBackToDashboard={handleBackToDashboard}
          onDetailsChange={handleDetailsChange}
        />

        <div ref={printRef} className="hidden print:block print:mt-0">
          <PrintPreview
            showName={showName}
            showTime={showTime}
            showDate={showDate}
            items={items}
            editorContent={editor?.getHTML() || ''}
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
              התעלמות משינויים
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await handleSave();
                navigate('/');
              }}
            >
              שמירה ומעבר לעמוד הראשי
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Index;
