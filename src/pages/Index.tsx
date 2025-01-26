import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { toast } from "sonner";
import { saveShow, getShowWithItems } from '@/lib/supabase/shows';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import LineupForm from '../components/LineupForm';
import LineupItem from '../components/LineupItem';
import ShowHeader from '../components/show/ShowHeader';
import ShowCredits from '../components/show/ShowCredits';

interface LineupItemType {
  id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  isBreak?: boolean;
}

const Index = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState<LineupItemType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showName, setShowName] = useState('');
  const [showTime, setShowTime] = useState('');
  const [showDate, setShowDate] = useState<Date>();
  const [editingItem, setEditingItem] = useState<LineupItemType | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
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
  });

  const handleBreakTextChange = (id: string, text: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, name: text } : item
    ));
    toast.success('טקסט ההפסקה עודכן');
  };

  const handleAdd = (newItem: Omit<LineupItemType, 'id'>) => {
    if (editingItem) {
      setItems(items.map(item => 
        item.id === editingItem.id 
          ? { ...newItem, id: editingItem.id }
          : item
      ));
      setEditingItem(null);
      toast.success('פריט עודכן בהצלחה');
    } else {
      const item = {
        ...newItem,
        id: Date.now().toString(),
      };
      setItems([...items, item]);
      toast.success('פריט נוסף בהצלחה');
    }
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success('פריט נמחק בהצלחה');
  };

  const handleDurationChange = (id: string, duration: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, duration } : item
    ));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
    toast.success('סדר הפריטים עודכן');
  };

  const handleEdit = (id: string) => {
    const item = items.find(item => item.id === id);
    if (item && !item.isBreak) {
      setEditingItem(item);
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
      toast.info('ערוך את הפריט');
    }
  };

  const handleNameChange = async (name: string) => {
    return null;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: showName || 'ליינאפ רדיו',
        text: `${showName} - ${showDate ? format(showDate, 'dd/MM/yyyy') : ''} ${showTime}`,
        url: window.location.href
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('התוכנית שותפה בהצלחה');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('הקישור הועתק ללוח');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('שגיאה בשיתוף התוכנית');
    }
  };

  const handleSave = async () => {
    try {
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

      await saveShow(show, itemsToSave);
      toast.success('התוכנית נשמרה בהצלחה');
    } catch (error) {
      console.error('Error saving show:', error);
      toast.error('שגיאה בשמירת התוכנית');
    }
  };

  const handleExportPDF = () => {
    if (!printRef.current) return;
    
    const opt = {
      margin: 20,
      filename: `${showName || 'lineup'}-${format(showDate || new Date(), 'dd-MM-yyyy')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const element = printRef.current.cloneNode(true) as HTMLElement;
    element.style.direction = 'rtl';
    
    const style = document.createElement('style');
    style.innerHTML = `
      @page { size: A4; margin: 20mm; }
      body { direction: rtl; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid black; padding: 8px; text-align: right; }
      .print-header { text-align: center; margin-bottom: 2rem; }
      .print-content { direction: rtl; }
      .print-footer { margin-top: 1rem; text-align: left; }
    `;
    document.head.appendChild(style);

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        document.head.removeChild(style);
        toast.success('PDF נוצר בהצלחה');
      });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold mb-8 text-right">ליינאפ רדיו</h1>
        
        <ShowHeader
          showName={showName}
          showTime={showTime}
          showDate={showDate}
          onNameChange={setShowName}
          onTimeChange={setShowTime}
          onDateChange={setShowDate}
          onSave={handleSave}
          onShare={handleShare}
          onPrint={handlePrint}
          onExportPDF={handleExportPDF}
        />

        <div ref={formRef}>
          <ShowCredits editor={editor} />
        </div>

        <div className="mb-8">
          <LineupForm 
            onAdd={handleAdd} 
            onNameChange={handleNameChange}
            editingItem={editingItem}
          />
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="lineup">
            {(provided) => (
              <div 
                ref={provided.innerRef} 
                {...provided.droppableProps}
                className="min-h-[200px] transition-all"
              >
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 text-right border border-gray-200">שם</th>
                      <th className="py-2 px-4 text-right border border-gray-200">כותרת</th>
                      <th className="py-2 px-4 text-right border border-gray-200">פרטים</th>
                      <th className="py-2 px-4 text-right border border-gray-200">טלפון</th>
                      <th className="py-2 px-4 text-right border border-gray-200">דקות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <LineupItem
                        key={item.id}
                        {...item}
                        index={index}
                        onDelete={handleDelete}
                        onDurationChange={handleDurationChange}
                        onEdit={handleEdit}
                        onBreakTextChange={handleBreakTextChange}
                      />
                    ))}
                    {provided.placeholder}
                  </tbody>
                </table>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div ref={printRef} className="hidden print:block print:mt-0">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">{showName}</h1>
          <h2 className="text-xl text-gray-600 mt-2">
            {showTime} {showDate ? format(showDate, 'dd/MM/yyyy') : ''}
          </h2>
        </div>

        {editor?.getHTML() && (
          <div className="mt-8 text-right" dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
        )}

        <table className="w-full border-collapse mt-8">
          <thead>
            <tr>
              <th className="py-2 px-4 text-right border border-gray-200">שם</th>
              <th className="py-2 px-4 text-right border border-gray-200">כותרת</th>
              <th className="py-2 px-4 text-right border border-gray-200">פרטים</th>
              <th className="py-2 px-4 text-right border border-gray-200">טלפון</th>
              <th className="py-2 px-4 text-right border border-gray-200">דקות</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border border-gray-200">
                <td className="py-2 px-4 border border-gray-200">{item.name}</td>
                <td className="py-2 px-4 border border-gray-200">{item.title}</td>
                <td className="py-2 px-4 border border-gray-200">{item.details}</td>
                <td className="py-2 px-4 border border-gray-200">{item.phone}</td>
                <td className="py-2 px-4 border border-gray-200">{item.duration} דקות</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 text-left">
          <p>סה"כ זמן: {items.reduce((sum, item) => sum + item.duration, 0)} דקות</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
