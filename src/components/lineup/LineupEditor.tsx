import React from 'react';
import LineupForm from '../LineupForm';
import LineupTable from './LineupTable';
import ShowHeader from '../show/ShowHeader';
import ShowCredits from '../show/ShowCredits';
import { Editor } from '@tiptap/react';
import { format } from 'date-fns';

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
  onEdit: (id: string) => void;
  onBreakTextChange: (id: string, text: string) => void;
  onDragEnd: (result: any) => void;
  handleNameLookup: (name: string) => Promise<any>;
  onBackToDashboard: () => void;
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
}: LineupEditorProps) => {
  return (
    <div className="print:hidden">
      <h1 className="text-3xl font-bold mb-8 text-right">ליינאפ רדיו</h1>
      
      <ShowHeader
        showName={showName}
        showTime={showTime}
        showDate={showDate}
        onNameChange={onNameChange}
        onTimeChange={onTimeChange}
        onDateChange={onDateChange}
        onSave={onSave}
        onShare={onShare}
        onPrint={onPrint}
        onExportPDF={onExportPDF}
      />

      <div>
        <ShowCredits editor={editor} />
      </div>

      <div className="mb-8">
        <LineupForm 
          onAdd={onAdd} 
          onNameChange={handleNameLookup}
          editingItem={editingItem}
          onBackToDashboard={onBackToDashboard}
        />
      </div>

      <LineupTable
        items={items}
        onDelete={onDelete}
        onDurationChange={onDurationChange}
        onEdit={onEdit}
        onBreakTextChange={onBreakTextChange}
        onDragEnd={onDragEnd}
      />

      <div className="flex justify-center mt-12 mb-8">
        <img src="/lovable-uploads/a330123d-e032-4391-99b3-87c3c7ce6253.png" alt="103FM" className="h-12 opacity-50" />
      </div>
    </div>
  );
};

export default LineupEditor;