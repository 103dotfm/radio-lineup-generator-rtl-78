
import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { toast } from "sonner";
import { saveShow } from '@/lib/supabase/shows';
import { useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { Editor } from '@tiptap/react';
import { DropResult } from 'react-beautiful-dnd';
import { ShowItem } from '@/types/show';

interface UseLineupHandlersProps {
  items: ShowItem[];
  setItems: (items: ShowItem[]) => void;
  showName: string;
  showTime: string;
  showDate: Date;
  editor: Editor | null;
  editingItem: ShowItem | null;
  setEditingItem: (item: ShowItem | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  isSaving: boolean;
  setIsSaving: (isSaving: boolean) => void;
  setInitialState: (state: any) => void;
  showId?: string;
}

export const useLineupHandlers = ({
  items,
  setItems,
  showName,
  showTime,
  showDate,
  editor,
  editingItem,
  setEditingItem,
  setHasUnsavedChanges,
  isSaving,
  setIsSaving,
  setInitialState,
  showId
}: UseLineupHandlersProps) => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const handleAdd = (newItem: Partial<ShowItem>) => {
    const updatedItems = editingItem 
      ? items.map(item => 
          item.id === editingItem.id 
            ? { ...newItem, id: editingItem.id } as ShowItem
            : item
        )
      : [...items, { ...newItem, id: crypto.randomUUID() } as ShowItem];
    
    setItems(updatedItems);
    setEditingItem(null);
    setHasUnsavedChanges(true);
  };

  const handleEdit = async (id: string, updatedItem: Partial<ShowItem>) => {
    if (!id) {
      toast.error('מזהה פריט לא תקין');
      return;
    }
    
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, ...updatedItem } : item
    );
    setItems(updatedItems);
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
        is_break: item.is_break || false,
        is_note: item.is_note || false
      }));

      const savedShow = await saveShow(show, itemsToSave, showId);
      if (savedShow && !showId) {
        navigate(`/show/${savedShow.id}`);
      }
      
      setInitialState({
        name: showName,
        time: showTime,
        date: showDate,
        notes: editor?.getHTML() || '',
        items: items
      });
      
      setHasUnsavedChanges(false);
      toast.success('הליינאפ נשמר בהצלחה');
    } catch (error) {
      console.error('Error saving show:', error);
      toast.error('שגיאה בשמירת הליינאפ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/print/${showId}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('קישור לליינאפ הועתק ללוח');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('שגיאה בשיתוף הליינאפ');
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

  const handleDetailsChange = (id: string, details: string) => {
    const updatedItems = items.map(item => 
      item.id === id ? { ...item, details } : item
    );
    setItems(updatedItems);
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
    setHasUnsavedChanges(true);
  };

  return {
    printRef,
    handleAdd,
    handleEdit,
    handleSave,
    handleShare,
    handleExportPDF,
    handleDetailsChange,
    handleDragEnd
  };
};
