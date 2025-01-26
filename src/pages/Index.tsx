import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from "sonner";
import html2pdf from 'html2pdf.js';
import { saveShow, getShowWithItems } from '@/lib/supabase/shows';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
        id,
        name: showName,
        time: showTime,
        date: showDate ? format(showDate, 'yyyy-MM-dd') : null,
        notes: editor?.getHTML() || '',
      };

      const savedShow = await saveShow(show, items);
      if (savedShow) {
        setIsModified(false);
        if (!id) {
          navigate(`/show/${savedShow.id}`);
        }
        toast.success('התוכנית נשמרה בהצלחה');
      }
    } catch (error) {
      console.error('Error saving show:', error);
      toast.error('שגיאה בשמירת התוכנית');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!id) {
      toast.error('יש לשמור את התוכנית לפני ההדפסה');
      return;
    }
    navigate(`/print/${id}`);
  };

  const handleShare = async () => {
    if (!id) {
      toast.error('יש לשמור את התוכנית לפני השיתוף');
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/show/${id}`);
      toast.success('הקישור הועתק ללוח');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('שגיאה בהעתקת הקישור');
    }
  };

  const handleExportPDF = async () => {
    if (!id) {
      toast.error('יש לשמור את התוכנית לפני ייצוא ל-PDF');
      return;
    }
    if (!printRef.current) {
      toast.error('שגיאה בייצוא ל-PDF');
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

    try {
      await html2pdf().set(opt).from(element).save();
      toast.success('PDF נוצר בהצלחה');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('שגיאה בייצוא ל-PDF');
    }
  };

  const handleNavigateBack = () => {
    if (isModified) {
      setShowSaveDialog(true);
    } else {
      navigate('/');
    }
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
        onPrint={handlePrint}
        onShare={handleShare}
        onExportPDF={handleExportPDF}
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
        onDragEnd={(result) => {
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