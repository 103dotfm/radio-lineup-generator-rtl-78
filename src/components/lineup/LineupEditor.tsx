import React from 'react';
import LineupForm from '../LineupForm';
import LineupTable from './LineupTable';
import ShowHeader from '../show/ShowHeader';
import ShowCredits from '../show/ShowCredits';
import { Editor } from '@tiptap/react';

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
  onAdd: (item: any) => void;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string) => void;
  onBreakTextChange: (id: string, text: string) => void;
  onDragEnd: (result: any) => void;
  handleNameLookup: (name: string) => Promise<any>;
}

const LineupEditor = ({
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
  onAdd,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDragEnd,
  handleNameLookup,
}: LineupEditorProps) => {
  const handleSave = async () => {
    await onSave();
  };

  const handleShare = async () => {
    if (window.print) {
      window.print();
    }
  };

  const handlePrint = async () => {
    if (window.print) {
      window.print();
    }
  };

  const handleExportPDF = async () => {
    if (window.print) {
      window.print();
    }
  };

  return (
    <div className="print:hidden">
      <ShowHeader
        showName={showName}
        showTime={showTime}
        showDate={showDate}
        onNameChange={onNameChange}
        onTimeChange={onTimeChange}
        onDateChange={onDateChange}
        onSave={handleSave}
        onShare={handleShare}
        onPrint={handlePrint}
        onExportPDF={handleExportPDF}
      />

      <div>
        <ShowCredits editor={editor} />
      </div>

      <div className="mb-8">
        <LineupForm 
          onAdd={onAdd} 
          onNameChange={handleNameLookup}
          editingItem={editingItem}
        />
      </div>

      <LineupTable
        items={items}
        onDelete={onDelete}
        onDurationChange={onDurationChange}
        onEdit={onEdit}
        onBreakTextChange={onBreakTextChange}
        onDragEnd={onDragEnd}
        showActions={false}
      />
    </div>
  );
};

export default LineupEditor;