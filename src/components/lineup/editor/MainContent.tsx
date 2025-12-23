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
  onExportWord: () => void;
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
  isBackupShow?: boolean;
  isSaving?: boolean;
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
  onExportWord,
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
  onRemoveNextShowLine,
  isBackupShow,
  isSaving
}: MainContentProps) => {
  // Count total items (excluding dividers for the count)
  const totalItems = items.filter(item => !item.is_divider).length;
  const showBottomForm = totalItems > 3;

  return (
    <main className="space-y-12 text-right animate-in fade-in duration-1000" dir="rtl">
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
        onExportWord={onExportWord}
        isSaving={isSaving}
      />

      <div className="space-y-12">
        <ShowCredits
          editor={editor}
          nextShowName={nextShowName}
          nextShowHost={nextShowHost}
          onRemoveNextShowLine={onRemoveNextShowLine}
          showDate={showDate}
          showTime={showTime}
        />

        {!isBackupShow && (
          <div className="relative">
            <div className="absolute -top-4 right-8 px-4 py-1 bg-primary text-[10px] font-black text-white rounded-full shadow-lg shadow-primary/20 z-10 uppercase tracking-widest">
              טופס הוספה
            </div>
            <LineupForm
              onAdd={onAdd}
              onNameChange={handleNameLookup}
              onBackToDashboard={onBackToDashboard}
              editingItem={editingItem}
              onDividerAdd={onDividerAdd}
            />
          </div>
        )}

        <div className="relative glass-card p-1 rounded-[2.5rem] bg-white/40 backdrop-blur-xl border-none shadow-2xl shadow-slate-200/50">
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
            isBackupShow={isBackupShow}
          />
        </div>

        {/* Duplicate form under the table when more than 3 items */}
        {showBottomForm && !isBackupShow && (
          <div className="mt-16 pt-12 border-t border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-grow bg-gradient-to-l from-slate-200 to-transparent"></div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">הוספת אייטם נוסף</h3>
              <div className="h-px flex-grow bg-gradient-to-r from-slate-200 to-transparent"></div>
            </div>
            <LineupForm
              onAdd={onAdd}
              onNameChange={handleNameLookup}
              onBackToDashboard={onBackToDashboard}
              editingItem={editingItem}
              onDividerAdd={onDividerAdd}
            />
          </div>
        )}
      </div>
    </main>
  );
});

// Add display name for debugging
MainContent.displayName = 'MainContent';

export default MainContent;
