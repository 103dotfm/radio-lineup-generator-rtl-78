
import React, { memo } from 'react';
import { Editor } from '@tiptap/react';
import ShowHeader from '../../show/ShowHeader';
import ShowCredits from '../../show/ShowCredits';
import LineupForm from '../../LineupForm';
import LineupTable from '../LineupTable';

interface MainContentProps {
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
  showMinutes?: boolean;
  onToggleMinutes?: (show: boolean) => void;
}

// Using React.memo to prevent unnecessary re-renders
const MainContent = memo(({
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
  showMinutes,
  onToggleMinutes
}: MainContentProps) => {
  return (
    <main className="space-y-8">
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

      <div className="space-y-8">
        <ShowCredits editor={editor} />

        <LineupForm 
          onAdd={onAdd}
          onNameChange={handleNameLookup}
          onBackToDashboard={onBackToDashboard}
          editingItem={editingItem}
        />

        <LineupTable
          items={items}
          onDelete={onDelete}
          onDurationChange={onDurationChange}
          onEdit={onEdit}
          onBreakTextChange={onBreakTextChange}
          onDetailsChange={onDetailsChange}
          onDragEnd={onDragEnd}
          showMinutes={showMinutes}
          onToggleMinutes={onToggleMinutes}
        />
      </div>
    </main>
  );
});

// Add display name for debugging
MainContent.displayName = 'MainContent';

export default MainContent;
