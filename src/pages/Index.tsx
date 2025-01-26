import React, { useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getShowWithItems } from '@/lib/supabase/shows';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from "sonner";
import LineupEditor from '../components/lineup/LineupEditor';
import PDFPreview from '../components/lineup/PDFPreview';
import SaveDialog from '../components/lineup/SaveDialog';
import LineupActions from '../components/lineup/LineupActions';
import { useShow } from '@/hooks/useShow';

const Index = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement>(null);
  const {
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
    isModified,
    setIsModified,
    handleSave,
    handlePrint,
    handleShare,
    handleExportPDF
  } = useShow(id);

  const [showSaveDialog, setShowSaveDialog] = React.useState(false);

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
            if (editor && show.notes) {
              editor.commands.setContent(show.notes);
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
  }, [id, editor, setItems, setShowName, setShowTime, setShowDate, setIsModified]);

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
        onSave={() => handleSave(editor)}
        onShare={handleShare}
        onPrint={handlePrint}
        onExportPDF={() => handleExportPDF(pdfRef)}
      />

      <LineupEditor
        showName={showName}
        showTime={showTime}
        showDate={showDate}
        items={items}
        editor={editor}
        editingItem={editingItem}
        onNameChange={setShowName}
        onTimeChange={setShowTime}
        onDateChange={setShowDate}
        onSave={() => handleSave(editor)}
        onPrint={handlePrint}
        onShare={handleShare}
        onExportPDF={() => handleExportPDF(pdfRef)}
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

      <div className="hidden">
        <PDFPreview
          ref={pdfRef}
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
        onSave={() => handleSave(editor)}
        onDiscard={() => navigate('/')}
      />
    </div>
  );
};

export default Index;