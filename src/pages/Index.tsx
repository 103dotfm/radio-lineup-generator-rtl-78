import React, { useState, useRef } from 'react';
import LineupForm from '../components/LineupForm';
import LineupItem from '../components/LineupItem';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Share2, Search } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { format } from 'date-fns';

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
  const [items, setItems] = useState<LineupItemType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showName, setShowName] = useState('');
  const [showTime, setShowTime] = useState('');
  const [showDate, setShowDate] = useState('');
  const [editingItem, setEditingItem] = useState<LineupItemType | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[100px] p-4 border rounded-md',
      },
    },
  });

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
    // This is a placeholder for the actual API call
    return null;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    // Implement sharing functionality
    toast.info('שיתוף בפיתוח');
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDuration = items.reduce((sum, item) => sum + item.duration, 0);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold mb-8 text-right">ליינאפ רדיו</h1>
        
        <div ref={formRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 rtl-grid">
          <Input
            placeholder="שם התוכנית"
            value={showName}
            onChange={(e) => setShowName(e.target.value)}
          />
          <Input
            type="time"
            value={showTime}
            onChange={(e) => setShowTime(e.target.value)}
          />
          <Input
            type="date"
            value={showDate}
            onChange={(e) => {
              const date = new Date(e.target.value);
              setShowDate(format(date, 'dd/MM/yyyy'));
            }}
          />
          <div className="col-span-2">
            <EditorContent editor={editor} className="min-h-[100px]" />
          </div>
        </div>

        <div className="mb-8">
          <LineupForm 
            onAdd={handleAdd} 
            onNameChange={handleNameChange}
            editingItem={editingItem}
          />
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="ml-2 h-4 w-4" />
              הדפסה
            </Button>
            <Button onClick={handleShare} variant="outline">
              <Share2 className="ml-2 h-4 w-4" />
              שיתוף
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="חיפוש..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

      </div>

      <div className="print:block print:mt-0">
        <div className="print:text-center print:mb-8">
          <h1 className="text-3xl font-bold">{showName}</h1>
          <h2 className="text-xl text-gray-600 mt-2">{showTime} {showDate}</h2>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="lineup">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                <table className="w-full print:table border-collapse [&_td]:border [&_th]:border [&_td]:border-black [&_th]:border-black">
                  <thead>
                    <tr>
                      <th className="py-2 text-right">שם</th>
                      <th className="py-2 text-right">כותרת</th>
                      <th className="py-2 text-right">פרטים</th>
                      <th className="py-2 text-right">טלפון</th>
                      <th className="py-2 text-right">דקות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, index) => (
                      <LineupItem
                        key={item.id}
                        {...item}
                        index={index}
                        onDelete={handleDelete}
                        onDurationChange={handleDurationChange}
                        onEdit={handleEdit}
                      />
                    ))}
                    {provided.placeholder}
                  </tbody>
                </table>
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {editor?.getHTML() && (
          <div className="print:mt-8 print:text-right" dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
        )}

        <div className="print:mt-4 print:text-left">
          <p>סה"כ זמן: {totalDuration} דקות</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { 
            size: auto;
            margin: 20mm;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:table { display: table !important; }
          .print\\:mt-0 { margin-top: 0 !important; }
          .print\\:mt-8 { margin-top: 2rem !important; }
          .print\\:mt-4 { margin-top: 1rem !important; }
          .print\\:mb-8 { margin-bottom: 2rem !important; }
          .print\\:text-center { text-align: center !important; }
          .print\\:text-right { text-align: right !important; }
          .print\\:text-left { text-align: left !important; }
          table { border-collapse: collapse; }
          th, td { 
            padding: 8px;
            text-align: right;
            border-bottom: 1px solid #ddd;
          }
        }
      `}</style>
    </div>
  );
};

export default Index;
