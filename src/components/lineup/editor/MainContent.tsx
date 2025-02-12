import React from 'react';
import LineupForm from '../../LineupForm';
import LineupTable from '../LineupTable';
import ShowHeader from '../../show/ShowHeader';
import ShowCredits from '../../show/ShowCredits';
import { Editor } from '@tiptap/react';

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
}

const MainContent = ({
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
}: MainContentProps) => {
  return (
    <>
      <div className="lineup-editor-show-header">
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
      </div>

      <div className="lineup-editor-credits">
        <ShowCredits editor={editor} />
      </div>

      <h2 className="additemH2">הוספת אייטם לליינאפ:</h2>
      <div className="lineup-editor-form mb-8">
        <LineupForm 
          onAdd={onAdd} 
          onNameChange={handleNameLookup}
          editingItem={editingItem}
          onBackToDashboard={onBackToDashboard}
        />
      </div>

      <div className="lineup-editor-table">
        <LineupTable
          items={items}
          onDelete={onDelete}
          onDurationChange={onDurationChange}
          onEdit={onEdit}
          onBreakTextChange={onBreakTextChange}
          onDetailsChange={onDetailsChange}
          onDragEnd={onDragEnd}
        />
      </div>
    </>
  );
};

export default MainContent;