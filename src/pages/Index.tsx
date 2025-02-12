
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import LineupEditor from '../components/lineup/LineupEditor';
import PrintPreview from '../components/lineup/PrintPreview';
import { useLineupState } from '../hooks/useLineupState';
import { useLineupHandlers } from '../hooks/useLineupHandlers';
import { toast } from "sonner";

const Index = () => {
  const { id: showId } = useParams();
  const navigate = useNavigate();

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
    hasUnsavedChanges,
    showUnsavedDialog,
    setShowUnsavedDialog,
    isSaving,
    setIsSaving,
    initialState,
    setInitialState,
    editor
  } = useLineupState(showId);

  const {
    printRef,
    handleAdd,
    handleEdit,
    handleSave,
    handleShare,
    handleExportPDF,
    handleDetailsChange,
    handleDragEnd
  } = useLineupHandlers({
    items,
    setItems,
    showName,
    showTime,
    showDate,
    editor,
    editingItem,
    setEditingItem: () => null,
    setHasUnsavedChanges: () => null,
    isSaving,
    setIsSaving,
    setInitialState,
    showId
  });

  const handleBackToDashboard = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      navigate('/');
    }
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
          }}
          onTimeChange={(time) => {
            setShowTime(time);
          }}
          onDateChange={(date) => {
            setShowDate(date || new Date());
          }}
          onSave={handleSave}
          onShare={handleShare}
          onPrint={() => window.print()}
          onExportPDF={handleExportPDF}
          onAdd={handleAdd}
          onDelete={(id) => {
            setItems(items.filter(item => item.id !== id));
            toast.success('פריט נמחק בהצלחה');
          }}
          onDurationChange={(id, duration) => {
            setItems(items.map(item => 
              item.id === id ? { ...item, duration } : item
            ));
          }}
          onEdit={handleEdit}
          onBreakTextChange={(id, text) => {
            setItems(items.map(item => 
              item.id === id ? { ...item, name: text } : item
            ));
          }}
          onDragEnd={handleDragEnd}
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
