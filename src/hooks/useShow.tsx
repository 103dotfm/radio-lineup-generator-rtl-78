import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from "sonner";
import html2pdf from 'html2pdf.js';
import { saveShow } from '@/lib/supabase/shows';

export const useShow = (id?: string) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [showName, setShowName] = useState('');
  const [showTime, setShowTime] = useState('');
  const [showDate, setShowDate] = useState<Date>();
  const [editingItem, setEditingItem] = useState(null);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        notes: '',
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

  const handlePrint = () => {
    if (!id) {
      toast.error('יש לשמור את התוכנית לפני ההדפסה');
      return;
    }
    window.open(`/print/${id}`, '_blank');
  };

  const handleShare = async (id?: string) => {
    if (!id) {
      toast.error('יש לשמור את התוכנית לפני השיתוף');
      return;
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/print/${id}`);
      toast.success('הקישור הועתק ללוח');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('שגיאה בהעתקת הקישור');
    }
  };

  const handleExportPDF = async (pdfRef: React.RefObject<HTMLDivElement>) => {
    if (!id) {
      toast.error('יש לשמור את התוכנית לפני ייצוא ל-PDF');
      return;
    }
    if (!pdfRef.current) {
      toast.error('שגיאה בייצוא ל-PDF');
      return;
    }

    const element = pdfRef.current;
    const opt = {
      margin: [15, 15],
      filename: `${showName || 'lineup'}-${format(showDate || new Date(), 'dd-MM-yyyy')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true,
        precision: 16
      }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      toast.success('PDF נוצר בהצלחה');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('שגיאה בייצוא ל-PDF');
    }
  };

  return {
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
  };
};