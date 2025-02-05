import React from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Underline } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface BasicEditorProps {
  content: string;
  onChange?: (html: string) => void;
  className?: string;
  placeholder?: string;
}

const BasicEditor = ({ content, onChange, className, placeholder }: BasicEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit.configure({
      heading: false,
      paste: false,
    })],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm focus:outline-none ${className || ''}`,
        placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md">
      <div className="border-b p-2 flex gap-1 bg-muted/50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          data-active={editor.isActive('bold')}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          data-active={editor.isActive('italic')}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          data-active={editor.isActive('underline')}
          className={editor.isActive('underline') ? 'bg-muted' : ''}
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} className="p-4" />
    </div>
  );
};

export default BasicEditor;