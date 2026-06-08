import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import ResizeImage from 'tiptap-extension-resize-image';
import Youtube from '@tiptap/extension-youtube';
import { 
    Bold, Italic, Strikethrough, List, ListOrdered, 
    Link as LinkIcon, Image as ImageIcon, Upload as UploadIcon, Youtube as YoutubeIcon,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Heading1, Heading2, Heading3, Quote, Code
} from 'lucide-react';
import { getBackendBaseUrl } from '../../../lib/utils';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    onToggleSourceMode?: () => void;
}

const MenuBar = ({ editor, onToggleSourceMode }: { editor: any, onToggleSourceMode?: () => void }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    if (!editor) {
        return null;
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL du lien:', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    const addImageUrl = () => {
        const url = window.prompt('URL de l\'image (ou GIF):');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const addYoutube = () => {
        const url = window.prompt('URL de la vidéo YouTube:');
        if (url) {
            editor.commands.setYoutubeVideo({
                src: url,
                width: 640,
                height: 480,
            });
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const baseUrl = getBackendBaseUrl();
            const gqlUrl = `${baseUrl}/admin-api`;

            const gqlFormData = new FormData();
            const operations = {
                query: `mutation CreateCmsAsset($file: Upload!) {
                    createCmsAsset(file: $file) { id preview source }
                }`,
                variables: { file: null }
            };
            gqlFormData.append('operations', JSON.stringify(operations));
            gqlFormData.append('map', JSON.stringify({ '0': ['variables.file'] }));
            gqlFormData.append('0', file);

            const gqlRes = await fetch(gqlUrl, { method: 'POST', credentials: 'include', body: gqlFormData });
            const gqlData = await gqlRes.json();
            
            let url = '';
            if (!gqlData.errors && gqlData.data?.createCmsAsset) {
                const asset = gqlData.data.createCmsAsset;
                url = asset.preview || asset.source;
            } else {
                // Fallback REST
                const formData = new FormData();
                formData.append('file', file);
                const uploadUrl = `${baseUrl}/banner/upload`;
                const response = await fetch(uploadUrl, { method: 'POST', body: formData });
                if (response.ok) {
                    const data = await response.json();
                    url = data.url;
                }
            }

            if (url) {
                editor.chain().focus().setImage({ src: url }).run();
            } else {
                alert('Erreur lors du téléchargement de l\'image.');
            }
        } catch (err) {
            console.error('Upload error:', err);
            alert('Erreur lors du téléchargement.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const ToolbarButton = ({ onClick, isActive, disabled, children, title }: any) => (
        <button
            onClick={(e) => { e.preventDefault(); onClick(); }}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${
                isActive ? 'bg-[var(--builder-primary)] text-white' : 'text-[var(--builder-text)] hover:bg-[var(--builder-bg-subtle)]'
            }`}
            style={{ 
                border: 'none', cursor: 'pointer', 
                opacity: disabled ? 0.5 : 1, 
                backgroundColor: isActive ? 'var(--builder-primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--builder-text)'
            }}
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--builder-border)] bg-[#fafafa]">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} disabled={!editor.can().chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Gras">
                <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} disabled={!editor.can().chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italique">
                <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} disabled={!editor.can().chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Barré">
                <Strikethrough size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-[var(--builder-border)] mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Titre 1">
                <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Titre 2">
                <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Titre 3">
                <Heading3 size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-[var(--builder-border)] mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Liste à puces">
                <List size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Liste numérotée">
                <ListOrdered size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Citation">
                <Quote size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-[var(--builder-border)] mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Aligner à gauche">
                <AlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Centrer">
                <AlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Aligner à droite">
                <AlignRight size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} title="Justifier">
                <AlignJustify size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-[var(--builder-border)] mx-1" />

            <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Lien">
                <LinkIcon size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={addImageUrl} title="Image depuis URL">
                <ImageIcon size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Uploader une image depuis votre appareil" disabled={isUploading}>
                {isUploading ? <span style={{fontSize: '10px'}}>⏳</span> : <UploadIcon size={16} />}
            </ToolbarButton>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*,video/*,image/gif" onChange={handleFileUpload} />
            <ToolbarButton onClick={addYoutube} isActive={editor.isActive('youtube')} title="Vidéo YouTube">
                <YoutubeIcon size={16} />
            </ToolbarButton>
            
            <ToolbarButton 
                onClick={() => onToggleSourceMode ? onToggleSourceMode() : editor.chain().focus().toggleCodeBlock().run()} 
                isActive={onToggleSourceMode ? false : editor.isActive('codeBlock')} 
                title="Code Source HTML"
            >
                <Code size={16} />
            </ToolbarButton>
        </div>
    );
};

export function RichTextEditor({ value, onChange, onToggleSourceMode }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-[var(--builder-primary)] underline cursor-pointer',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            ResizeImage.configure({
                inline: true,
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full',
                },
            }),
            Youtube.configure({
                inline: false,
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sync external value changes (only if editor is empty or on mount)
    useEffect(() => {
        if (editor && value && editor.isEmpty) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    return (
        <div className="tiptap-container" style={{ 
            border: '1px solid var(--builder-border)', 
            borderRadius: '8px', 
            overflow: 'hidden',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '300px'
        }}>
            <MenuBar editor={editor} onToggleSourceMode={onToggleSourceMode} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }} className="tiptap-editor-content">
                <EditorContent editor={editor} />
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                .tiptap-editor-content .ProseMirror {
                    outline: none;
                    min-height: 250px;
                    font-size: 0.9rem;
                    line-height: 1.6;
                    color: #333;
                }
                .tiptap-editor-content .ProseMirror p {
                    margin-bottom: 1em;
                }
                .tiptap-editor-content .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; }
                .tiptap-editor-content .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; }
                .tiptap-editor-content .ProseMirror h3 { font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em; }
                .tiptap-editor-content .ProseMirror ul { list-style-type: disc; padding-left: 20px; margin-bottom: 1em; }
                .tiptap-editor-content .ProseMirror ol { list-style-type: decimal; padding-left: 20px; margin-bottom: 1em; }
                .tiptap-editor-content .ProseMirror blockquote { border-left: 3px solid #ccc; padding-left: 10px; color: #666; font-style: italic; }
                .tiptap-editor-content .ProseMirror img { max-width: 100%; height: auto; border-radius: 8px; }
                .tiptap-editor-content .ProseMirror pre { background: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace; }
                .tiptap-editor-content .ProseMirror p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder);
                    float: left;
                    color: #adb5bd;
                    pointer-events: none;
                    height: 0;
                }
            `}} />
        </div>
    );
}
