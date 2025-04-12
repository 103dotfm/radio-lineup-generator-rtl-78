
import React from 'react';
import { Editor } from '@tiptap/react';
import { Card, CardContent } from "@/components/ui/card";
import LineupTable from '../LineupTable';
import LineupForm from '@/components/LineupForm';
import ShowCredits from '@/components/show/ShowCredits';

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
  onDividerAdd?: () => void;
  nextShowName?: string;
  nextShowHost?: string;
  onRemoveNextShowLine?: () => void;
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
  onAdd,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDragEnd,
  handleNameLookup,
  onDetailsChange,
  showMinutes,
  onToggleMinutes,
  onDividerAdd,
  nextShowName,
  nextShowHost,
  onRemoveNextShowLine
}: MainContentProps) => {
  console.log('MainContent rendering with date:', showDate, 'and time:', showTime);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardContent className="p-6">
            <LineupTable 
              items={items}
              showMinutes={showMinutes}
              onDelete={onDelete}
              onEdit={onEdit}
              onDurationChange={onDurationChange}
              onBreakTextChange={onBreakTextChange}
              onDragEnd={onDragEnd}
              onDetailsChange={onDetailsChange}
              onToggleMinutes={onToggleMinutes}
              onDividerAdd={onDividerAdd}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <LineupForm
              onAdd={onAdd}
              onNameChange={handleNameLookup}
              editingItem={editingItem}
              onBackToDashboard={() => {}}
              onDividerAdd={onDividerAdd}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <ShowCredits 
            editor={editor} 
            nextShowName={nextShowName}
            nextShowHost={nextShowHost}
            onRemoveNextShowLine={onRemoveNextShowLine}
            showDate={showDate}
            showTime={showTime}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default MainContent;
