
import React, { useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { useAuth } from '../contexts/AuthContext';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import BreakItem from './lineup/BreakItem';
import NoteItem from './lineup/NoteItem';
import RegularItem from './lineup/RegularItem';
import { Interviewee } from '@/types/show';

interface LineupItemProps {
  id: string;
  name: string;
  title: string;
  details: string;
  phone: string;
  duration: number;
  is_break?: boolean;
  is_note?: boolean;
  index: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => Promise<void>;
  onBreakTextChange: (id: string, text: string) => void;
  onDetailsChange?: (id: string, details: string) => void;
  onIntervieweesChange?: (id: string, interviewees: Interviewee[]) => void;
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
  index,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDetailsChange,
  onIntervieweesChange
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
      editor.commands.setContent(details);
    }
  }, [editor, details]);

  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <tr
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${is_break ? 'bg-gray-50' : ''} ${is_note ? 'bg-yellow-50' : ''}`}
        >
          {is_break ? (
            <BreakItem
              id={id}
              name={name}
              duration={duration}
              onDelete={onDelete}
              onDurationChange={onDurationChange}
              onBreakTextChange={onBreakTextChange}
              isAuthenticated={isAuthenticated}
            />
          ) : is_note ? (
            <NoteItem
              id={id}
              editor={editor}
              duration={duration}
              onDelete={onDelete}
              onDurationChange={onDurationChange}
              onEdit={onEdit}
              isAuthenticated={isAuthenticated}
            />
          ) : (
            <RegularItem
              id={id}
              name={name}
              title={title}
              details={details}
              phone={phone}
              duration={duration}
              onDelete={onDelete}
              onDurationChange={onDurationChange}
              onEdit={onEdit}
              onIntervieweesChange={onIntervieweesChange!}
              isAuthenticated={isAuthenticated}
            />
          )}
        </tr>
      )}
    </Draggable>
  );
};

export default LineupItem;
