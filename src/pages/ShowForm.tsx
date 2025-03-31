
import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { DragDropContext } from 'react-beautiful-dnd';
import { toast } from "sonner";
import LineupEditor from '@/components/lineup/LineupEditor';
import { getShowWithItems, saveShow } from '@/lib/supabase/shows';

const ShowForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showName, setShowName] = useState('');
  const [showTime, setShowTime] = useState('');
  const [showDate, setShowDate] = useState<Date | undefined>(new Date());
  const [items, setItems] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMinutes, setShowMinutes] = useState(true);
  const [nextShowName, setNextShowName] = useState('');
  const [nextShowHost, setNextShowHost] = useState('');
  
  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  });

  // Fetch show data if id is provided
  useEffect(() => {
    const fetchShow = async () => {
      if (id) {
        try {
          const { show, items } = await getShowWithItems(id);
          if (show) {
            setShowName(show.name || '');
            setShowTime(show.time || '');
            setShowDate(show.date ? new Date(show.date) : new Date());
            setItems(items);
          }
        } catch (error) {
          console.error('Error fetching show:', error);
          toast.error('Failed to load show');
        }
      }
    };

    fetchShow();
  }, [id]);

  // Handle adding a new item
  const handleAddItem = useCallback((item) => {
    setItems(prevItems => [...prevItems, { ...item, id: crypto.randomUUID() }]);
  }, []);

  // Handle saving the show
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await saveShow(
        {
          name: showName,
          time: showTime,
          date: showDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          notes: editor?.getHTML() || ''
        },
        items,
        id
      );
      
      toast.success('Show saved successfully');
      if (!id && result?.id) {
        navigate(`/show/${result.id}`);
      }
    } catch (error) {
      console.error('Error saving show:', error);
      toast.error('Failed to save show');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle dragging and dropping items
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);
    setItems(reorderedItems);
  };

  // Handle divider addition
  const handleDividerAdd = () => {
    const dividerItem = {
      id: crypto.randomUUID(),
      name: 'שעה שנייה',
      title: '',
      details: '',
      phone: '',
      duration: 0,
      is_break: false,
      is_note: false,
      is_divider: true
    };
    
    setItems(prevItems => [...prevItems, dividerItem]);
  };

  // Handle name lookup (for autocomplete)
  const handleNameLookup = async (name) => {
    // This would typically query your database for matching names
    return { name };
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
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
        onSave={handleSave}
        onShare={async () => {}}
        onPrint={() => {}}
        onExportPDF={() => {}}
        onAdd={handleAddItem}
        onDelete={(id) => setItems(items.filter(item => item.id !== id))}
        onDurationChange={(id, duration) => {
          setItems(items.map(item => 
            item.id === id ? { ...item, duration } : item
          ));
        }}
        onEdit={async (id, updatedItem) => {
          setItems(items.map(item => 
            item.id === id ? { ...item, ...updatedItem } : item
          ));
        }}
        onBreakTextChange={(id, text) => {
          setItems(items.map(item => 
            item.id === id ? { ...item, name: text } : item
          ));
        }}
        onDragEnd={onDragEnd}
        handleNameLookup={handleNameLookup}
        onBackToDashboard={() => navigate('/dashboard')}
        onDetailsChange={(id, details) => {
          setItems(items.map(item => 
            item.id === id ? { ...item, details } : item
          ));
        }}
        showMinutes={showMinutes}
        onToggleMinutes={(show) => setShowMinutes(show)}
        onDividerAdd={handleDividerAdd}
        isSaving={isSaving}
        nextShowName={nextShowName}
        nextShowHost={nextShowHost}
        onRemoveNextShowLine={() => {
          setNextShowName('');
          setNextShowHost('');
        }}
      />
    </DragDropContext>
  );
};

export default ShowForm;
