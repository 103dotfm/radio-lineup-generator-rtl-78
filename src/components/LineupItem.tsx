import React, { useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useAuth } from '../contexts/AuthContext';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import BreakItem from './lineup/BreakItem';
import NoteItem from './lineup/NoteItem';
import RegularItem from './lineup/RegularItem';
import DividerItem from './lineup/DividerItem';

interface LineupItemProps {
  id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  is_break?: boolean;
  is_note?: boolean;
  is_divider?: boolean;
  interviewees?: Array<{
    id: string;
    item_id: string;
    name: string;
    title?: string;
    phone?: string;
    duration?: number;
    created_at?: string;
  }>;
  index: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => Promise<void>;
  onBreakTextChange: (id: string, text: string) => void;
  onDetailsChange?: (id: string, details: string) => void;
  showMinutes?: boolean;
  isBackupShow?: boolean;
}

const LineupItem = ({
  id,
  name,
  title,
  details,
  phone,
  duration,
  is_break,
  is_note,
  is_divider,
  interviewees,
  index,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDetailsChange,
  showMinutes = false,
  isBackupShow
}: LineupItemProps) => {
  const { isAuthenticated } = useAuth();

  const editor = useEditor({
    extensions: [StarterKit],
    content: details || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm focus:outline-none min-h-[50px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      if (onDetailsChange) {
        onDetailsChange(id, editor.getHTML());
      }
    },
  });

  useEffect(() => {
    if (editor && details !== editor.getHTML()) {
      editor.commands.setContent(details || '');
    }
  }, [editor, details]);

  // Explicitly check and convert the boolean flags for safety
  const isDivider = Boolean(is_divider);
  const isBreak = Boolean(is_break); 
  const isNote = Boolean(is_note);

  // Dividers are handled separately in LineupTable
  if (isDivider) {
    return null;
  }

  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <tr
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${isBreak ? 'bg-gray-50' : ''} ${isNote ? 'bg-yellow-50' : ''}`}
        >
          {isBreak ? (
            <BreakItem
              id={id}
              name={name}
              duration={duration}
              onDelete={onDelete}
              onDurationChange={onDurationChange}
              onBreakTextChange={onBreakTextChange}
              isAuthenticated={isAuthenticated}
              showMinutes={showMinutes}
              isBackupShow={isBackupShow}
            />
          ) : isNote ? (
            <NoteItem
              id={id}
              editor={editor}
              duration={duration}
              onDelete={onDelete}
              onDurationChange={onDurationChange}
              onEdit={onEdit}
              isAuthenticated={isAuthenticated}
              showMinutes={showMinutes}
              isBackupShow={isBackupShow}
            />
          ) : (
            <RegularItem
              id={id}
              name={name}
              title={title}
              details={details}
              phone={phone}
              duration={duration}
              interviewees={interviewees}
              onDelete={onDelete}
              onDurationChange={onDurationChange}
              onEdit={onEdit}
              isAuthenticated={isAuthenticated}
              showMinutes={showMinutes}
              isBackupShow={isBackupShow}
            />
          )}
        </tr>
      )}
    </Draggable>
  );
};

export default LineupItem;
