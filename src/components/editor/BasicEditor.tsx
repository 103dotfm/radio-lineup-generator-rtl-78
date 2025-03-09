
import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { 
  Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, 
  AlignLeft, AlignCenter, AlignRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BasicEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rtl?: boolean;
}

const BasicEditor: React.FC<BasicEditorProps> = ({ 
  content, 
  onChange, 
  placeholder = 'כתוב כאן...',
  rtl = false 
}) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: rtl ? 'right' : 'left',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: `prose prose-sm focus:outline-none w-full p-4 ${rtl ? 'text-right' : 'text-left'}`,
        dir: rtl ? 'rtl' : 'ltr',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: `prose prose-sm focus:outline-none w-full p-4 ${rtl ? 'text-right' : 'text-left'}`,
            dir: rtl ? 'rtl' : 'ltr',
          },
        },
      });

      // Set default text alignment based on RTL
      const defaultAlign = rtl ? 'right' : 'left';
      editor.chain().focus().setTextAlign(defaultAlign).run();
    }
  }, [rtl, editor]);

  const setLink = () => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setShowLinkInput(true);
  };

  const confirmLink = () => {
    if (!editor) return;
    
    if (linkUrl === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .setLink({ href: linkUrl, target: '_blank' })
        .run();
    }
    
    setShowLinkInput(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-md relative" dir={rtl ? 'rtl' : 'ltr'}>
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex items-center bg-white shadow rounded border p-1">
            <Button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              variant={editor.isActive('bold') ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              variant={editor.isActive('italic') ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 ml-1"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              variant={editor.isActive('underline') ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 ml-1"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={setLink}
              variant={editor.isActive('link') ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 ml-1"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 ml-1"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 ml-1"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 ml-1"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
        </BubbleMenu>
      )}

      {showLinkInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">הכנס קישור</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="border rounded p-2 w-full mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-2 space-x-reverse">
              <Button
                type="button"
                onClick={() => setShowLinkInput(false)}
                variant="outline"
              >
                ביטול
              </Button>
              <Button type="button" onClick={confirmLink}>
                אישור
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white">
        <div className="flex border-b p-2">
          <Button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            variant={editor.isActive('bold') ? 'default' : 'outline'}
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            variant={editor.isActive('italic') ? 'default' : 'outline'}
            size="sm"
            className="h-8 w-8 p-0 mr-1"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            variant={editor.isActive('underline') ? 'default' : 'outline'}
            size="sm"
            className="h-8 w-8 p-0 mr-1"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={setLink}
            variant={editor.isActive('link') ? 'default' : 'outline'}
            size="sm"
            className="h-8 w-8 p-0 mr-1"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <div className="ml-auto flex">
            <Button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 ml-1"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 ml-1"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0 ml-1"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default BasicEditor;
