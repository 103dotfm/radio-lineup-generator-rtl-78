
import React from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface BasicEditorProps {
  content: string;
  onChange?: (html: string) => void;
  className?: string;
  placeholder?: string;
  align?: 'right' | 'center';
  rtl?: boolean;
}

const BasicEditor = ({ 
  content, 
  onChange, 
  className, 
  placeholder = '', 
  align = 'right',
  rtl = true 
}: BasicEditorProps) => {
  const [linkUrl, setLinkUrl] = React.useState('');
  const [linkOpen, setLinkOpen] = React.useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TextAlign.configure({
        types: ['paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: rtl ? 'right' : 'left',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm focus:outline-none ${rtl ? 'text-right' : 'text-left'} dir-${rtl ? 'rtl' : 'ltr'} ${className || ''}`,
        placeholder,
        dir: rtl ? 'rtl' : 'ltr',
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

  // Set link
  const setLink = React.useCallback(() => {
    if (!editor) return;
    
    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
    setLinkUrl('');
    setLinkOpen(false);
  }, [editor, linkUrl]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md bg-white detailsEditor" dir={rtl ? 'rtl' : 'ltr'}>
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
        
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLinkOpen(true)}
              data-active={editor.isActive('link')}
              className={editor.isActive('link') ? 'bg-muted' : ''}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" side="bottom" align="start">
            <div className="flex flex-col gap-2">
              <Input
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setLink();
                  }
                }}
              />
              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => setLinkOpen(false)}>
                  ביטול
                </Button>
                <Button variant="default" size="sm" onClick={setLink}>
                  {editor.isActive('link') ? 'עדכן קישור' : 'הוסף קישור'}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
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
      </div>
      <EditorContent 
        editor={editor} 
        className="p-4" 
        dir={rtl ? 'rtl' : 'ltr'} 
      />
    </div>
  );
};

export default BasicEditor;
