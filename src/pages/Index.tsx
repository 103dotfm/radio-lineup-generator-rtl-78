import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { toast } from "sonner";
import { saveShow, getShowWithItems } from '@/lib/supabase/shows';
import { DropResult } from 'react-beautiful-dnd';
import LineupEditor from '../components/lineup/LineupEditor';
import PrintPreview from '../components/lineup/PrintPreview';
import SaveDialog from '../components/lineup/SaveDialog';
import LineupActions from '../components/lineup/LineupActions';

const Index = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [showName, setShowName] = useState('');
  const [showTime, setShowTime] = useState('');
  const [showDate, setShowDate] = useState<Date>();
  const [editingItem, setEditingItem] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
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
    onUpdate: () => setIsModified(true),
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
          setIsModified(false);
        } catch (error) {
          console.error('Error loading show:', error);
          toast.error('שגיאה בטעינת התוכנית');
        }
      }
    };

    loadShow();
  }, [id, editor]);

  const handleSave = async () => {
    if (isSaving) {
      toast.info('שמירה מתבצעת...');
      return;
    }
    
    try {
      setIsSaving(true);
      const show = {
        name: showName,
        time: showTime,
        date: showDate ? format(showDate, 'yyyy-MM-dd') : '',
        notes: editor?.getHTML() || '',
      };

      const itemsToSave = items.map(({ id, isBreak, ...item }) => ({
        ...item,
        is_break: isBreak || false,
      }));

      const savedShow = await saveShow(show, itemsToSave);
      if (savedShow) {
        setIsModified(false);
        navigate(`/show/${savedShow.id}`);
        toast.success('התוכנית נשמרה בהצלחה');
      }
    } catch (error) {
      console.error('Error saving show:', error);
      toast.error('שגיאה בשמירת התוכנית');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigateBack = () => {
    if (isModified) {
      setShowSaveDialog(true);
    } else {
      navigate('/');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (id) {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/show/${id}`);
        toast.success('הקישור הועתק ללוח');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast.error('שגיאה בהעתקת הקישור');
      }
    } else {
      toast.info('יש לשמור את התוכנית לפני השיתוף');
    }
  };

  const handleExportPDF = () => {
    if (!printRef.current) {
      toast.error('שגיאה ביצירת ה-PDF');
      return;
    }
    
    const element = printRef.current;
    const opt = {
      margin: [10, 10],
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
    
    html2pdf().set(opt).from(element).save()
      .then(() => {
        toast.success('PDF נוצר בהצלחה');
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        toast.error('שגיאה ביצירת ה-PDF');
      });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <LineupActions
        onBack={handleNavigateBack}
        onSave={handleSave}
        onShare={handleShare}
        onPrint={handlePrint}
        onExportPDF={handleExportPDF}
      />

      <LineupEditor
        showName={showName}
        showTime={showTime}
        showDate={showDate}
        items={items}
        editor={editor}
        editingItem={editingItem}
        onNameChange={(name) => {
          setShowName(name);
          setIsModified(true);
        }}
        onTimeChange={(time) => {
          setShowTime(time);
          setIsModified(true);
        }}
        onDateChange={(date) => {
          setShowDate(date);
          setIsModified(true);
        }}
        onSave={handleSave}
        onAdd={(newItem) => {
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
          setIsModified(true);
        }}
        onDelete={(id) => {
          setItems(items.filter(item => item.id !== id));
          setIsModified(true);
        }}
        onDurationChange={(id, duration) => {
          setItems(items.map(item => 
            item.id === id ? { ...item, duration } : item
          ));
          setIsModified(true);
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
          setIsModified(true);
        }}
        onDragEnd={(result: DropResult) => {
          if (!result.destination) return;
          const newItems = Array.from(items);
          const [reorderedItem] = newItems.splice(result.source.index, 1);
          newItems.splice(result.destination.index, 0, reorderedItem);
          setItems(newItems);
          setIsModified(true);
        }}
        handleNameLookup={async () => null}
      />

      <div ref={printRef} className="hidden">
        <PrintPreview
          showName={showName}
          showTime={showTime}
          showDate={showDate}
          items={items}
          editorContent={editor?.getHTML() || ''}
        />
      </div>

      <SaveDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSave}
        onDiscard={() => navigate('/')}
      />
    </div>
  );
};

export default Index;
