
import React from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { DragDropContext } from 'react-beautiful-dnd';
import ShowCredits from '@/components/show/ShowCredits';

// Import UI components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Import child components
import LineupTable from '../LineupTable';
import FormActions from '../form/FormActions';

interface MainContentProps {
  showName: string;
  showTime: string;
  showDate: Date | undefined;
  items: any[];
  editor: any;
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
  onToggleMinutes,
  onDividerAdd,
  nextShowName,
  nextShowHost,
  onRemoveNextShowLine
}: MainContentProps) => {
  const { register } = useForm();

  // Create a mock function for form submissions that will be passed to FormActions
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onAdd) {
      // This is just a placeholder since the actual form submission is handled elsewhere
      console.log("Form submission handled by parent component");
    }
  };

  return (
    <div className="mb-8">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">פרטי התוכנית</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="show-name" className="block text-sm font-medium mb-1">
                שם התוכנית
              </label>
              <Input
                id="show-name"
                type="text" 
                {...register('showName')}
                value={showName}
                onChange={(e) => onNameChange(e.target.value)}
                className="text-right"
              />
            </div>
            <div>
              <label htmlFor="show-time" className="block text-sm font-medium mb-1">
                שעת התוכנית
              </label>
              <Input
                id="show-time"
                type="time" 
                {...register('showTime')}
                value={showTime}
                onChange={(e) => onTimeChange(e.target.value)}
                className="text-right"
              />
            </div>
            <div>
              <label htmlFor="show-date" className="block text-sm font-medium mb-1">
                תאריך השידור
              </label>
              <Input
                id="show-date"
                type="date" 
                {...register('showDate')}
                value={showDate ? format(showDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : undefined;
                  onDateChange(date);
                }}
                className="text-right"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="lineup" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lineup" className="text-lg">ליינאפ</TabsTrigger>
          <TabsTrigger value="credits" className="text-lg">קרדיטים</TabsTrigger>
        </TabsList>
        <TabsContent value="lineup" className="mt-4">
          <DragDropContext onDragEnd={onDragEnd}>
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
              onDividerAdd={onDividerAdd}
            />
          </DragDropContext>
        </TabsContent>
        <TabsContent value="credits" className="mt-4">
          <ShowCredits 
            editor={editor} 
            nextShowName={nextShowName}
            nextShowHost={nextShowHost}
            onRemoveNextShowLine={onRemoveNextShowLine}
          />
        </TabsContent>
      </Tabs>

      <FormActions
        onSave={onSave}
        onShare={onShare}
        onPrint={onPrint}
        onExportPDF={onExportPDF}
        onAdd={onAdd}
        handleNameLookup={handleNameLookup}
        onSubmit={handleFormSubmit}
        onBreakAdd={() => console.log("Break add handled by parent")}
        onNoteAdd={() => console.log("Note add handled by parent")}
        onDividerAdd={onDividerAdd || (() => console.log("Divider add handled by parent"))}
        isEditing={!!editingItem}
      />
    </div>
  );
};

export default MainContent;
