
import React from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { Editor } from '@tiptap/react';
import ShowInfo from '../../show/ShowInfo';
import LineupActions from './LineupActions';
import LineupTable from '../LineupTable';
import LineupForm from '../../LineupForm';
import { Interviewee } from '@/types/show';

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
  onIntervieweesChange: (id: string, interviewees: Interviewee[]) => void;
  itemInterviewees: Record<string, Array<Interviewee>>;
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
  onIntervieweesChange,
  itemInterviewees,
}: MainContentProps) => {
  return (
    <div className="space-y-6">
      <ShowInfo
        showName={showName}
        showTime={showTime}
        showDate={showDate}
        onNameChange={onNameChange}
        onTimeChange={onTimeChange}
        onDateChange={onDateChange}
      />

      <LineupActions
        onSave={onSave}
        onShare={onShare}
        onPrint={onPrint}
        onExportPDF={onExportPDF}
      />

      <LineupForm
        onAdd={onAdd}
        onNameChange={handleNameLookup}
        onBackToDashboard={onBackToDashboard}
        editingItem={editingItem}
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <LineupTable
          items={items}
          onDelete={onDelete}
          onDurationChange={onDurationChange}
          onEdit={onEdit}
          onBreakTextChange={onBreakTextChange}
          onDetailsChange={onDetailsChange}
          onIntervieweesChange={onIntervieweesChange}
          itemInterviewees={itemInterviewees}
        />
      </DragDropContext>
    </div>
  );
};

export default MainContent;
