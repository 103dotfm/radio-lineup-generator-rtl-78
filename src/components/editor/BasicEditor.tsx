
import React from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, Link as LinkIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";

export interface BasicEditorProps {
  content: string;
  onChange?: (html: string) => void;
  className?: string;
  placeholder?: string;
  align?: 'left' | 'right' | 'center';
  showTextAlign?: boolean;
}

const BasicEditor = ({ content, onChange, className = '', placeholder = '', align = 'right', showTextAlign = false }: BasicEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Link.configure({
        openOnClick: true,
      }),
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: align,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm focus:outline-none ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} ${className}`,
        placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  // Update editor content when the content prop changes, but only if it's different
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border rounded-md bg-white detailsEditor">
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
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={setLink}
          data-active={editor.isActive('link')}
          className={editor.isActive('link') ? 'bg-muted' : ''}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <div className="flex-1"></div>
        {showTextAlign && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              data-active={editor.isActive({ textAlign: 'left' })}
              className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              data-active={editor.isActive({ textAlign: 'center' })}
              className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              data-active={editor.isActive({ textAlign: 'right' })}
              className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <EditorContent editor={editor} className={`p-4 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`} />
    </div>
  );
};

export default BasicEditor;
