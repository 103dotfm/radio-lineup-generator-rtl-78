
import React, { memo } from 'react';
import { Editor } from '@tiptap/react';
import HeaderSection from './editor/HeaderSection';
import MainContent from './editor/MainContent';
import FooterSection from './editor/FooterSection';

interface LineupEditorProps {
  showName: string;
  showTime: string;
  showDate: Date | undefined;
  items: any[];
  editor: Editor | null;
  editingItem: any;
  onNameChange: (name: string) => void;
  onTimeChange: (time: string) => void;
  onDateChange: (date: Date | undefined) => void;
  onSave: () => Promise<void>;
  onShare: () => Promise<void>;
  onPrint: () => void;
  onExportPDF: () => void;
  onAdd: (item: any) => void;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => Promise<void>;
  onBreakTextChange: (id: string, text: string) => void;
  onDragEnd: (result: any) => void;
  handleNameLookup: (name: string) => Promise<any>;
  onBackToDashboard: () => void;
  onDetailsChange: (id: string, details: string) => void;
}

// Using React.memo to prevent unnecessary re-renders
const LineupEditor = memo(({
  showName,
  showTime,
  showDate,
  items,
  editor,
  editingItem,
  onNameChange,
  onTimeChange,
  onDateChange,
  onSave,
  onShare,
  onPrint,
  onExportPDF,
  onAdd,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDragEnd,
  handleNameLookup,
  onBackToDashboard,
  onDetailsChange,
}: LineupEditorProps) => {
  return (
    <div className="print:hidden lineup-editor">
      <HeaderSection 
        showName={showName}
        showDate={showDate}
        onBackToDashboard={onBackToDashboard}
      />
      
      <MainContent
        showName={showName}
        showTime={showTime}
        showDate={showDate}
        items={items}
        editor={editor}
        editingItem={editingItem}
        onNameChange={onNameChange}
        onTimeChange={onTimeChange}
        onDateChange={onDateChange}
        onSave={onSave}
        onShare={onShare}
        onPrint={onPrint}
        onExportPDF={onExportPDF}
        onAdd={onAdd}
        onDelete={onDelete}
        onDurationChange={onDurationChange}
        onEdit={onEdit}
        onBreakTextChange={onBreakTextChange}
        onDragEnd={onDragEnd}
        handleNameLookup={handleNameLookup}
        onBackToDashboard={onBackToDashboard}
        onDetailsChange={onDetailsChange}
      />

      <FooterSection />
    </div>
  );
});

// Add display name for debugging
LineupEditor.displayName = 'LineupEditor';

export default LineupEditor;
