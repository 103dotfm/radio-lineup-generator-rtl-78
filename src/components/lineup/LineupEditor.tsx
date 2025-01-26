import React from 'react';
import LineupForm from '../LineupForm';
import LineupTable from './LineupTable';
import ShowHeader from '../show/ShowHeader';
import ShowCredits from '../show/ShowCredits';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

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
  onBack: () => void;
  onShare: () => void;
  onPrint: () => void;
  onExportPDF: () => void;
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
  onBack,
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
}: LineupEditorProps) => {
  return (
    <div className="print:hidden">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">ליינאפ רדיו</h1>
        <Button variant="outline" onClick={onBack}>
          <ArrowRight className="ml-2 h-4 w-4" />
          חזרה ללוח הבקרה
        </Button>
      </div>
      
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