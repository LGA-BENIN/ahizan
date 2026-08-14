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
    const { setIsSaving, setSaveStatus, isSaving, activeHabillage, setActiveHabillage, setPreviewVersion } = useEditor();
    const [code, setCode] = useState('{}');
    const [isValid, setIsValid] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);
    const [savedCode, setSavedCode] = useState('{}');
    const [loadedSectionId, setLoadedSectionId] = useState<string | null>(null);

    // Synchronize section data only when switching sections or when user hasn't made unsaved edits
    useEffect(() => {
        if (!section) return;

        const isDifferentSection = section.id !== loadedSectionId;
        
        if (isDifferentSection || !hasChanges) {
            setLoadedSectionId(section.id);
            if (section?.dataJson) {
                try {
                    const parsedObj = typeof section.dataJson === 'string' ? JSON.parse(section.dataJson) : section.dataJson;
                    const formatted = JSON.stringify(parsedObj, null, 2);
                    setCode(formatted);
                    setSavedCode(formatted);
                    setHasChanges(false);
                    setIsValid(true);
                } catch (e) {
                    const raw = typeof section.dataJson === 'string' ? section.dataJson : JSON.stringify(section.dataJson);
                    setCode(raw);
                    setSavedCode(raw);
                    setHasChanges(false);
                    setIsValid(false);
                }
            } else {
                setCode('{}');
                setSavedCode('{}');
                setHasChanges(false);
                setIsValid(true);
            }
        }
    }, [section?.id, section?.dataJson, loadedSectionId, hasChanges]);

    // Validate JSON on change without auto-saving or reverting
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
    };

    // Manual Save: Applies pasted/edited JSON to active habillage
    const handleSave = async () => {
        if (!section || !activeHabillage || !isValid) return;
        try {
            setIsSaving(true);
            const parsed = JSON.parse(code);
            const stringifiedData = JSON.stringify(parsed);
            const sections = JSON.parse(activeHabillage.sectionsJson);
            
            const match = section?.id?.match(/^habillage-.+-(\d+)$/);
            const idx = match ? parseInt(match[1]) : (sectionIndex >= 0 && sectionIndex < sections.length ? sectionIndex : sections.findIndex((s: any) => s.type === section.type));
            
            if (idx >= 0 && idx < sections.length) {
                sections[idx].dataJson = stringifiedData;
            } else {
                sections.push({ 
                    type: section.type, 
                    title: section.title || '', 
                    dataJson: stringifiedData, 
                    order: sections.length, 
                    isActive: true, 
                    pageSlug: section.pageSlug || 'home' 
                });
            }
            
            const sectionsJson = JSON.stringify(sections);
            const formattedCode = JSON.stringify(parsed, null, 2);
            
            // Update active habillage state in editor instantly
            setActiveHabillage((prev: any) => prev ? { ...prev, sectionsJson } : prev);
            setPreviewVersion(Date.now());
            setSavedCode(formattedCode);
            setCode(formattedCode);
            setHasChanges(false);
            setSaveStatus('✅ Modifications de code enregistrées et appliquées !');

            // Persist save in database
            await fetchGraphQL(AUTO_SAVE_HABILLAGE, {
                presetId: activeHabillage.id,
                sectionsJson,
            });
            
            if (onSaveSuccess) onSaveSuccess();
        } catch (err: any) {
            setSaveStatus('❌ Erreur sauvegarde JSON: ' + err.message);
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    // Cancel edits: Revert back to last saved JSON
    const handleCancel = () => {
        setCode(savedCode);
        setHasChanges(false);
        try {
            JSON.parse(savedCode);
            setIsValid(true);
        } catch {
            setIsValid(false);
        }
    };

    // Auto-format JSON
    const handleFormat = () => {
        try {
            const parsed = JSON.parse(code);
            const formatted = JSON.stringify(parsed, null, 2);
            setCode(formatted);
            setIsValid(true);
            setHasChanges(formatted !== savedCode);
        } catch {
            // Invalid JSON
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
                padding: '0.6rem 1.2rem', 
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
                        fontSize: '0.8rem', 
                        fontWeight: 700,
                        fontFamily: 'monospace'
                    }}>
                        {section.title || section.type}
                    </span>
                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                        ({section.type})
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    {/* Validation indicator */}
                    <span style={{ 
                        fontSize: '0.65rem', 
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: '4px',
                        background: isValid ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: isValid ? '#10b981' : '#ef4444',
                    }}>
                        {isValid ? '✓ JSON VALIDE' : '✗ INVALIDE'}
                    </span>

                    {/* Has changes indicator */}
                    {hasChanges && (
                        <span style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '4px',
                            background: 'rgba(245,158,11,0.15)',
                            color: '#f59e0b',
                        }}>
                            ✏️ MODIFICATION NON ENREGISTRÉE
                        </span>
                    )}

                    {/* Format button */}
                    <button 
                        onClick={handleFormat}
                        disabled={!isValid}
                        style={{ 
                            padding: '0.35rem 0.75rem', 
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            background: '#374151',
                            color: isValid ? '#e2e8f0' : '#6b7280',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isValid ? 'pointer' : 'default',
                        }}
                    >
                        📐 FORMATER
                    </button>

                    {/* Cancel button */}
                    {hasChanges && (
                        <button 
                            onClick={handleCancel}
                            style={{ 
                                padding: '0.35rem 0.75rem', 
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                background: '#475569',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                        >
                            ↺ ANNULER
                        </button>
                    )}

                    {/* Save button */}
                    <button 
                        onClick={handleSave}
                        disabled={!isValid || !hasChanges || isSaving}
                        style={{ 
                            padding: '0.35rem 0.9rem', 
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: isValid && hasChanges ? '#2563eb' : '#334155',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isValid && hasChanges ? 'pointer' : 'not-allowed',
                            opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? '⏳ ENREGISTREMENT...' : '💾 ENREGISTRER & APPLIQUER'}
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
                padding: '0.4rem 1.2rem',
                background: '#252526',
                borderTop: '1px solid #3d3d3d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#94a3b8',
                fontSize: '0.65rem',
                fontWeight: 500,
            }}>
                <span>JSON • {code.split('\n').length} lignes • {code.length} caract.</span>
                <span>Cliquez sur "💾 ENREGISTRER & APPLIQUER" ou tapez Ctrl+S pour appliquer vos modifications.</span>
            </div>
            
            <style>{`
                .code-editor-textarea:focus { outline: none !important; }
            `}</style>
        </div>
    );
};
