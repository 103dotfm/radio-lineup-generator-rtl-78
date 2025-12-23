import { lazy } from 'react';

// Lazy load TipTap rich text editor libraries
export const lazyRichTextEditor = {
  useEditor: () => import('@tiptap/react').then(module => ({ useEditor: module.useEditor })),
  StarterKit: () => import('@tiptap/starter-kit'),
  Link: () => import('@tiptap/extension-link'),
  TextAlign: () => import('@tiptap/extension-text-align'),
  Underline: () => import('@tiptap/extension-underline'),
  TipTapReact: () => import('@tiptap/react')
};

// Helper function to load rich text editor functionality
export const loadRichTextEditor = async () => {
  const [useEditor, StarterKit, Link, TextAlign, Underline, TipTapReact] = await Promise.all([
    lazyRichTextEditor.useEditor(),
    lazyRichTextEditor.StarterKit(),
    lazyRichTextEditor.Link(),
    lazyRichTextEditor.TextAlign(),
    lazyRichTextEditor.Underline(),
    lazyRichTextEditor.TipTapReact()
  ]);
  
  return {
    useEditor: useEditor.useEditor,
    StarterKit: StarterKit.default,
    Link: Link.default,
    TextAlign: TextAlign.default,
    Underline: Underline.default,
    ...TipTapReact
  };
};

