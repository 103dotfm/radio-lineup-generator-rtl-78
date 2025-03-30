
import React, { useEffect } from 'react';
import { Draggable } from 'react-beautiful-dnd';
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
  index: number;
  onDelete: (id: string) => void;
  onDurationChange: (id: string, duration: number) => void;
  onEdit: (id: string, updatedItem: any) => Promise<void>;
  onBreakTextChange: (id: string, text: string) => void;
  onDetailsChange?: (id: string, details: string) => void;
  showMinutes?: boolean;
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
  index,
  onDelete,
  onDurationChange,
  onEdit,
  onBreakTextChange,
  onDetailsChange,
  showMinutes = false
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

  // Debug: Explicitly check and convert the boolean flags
  const isDivider = is_divider === true;
  const isBreak = is_break === true; 
  const isNote = is_note === true;

  // Debug: Log the exact values coming into the component including explicit conversions
  console.log(`LineupItem ${id} (${name || 'unnamed'}) render - raw props:`, { 
    is_break, 
    is_note, 
    is_divider,
    is_break_type: typeof is_break,
    is_note_type: typeof is_note,
    is_divider_type: typeof is_divider,
    // Explicit boolean conversions for comparison
    isDivider,
    isBreak,
    isNote
  });
  
  // Debug: Log the item properties to help diagnose issues
  console.log(`LineupItem ${id} (${name || 'unnamed'}) render:`, { 
    is_break: isBreak, 
    is_note: isNote, 
    is_divider: isDivider,
    item_type: isDivider ? 'divider' : isBreak ? 'break' : isNote ? 'note' : 'regular'
  });

  // Ensure we check explicitly for is_divider === true - This is crucial!
  if (isDivider) {
    console.log(`Item ${id} (${name || 'unnamed'}) identified as divider, returning null`);
    return null; // Dividers are handled separately in LineupTable
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
              name={name || ''}
              duration={duration}
              onDelete={onDelete}
              onDurationChange={onDurationChange}
              onBreakTextChange={onBreakTextChange}
              isAuthenticated={isAuthenticated}
              showMinutes={showMinutes}
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
            />
          ) : (
            <RegularItem
              id={id}
              name={name || ''}
              title={title || ''}
              details={details || ''}
              phone={phone || ''}
              duration={duration}
              onDelete={onDelete}
              onDurationChange={onDurationChange}
              onEdit={onEdit}
              isAuthenticated={isAuthenticated}
              showMinutes={showMinutes}
            />
          )}
        </tr>
      )}
    </Draggable>
  );
};

export default LineupItem;
