import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { toast } from "sonner";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';

// Helper function to convert HTML to TextRun array for proper formatting
const convertHtmlToTextRuns = (html: string): TextRun[] => {
  if (!html) return [new TextRun({ text: "" })];
  
  // Split by <br> tags to handle line breaks
  const parts = html.split(/<br\s*\/?>/gi);
  const textRuns: TextRun[] = [];
  
  parts.forEach((part, index) => {
    if (index > 0) {
      textRuns.push(new TextRun({ text: "\n", break: 1 }));
    }
    
    // Remove HTML tags and convert entities
    const cleanText = part
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ') // Convert &nbsp; to space
      .replace(/&amp;/g, '&') // Convert &amp; to &
      .replace(/&lt;/g, '<') // Convert &lt; to <
      .replace(/&gt;/g, '>') // Convert &gt; to >
      .replace(/&quot;/g, '"') // Convert &quot; to "
      .trim();
    
    if (cleanText) {
      textRuns.push(new TextRun({ 
        text: cleanText,
        font: "Arial"
      }));
    }
  });
  
  return textRuns.length > 0 ? textRuns : [new TextRun({ text: "" })];
};

// Helper function to convert HTML to plain text (for simple cases)
const convertHtmlToText = (html: string): string => {
  if (!html) return "";
  
  return html
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> and <br /> to line breaks
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Convert &nbsp; to space
    .replace(/&amp;/g, '&') // Convert &amp; to &
    .replace(/&lt;/g, '<') // Convert &lt; to <
    .replace(/&gt;/g, '>') // Convert &gt; to >
    .replace(/&quot;/g, '"') // Convert &quot; to "
    .trim();
};
import { v4 as uuidv4 } from 'uuid';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { saveShow, getShowWithItems, getShowsByDate } from '@/lib/supabase/shows';
import { DropResult } from '@hello-pangea/dnd';
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
  const [isBackupShow, setIsBackupShow] = useState(false);
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
        console.log('showDate object:', showDate);
        console.log('showDate.toISOString():', showDate.toISOString());
        console.log('showDate.getTime():', showDate.getTime());
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
      console.log('Processing new lineup state:', state);
      
      let displayName;
      if (state.generatedShowName) {
        displayName = state.generatedShowName;
      } else {
        displayName = state.showName === state.hostName
          ? state.hostName
          : `${state.showName} עם ${state.hostName}`;
      }
      
      console.log('Setting show name:', displayName);
      console.log('Setting show time:', state.time);
      console.log('Setting show date:', state.date);
      console.log('Setting show date (ISO):', state.date?.toISOString());
      console.log('Setting show date (day of week):', state.date?.getDay());
      
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
          console.log('Loading show with ID:', showId);
          const result = await getShowWithItems(showId);
          console.log('Result from getShowWithItems:', result);
          
          if (!result) {
            toast.error('התוכנית לא נמצאה');
            navigate('/');
            return;
          }
          const { show, items: showItems } = result;
          console.log('Show data:', show);
          console.log('Show items count:', showItems?.length);
          console.log('Show items:', showItems);
          
          if (show) {
            setShowName(show.name);
            setShowTime(show.time);
            setShowDate(show.date ? new Date(show.date) : new Date());
            setIsBackupShow(show.is_backup || false);
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
            console.log('Setting items in state:', showItems);
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
        id: uuidv4(),
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
      
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('קישור לליינאפ הועתק ללוח');
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast.success('קישור לליינאפ הועתק ללוח');
        } else {
          // Last resort: show the URL to the user
          toast.error('לא ניתן להעתיק אוטומטית. הקישור: ' + shareUrl);
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback: show the URL to the user
      const shareUrl = `${window.location.origin}/print/${showId}${showMinutes ? '?minutes=true' : ''}`;
      toast.error('לא ניתן להעתיק אוטומטית. הקישור: ' + shareUrl);
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

  const handleExportWord = useCallback(async () => {
    if (!showId) {
      toast.error('נא לשמור את הליינאפ לפני יצירת Word');
      return;
    }

    try {
      // Create table rows
      const tableRows = [
        // Header row
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "פרטים", bold: true, size: 24, font: "Arial" })],
                alignment: AlignmentType.RIGHT
              })]
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "מרואיינ/ת", bold: true, size: 24, font: "Arial" })],
                alignment: AlignmentType.RIGHT
              })]
            }),
            ...(showMinutes ? [new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "דק'", bold: true, size: 24, font: "Arial" })],
                alignment: AlignmentType.CENTER
              })]
            })] : [])
          ]
        })
      ];

      // Add data rows
      items.forEach((item) => {
        if (!item.is_divider) {
          if (item.is_break) {
            tableRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: item.name, bold: true, size: 22, font: "Arial" })],
                      alignment: AlignmentType.CENTER
                    })],
                    columnSpan: showMinutes ? 3 : 2
                  })
                ]
              })
            );
          } else if (item.is_note) {
            tableRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: convertHtmlToTextRuns(item.details || ""),
                      alignment: AlignmentType.CENTER
                    })],
                    columnSpan: showMinutes ? 3 : 2
                  })
                ]
              })
            );
          } else {
            // Regular item
            tableRows.push(
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: convertHtmlToTextRuns(item.details || ""),
                      alignment: AlignmentType.RIGHT
                    })]
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [
                        new TextRun({ text: item.name, bold: true, size: 20, font: "Arial" }),
                        new TextRun({ text: "\n", break: 1 }),
                        new TextRun({ text: item.title || "", size: 18, font: "Arial" })
                      ],
                      alignment: AlignmentType.RIGHT
                    })]
                  }),
                  ...(showMinutes ? [new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({ text: item.duration?.toString() || "", size: 20, font: "Arial" })],
                      alignment: AlignmentType.CENTER
                    })]
                  })] : [])
                ]
              })
            );
          }
        }
      });

      // Add total minutes row if showMinutes is enabled
      if (showMinutes) {
        const totalMinutes = items.reduce((total, item) => total + (item.duration || 0), 0);
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: "סה״כ דקות", bold: true, size: 22, font: "Arial" })],
                  alignment: AlignmentType.RIGHT
                })],
                columnSpan: 2
              }),
              new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: totalMinutes.toString(), bold: true, size: 22, font: "Arial" })],
                  alignment: AlignmentType.CENTER
                })]
              })
            ]
          })
        );
      }

      // Create the document with RTL support
      const doc = new Document({
        sections: [{
          children: [
            // Title
            new Paragraph({
              children: [new TextRun({ text: showName, bold: true, size: 36, font: "Arial" })],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({
              children: [new TextRun({ text: `${showTime} // ${format(showDate, 'dd.MM.yyyy')}`, size: 24, font: "Arial" })],
              alignment: AlignmentType.CENTER
            }),
            new Paragraph({ children: [new TextRun({ text: "" })] }), // Empty line
            
            // Table
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE }
            }),
            
            // Credits if available
            ...(editor?.getHTML() ? [
              new Paragraph({ children: [new TextRun({ text: "" })] }), // Empty line
              new Paragraph({
                children: convertHtmlToTextRuns(editor.getHTML()),
                alignment: AlignmentType.CENTER
              })
            ] : [])
          ]
        }]
      });

      // Generate and download the document
      const blob = await Packer.toBlob(doc);
      const fileName = `${showName || 'lineup'}-${format(showDate, 'dd-MM-yyyy')}.docx`;
      saveAs(blob, fileName);
      
      toast.success('הקובץ Word נוצר בהצלחה');
    } catch (error) {
      console.error('Error creating Word document:', error);
      toast.error('שגיאה ביצירת קובץ Word');
    }
  }, [showId, showName, showDate, showTime, items, showMinutes, editor]);

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
      id: uuidv4(),
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
          onExportWord={handleExportWord}
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
          isBackupShow={isBackupShow}
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
              יש ך שינויים שלא נשמרו. האם ברצונך לשמור אותם לפני החזרה ללוח הבקרה?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate('/')}>
              התעלם משינויים
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!isSaving) {
                  await handleSave();
                  navigate('/');
                }
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
