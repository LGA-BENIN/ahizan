import React, { useState, useEffect, useCallback } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';
import { useEditor } from '../hooks/EditorContext';
import { fetchGraphQL } from '../../lib/utils';

interface CodeEditorProps {
    section: any;
    sectionIndex: number;
    onSaveSuccess: () => void;
}

const AUTO_SAVE_HABILLAGE = `
  mutation AutoSaveHabillage($presetId: ID!, $sectionsJson: String!) {
    autoSaveHabillage(presetId: $presetId, sectionsJson: $sectionsJson) {
      id name sectionsJson changeHistory historyPointer updatedAt
    }
  }
`;

export const CodeEditor = ({ section, sectionIndex, onSaveSuccess }: CodeEditorProps) => {
    const { setIsSaving, setSaveStatus, isSaving, activeHabillage, setActiveHabillage, setPreviewVersion, canUndo, canRedo } = useEditor();
    const [code, setCode] = useState('{}');
    const [isValid, setIsValid] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);
    const [savedCode, setSavedCode] = useState('{}');
    const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (section?.dataJson) {
            try {
                const formatted = JSON.stringify(JSON.parse(section.dataJson), null, 2);
                setCode(formatted);
                setSavedCode(formatted);
                setHasChanges(false);
                setIsValid(true);
            } catch (e) {
                setCode(section.dataJson);
                setSavedCode(section.dataJson);
                setHasChanges(false);
                setIsValid(false);
            }
        } else {
            setCode('// Aucune section sélectionnée ou aucune donnée disponible');
            setSavedCode('');
            setHasChanges(false);
        }
    }, [section]);

    // Validate JSON on every change + trigger auto-save debounce
    const handleChange = (newCode: string) => {
        setCode(newCode);
        setHasChanges(newCode !== savedCode);
        let valid = false;
        try {
            JSON.parse(newCode);
            valid = true;
        } catch {
            valid = false;
        }
        setIsValid(valid);

        // Auto-save debounce: save 1.5s after last change if valid
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        if (valid && activeHabillage) {
            const timer = setTimeout(() => {
                handleAutoSave(newCode);
            }, 1500);
            setAutoSaveTimer(timer);
        }
    };

    const handleAutoSave = async (codeToSave?: string) => {
        const currentCode = codeToSave || code;
        if (!section || !activeHabillage) return;
        try {
            const parsed = JSON.parse(currentCode);
            const sections = JSON.parse(activeHabillage.sectionsJson);
            const idx = sectionIndex >= 0 && sectionIndex < sections.length ? sectionIndex : sections.findIndex((s: any) => s.type === section.type);
            if (idx >= 0) {
                sections[idx].dataJson = parsed;
            } else {
                sections.push({ type: section.type, dataJson: parsed, order: sections.length, isActive: true });
            }
            const sectionsJson = JSON.stringify(sections);
            const result = await fetchGraphQL(AUTO_SAVE_HABILLAGE, {
                presetId: activeHabillage.id,
                sectionsJson,
            });
            if (result?.autoSaveHabillage) {
                setActiveHabillage(result.autoSaveHabillage);
            }
            setPreviewVersion(Date.now());
            const formattedCode = JSON.stringify(parsed, null, 2);
            setSavedCode(formattedCode);
            setHasChanges(false);
            setSaveStatus('✅ Auto-sauvegardé !');
        } catch (err: any) {
            setSaveStatus('❌ Erreur auto-save : ' + err.message);
        }
    };

    // Manual save via Ctrl+S (immediate, not debounced)
    const handleSave = async () => {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        await handleAutoSave();
    };

    // Auto-format JSON
    const handleFormat = () => {
        try {
            const parsed = JSON.parse(code);
            const formatted = JSON.stringify(parsed, null, 2);
            setCode(formatted);
            setIsValid(true);
        } catch {
            // Can't format invalid JSON
        }
    };

    // Keyboard shortcut: Ctrl+S to save
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (section && isValid && hasChanges && !isSaving) {
                handleSave();
            }
        }
    }, [section, isValid, hasChanges, isSaving, code, savedCode]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!section) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--builder-text-muted)', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '2rem', opacity: 0.3 }}>⌨️</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Sélectionnez une section pour modifier son code</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Choisissez un composant dans la barre latérale</div>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
            {/* Header Bar */}
            <div style={{ 
                padding: '0.5rem 1rem', 
                background: '#252526', 
                borderBottom: '1px solid #3d3d3d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                        color: '#e2e8f0', 
                        fontSize: '0.7rem', 
                        fontWeight: 700,
                        fontFamily: 'monospace'
                    }}>
                        {section.type}
                    </span>
                    <span style={{ color: '#475569', fontSize: '0.6rem' }}>
                        {section.id?.substring(0, 8)}...
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* Validation indicator */}
                    <span style={{ 
                        fontSize: '0.6rem', 
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isValid ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: isValid ? '#10b981' : '#ef4444',
                    }}>
                        {isValid ? '✓ JSON VALIDE' : '✗ INVALIDE'}
                    </span>
                    {/* Auto-save indicator */}
                    <span style={{ 
                        fontSize: '0.6rem', 
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: hasChanges ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: hasChanges ? '#f59e0b' : '#10b981',
                    }}>
                        {hasChanges ? '⏳ MODIFS EN COURS...' : '✅ AUTO-SAUVEGARDÉ'}
                    </span>
                    {/* Format button */}
                    <button 
                        onClick={handleFormat}
                        disabled={!isValid}
                        style={{ 
                            padding: '0.3rem 0.6rem', 
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            background: '#374151',
                            color: isValid ? '#e2e8f0' : '#6b7280',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isValid ? 'pointer' : 'default',
                        }}
                    >
                        FORMATER
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
                <Editor
                    value={code}
                    onValueChange={handleChange}
                    highlight={code => highlight(code, languages.json, 'json')}
                    padding={16}
                    style={{
                        fontFamily: '"Fira Code", "Fira Mono", "Cascadia Code", monospace',
                        fontSize: 13,
                        lineHeight: 1.6,
                        minHeight: '100%',
                        outline: 'none',
                        color: '#f8fafc',
                        backgroundColor: 'transparent',
                    }}
                    textareaClassName="code-editor-textarea"
                />
            </div>
            
            {/* Footer Bar */}
            <div style={{
                padding: '0.35rem 1rem',
                background: '#252526',
                borderTop: '1px solid #3d3d3d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#64748b',
                fontSize: '0.6rem',
                fontWeight: 500,
            }}>
                <span>JSON • {code.split('\n').length} lignes • {code.length} caract.</span>
                <span>Auto-sauvegarde 1.5s • Ctrl+S pour sauvegarde immédiate</span>
            </div>
            
            <style>{`
                .code-editor-textarea:focus { outline: none !important; }
            `}</style>
        </div>
    );
};
