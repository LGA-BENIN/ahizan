'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    Link as LinkIcon,
    Unlink,
    Image as ImageIcon,
    Undo,
    Redo,
    RemoveFormatting,
} from 'lucide-react';

interface TiptapEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
}

export function TiptapEditor({ value, onChange }: TiptapEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline font-medium hover:opacity-80',
                },
            }),
            Image.configure({
                allowBase64: true,
                HTMLAttributes: {
                    class: 'rounded-xl max-w-full my-4 border border-border shadow-sm',
                },
            }),
        ],
        content: value || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html === '<p></p>' ? '' : html);
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none min-h-[180px] max-h-[450px] overflow-y-auto p-4 focus:outline-none text-sm leading-relaxed text-foreground',
            },
        },
    });

    // Update content if value changes externally and doesn't match editor content
    React.useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            if (value === '' && editor.getHTML() === '<p></p>') return;
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    if (!editor) {
        return (
            <div className="h-48 border border-border rounded-xl bg-muted/20 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
                Chargement de l&apos;éditeur Tiptap...
            </div>
        );
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('Entrez l\'URL du lien :', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const addImage = () => {
        const url = window.prompt('Entrez l\'URL de l\'image (ou lien de l\'image) :');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    return (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/40 border-b border-border text-foreground">
                {/* Text Formatting */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('bold') ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Gras"
                >
                    <Bold className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('italic') ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Italique"
                >
                    <Italic className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('underline') ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Souligné"
                >
                    <UnderlineIcon className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('strike') ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Barré"
                >
                    <Strikethrough className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-border mx-1" />

                {/* Headings */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('heading', { level: 1 }) ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Titre 1"
                >
                    <Heading1 className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('heading', { level: 2 }) ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Titre 2"
                >
                    <Heading2 className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('heading', { level: 3 }) ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Titre 3"
                >
                    <Heading3 className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-border mx-1" />

                {/* Lists & Quotes */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('bulletList') ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Liste à puces"
                >
                    <List className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('orderedList') ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Liste numérotée"
                >
                    <ListOrdered className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('blockquote') ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Citation"
                >
                    <Quote className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-border mx-1" />

                {/* Links & Images */}
                <button
                    type="button"
                    onClick={setLink}
                    className={`p-1.5 rounded-lg text-xs hover:bg-muted transition ${editor.isActive('link') ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'}`}
                    title="Insérer un lien"
                >
                    <LinkIcon className="w-4 h-4" />
                </button>

                {editor.isActive('link') && (
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().unsetLink().run()}
                        className="p-1.5 rounded-lg text-xs hover:bg-muted text-red-500 transition"
                        title="Supprimer le lien"
                    >
                        <Unlink className="w-4 h-4" />
                    </button>
                )}

                <button
                    type="button"
                    onClick={addImage}
                    className="p-1.5 rounded-lg text-xs hover:bg-muted text-muted-foreground transition"
                    title="Insérer une image (URL)"
                >
                    <ImageIcon className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-border mx-1" />

                {/* Actions */}
                <button
                    type="button"
                    onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                    className="p-1.5 rounded-lg text-xs hover:bg-muted text-muted-foreground transition"
                    title="Effacer le formatage"
                >
                    <RemoveFormatting className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    className="p-1.5 rounded-lg text-xs hover:bg-muted text-muted-foreground transition disabled:opacity-30"
                    title="Annuler"
                >
                    <Undo className="w-4 h-4" />
                </button>

                <button
                    type="button"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    className="p-1.5 rounded-lg text-xs hover:bg-muted text-muted-foreground transition disabled:opacity-30"
                    title="Rétablir"
                >
                    <Redo className="w-4 h-4" />
                </button>
            </div>

            {/* Tiptap Content Area */}
            <EditorContent editor={editor} />
        </div>
    );
}
