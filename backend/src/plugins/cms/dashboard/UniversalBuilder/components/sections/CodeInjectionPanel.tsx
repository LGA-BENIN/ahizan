import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';

type CodeTab = 'HTML' | 'CSS' | 'JS';

interface CodeInjectionData {
    _codeOverride?: boolean;
    _overrideHTML?: string;
    _customCSS?: string;
    _customJS?: string;
    _customHTMLBefore?: string;
    _customHTMLAfter?: string;
}

interface CodeInjectionPanelProps {
    data: any;
    onSave: (newData: any) => void;
    sectionType: string;
    children: React.ReactNode; // The visual editor
}

const DEFAULT_TEMPLATES: Record<string, string> = {
    HTML: `<!-- Custom HTML for this section -->\n<div class="my-custom-block">\n  <h2>Your content here</h2>\n  <p>This HTML will be injected around the section.</p>\n</div>`,
    CSS: `/* Custom CSS scoped to this section */\n.my-custom-block {\n  padding: 20px;\n  text-align: center;\n}`,
    JS: `// Custom JavaScript for this section\n// Runs when the section mounts on the page\nconsole.log("Section loaded");`,
    OVERRIDE: `<!-- Full HTML Override -->\n<!-- This replaces the entire React component -->\n<section class="custom-override">\n  <div style="padding: 40px; text-align: center; background: #f8fafc; border-radius: 16px;">\n    <h2 style="font-size: 2rem; font-weight: 900;">Your Custom Section</h2>\n    <p style="color: #64748b;">Write any HTML, use any CSS framework, full creative freedom.</p>\n  </div>\n</section>`,
};

export const CodeInjectionPanel = ({ data, onSave, sectionType, children }: CodeInjectionPanelProps) => {
    const [activeView, setActiveView] = useState<'VISUAL' | 'CODE'>('VISUAL');
    const [activeTab, setActiveTab] = useState<CodeTab>('HTML');
    const [isOverride, setIsOverride] = useState(data._codeOverride || false);
    const [overrideHTML, setOverrideHTML] = useState(data._overrideHTML || '');
    const [customCSS, setCustomCSS] = useState(data._customCSS || '');
    const [customJS, setCustomJS] = useState(data._customJS || '');
    const [htmlBefore, setHtmlBefore] = useState(data._customHTMLBefore || '');
    const [htmlAfter, setHtmlAfter] = useState(data._customHTMLAfter || '');
    const [hasCodeChanges, setHasCodeChanges] = useState(false);

    // Sync from parent data when it changes
    useEffect(() => {
        setIsOverride(data._codeOverride || false);
        setOverrideHTML(data._overrideHTML || '');
        setCustomCSS(data._customCSS || '');
        setCustomJS(data._customJS || '');
        setHtmlBefore(data._customHTMLBefore || '');
        setHtmlAfter(data._customHTMLAfter || '');
        setHasCodeChanges(false);
    }, [data._codeOverride, data._overrideHTML, data._customCSS, data._customJS, data._customHTMLBefore, data._customHTMLAfter]);

    const markChanged = () => setHasCodeChanges(true);

    const handleSaveCode = () => {
        const codeFields: CodeInjectionData = {
            _codeOverride: isOverride,
            _overrideHTML: overrideHTML,
            _customCSS: customCSS,
            _customJS: customJS,
            _customHTMLBefore: htmlBefore,
            _customHTMLAfter: htmlAfter,
        };
        // Merge code fields into existing data and save
        onSave({ ...data, ...codeFields });
        setHasCodeChanges(false);
    };

    // Auto-save code changes after 2s of inactivity
    const handleSaveCodeRef = useRef(handleSaveCode);
    handleSaveCodeRef.current = handleSaveCode;

    useEffect(() => {
        if (!hasCodeChanges) return;
        const timer = setTimeout(() => {
            handleSaveCodeRef.current();
        }, 2000);
        return () => clearTimeout(timer);
    }, [hasCodeChanges, isOverride, overrideHTML, customCSS, customJS, htmlBefore, htmlAfter]);

    // Ctrl+S shortcut when in code view
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && activeView === 'CODE') {
            e.preventDefault();
            if (hasCodeChanges) handleSaveCode();
        }
    }, [activeView, hasCodeChanges, isOverride, overrideHTML, customCSS, customJS, htmlBefore, htmlAfter, data]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const getHighlighter = (tab: CodeTab) => {
        switch (tab) {
            case 'HTML': return (code: string) => highlight(code, languages.markup, 'markup');
            case 'CSS': return (code: string) => highlight(code, languages.css, 'css');
            case 'JS': return (code: string) => highlight(code, languages.javascript, 'javascript');
        }
    };

    const getCurrentCode = (): string => {
        if (isOverride) return overrideHTML;
        switch (activeTab) {
            case 'HTML': return htmlBefore || htmlAfter ? `<!-- BEFORE Section -->\n${htmlBefore}\n\n<!-- AFTER Section -->\n${htmlAfter}` : '';
            case 'CSS': return customCSS;
            case 'JS': return customJS;
        }
    };

    const editorStyle: React.CSSProperties = {
        fontFamily: '"Fira Code", "Fira Mono", "Cascadia Code", "Consolas", monospace',
        fontSize: 13,
        lineHeight: 1.7,
        minHeight: '300px',
        outline: 'none',
        color: '#d4d4d4',
        backgroundColor: 'transparent',
    };

    const hasAnyCode = !!(overrideHTML || customCSS || customJS || htmlBefore || htmlAfter || isOverride);

    return (
        <div style={{ width: '100%', maxWidth: '900px' }}>
            {/* View Switcher */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                background: '#f1f5f9',
                borderRadius: '12px',
                padding: '4px',
            }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={() => setActiveView('VISUAL')}
                        style={{
                            padding: '8px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeView === 'VISUAL' ? '#fff' : 'transparent',
                            color: activeView === 'VISUAL' ? '#1e40af' : '#64748b',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            boxShadow: activeView === 'VISUAL' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        🎛️ Éditeur Visuel
                    </button>
                    <button
                        onClick={() => setActiveView('CODE')}
                        style={{
                            padding: '8px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeView === 'CODE' ? '#fff' : 'transparent',
                            color: activeView === 'CODE' ? '#1e40af' : '#64748b',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            boxShadow: activeView === 'CODE' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        🖥️ Éditeur de Code
                        {hasAnyCode && (
                            <span style={{
                                width: '7px', height: '7px', borderRadius: '50%',
                                background: '#10b981', display: 'inline-block'
                            }} />
                        )}
                    </button>
                </div>

                {activeView === 'CODE' && hasCodeChanges && (
                    <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: 'rgba(245,158,11,0.15)',
                        color: '#f59e0b',
                        marginRight: '8px',
                    }}>
                        NON ENREGISTRÉ
                    </span>
                )}
            </div>

            {/* VISUAL Editor View */}
            {activeView === 'VISUAL' && (
                <div>
                    {isOverride && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                            borderRadius: '10px',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#92400e',
                        }}>
                            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                            <div>
                                <strong>Le remplacement complet du code est ACTIVÉ</strong> — Les paramètres de l'éditeur visuel ci-dessous sont ignorés.
                                La boutique affichera votre HTML/CSS/JS personnalisé à la place.
                                <button
                                    onClick={() => { setActiveView('CODE'); }}
                                    style={{
                                        marginLeft: '8px',
                                        padding: '2px 10px',
                                        borderRadius: '4px',
                                        border: '1px solid #d97706',
                                        background: 'transparent',
                                        color: '#d97706',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Modifier le code →
                                </button>
                            </div>
                        </div>
                    )}
                    {children}
                </div>
            )}

            {/* CODE Editor View */}
            {activeView === 'CODE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Override Toggle */}
                    <div style={{
                        padding: '16px 20px',
                        background: isOverride
                            ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                            : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        borderRadius: '12px',
                        border: isOverride ? 'none' : '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div>
                            <div style={{
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                color: isOverride ? '#fff' : '#1e293b',
                                marginBottom: '2px'
                            }}>
                                {isOverride ? '🔴 REMPLACEMENT COMPLET DU CODE — Actif' : '⚡ Remplacement Complet du Code'}
                            </div>
                            <div style={{
                                fontSize: '0.7rem',
                                color: isOverride ? 'rgba(255,255,255,0.8)' : '#64748b',
                            }}>
                                {isOverride
                                    ? 'Le composant React est complètement remplacé par votre HTML/CSS/JS personnalisé ci-dessous.'
                                    : 'Activez pour remplacer toute cette section par votre propre code HTML/CSS/JS.'}
                            </div>
                        </div>
                        <label style={{
                            position: 'relative',
                            display: 'inline-block',
                            width: '48px',
                            height: '26px',
                            flexShrink: 0,
                        }}>
                            <input
                                type="checkbox"
                                checked={isOverride}
                                onChange={(e) => { setIsOverride(e.target.checked); markChanged(); }}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute',
                                cursor: 'pointer',
                                inset: 0,
                                background: isOverride ? '#fff' : '#cbd5e1',
                                borderRadius: '26px',
                                transition: '0.2s',
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    content: '""',
                                    height: '20px',
                                    width: '20px',
                                    left: isOverride ? '25px' : '3px',
                                    bottom: '3px',
                                    background: isOverride ? '#dc2626' : '#fff',
                                    borderRadius: '50%',
                                    transition: '0.2s',
                                }} />
                            </span>
                        </label>
                    </div>

                    {/* Code Tabs */}
                    {!isOverride && (
                        <div style={{ display: 'flex', gap: '4px', background: '#1e1e1e', padding: '6px', borderRadius: '10px 10px 0 0' }}>
                            {(['HTML', 'CSS', 'JS'] as CodeTab[]).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        background: activeTab === tab ? '#2d2d2d' : 'transparent',
                                        color: activeTab === tab ? '#e2e8f0' : '#6b7280',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        fontFamily: 'monospace',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {tab === 'HTML' ? '📝 HTML' : tab === 'CSS' ? '🎨 CSS' : '⚡ JS'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Override Editor (single panel) */}
                    {isOverride && (
                        <div style={{ background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{
                                padding: '8px 16px',
                                background: '#252526',
                                borderBottom: '1px solid #3d3d3d',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <span style={{ color: '#e2e8f0', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                    📝 REMPLACEMENT COMPLET — HTML/CSS/JS
                                </span>
                                <span style={{ color: '#64748b', fontSize: '0.65rem' }}>
                                    Écrivez le HTML complet • Incluez les balises &lt;style&gt; et &lt;script&gt; au besoin
                                </span>
                            </div>
                            <div style={{ maxHeight: '500px', overflow: 'auto', padding: '4px' }}>
                                <Editor
                                    value={overrideHTML}
                                    onValueChange={(v) => { setOverrideHTML(v); markChanged(); }}
                                    highlight={(code) => highlight(code, languages.markup, 'markup')}
                                    padding={16}
                                    style={editorStyle}
                                    textareaClassName="code-injection-textarea"
                                    placeholder={DEFAULT_TEMPLATES.OVERRIDE}
                                />
                            </div>
                        </div>
                    )}

                    {/* Injection Editors (tabbed) */}
                    {!isOverride && (
                        <div style={{ background: '#1e1e1e', borderRadius: '0 0 12px 12px', overflow: 'hidden', marginTop: '-1rem' }}>
                            {activeTab === 'HTML' && (
                                <div>
                                    <div style={{ padding: '8px 16px', background: '#252526', borderBottom: '1px solid #3d3d3d' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>
                                            💡 HTML injecté <strong>AVANT</strong> la section
                                        </span>
                                    </div>
                                    <div style={{ maxHeight: '250px', overflow: 'auto', padding: '4px' }}>
                                        <Editor
                                            value={htmlBefore}
                                            onValueChange={(v) => { setHtmlBefore(v); markChanged(); }}
                                            highlight={(code) => highlight(code, languages.markup, 'markup')}
                                            padding={16}
                                            style={{ ...editorStyle, minHeight: '100px' }}
                                            textareaClassName="code-injection-textarea"
                                            placeholder="<!-- HTML before the section -->"
                                        />
                                    </div>
                                    <div style={{ padding: '8px 16px', background: '#252526', borderTop: '1px solid #3d3d3d', borderBottom: '1px solid #3d3d3d' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 600 }}>
                                            💡 HTML injecté <strong>APRÈS</strong> la section
                                        </span>
                                    </div>
                                    <div style={{ maxHeight: '250px', overflow: 'auto', padding: '4px' }}>
                                        <Editor
                                            value={htmlAfter}
                                            onValueChange={(v) => { setHtmlAfter(v); markChanged(); }}
                                            highlight={(code) => highlight(code, languages.markup, 'markup')}
                                            padding={16}
                                            style={{ ...editorStyle, minHeight: '100px' }}
                                            textareaClassName="code-injection-textarea"
                                            placeholder="<!-- HTML after the section -->"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'CSS' && (
                                <div style={{ maxHeight: '400px', overflow: 'auto', padding: '4px' }}>
                                    <Editor
                                        value={customCSS}
                                        onValueChange={(v) => { setCustomCSS(v); markChanged(); }}
                                        highlight={(code) => highlight(code, languages.css, 'css')}
                                        padding={16}
                                        style={editorStyle}
                                        textareaClassName="code-injection-textarea"
                                        placeholder={DEFAULT_TEMPLATES.CSS}
                                    />
                                </div>
                            )}

                            {activeTab === 'JS' && (
                                <div style={{ maxHeight: '400px', overflow: 'auto', padding: '4px' }}>
                                    <Editor
                                        value={customJS}
                                        onValueChange={(v) => { setCustomJS(v); markChanged(); }}
                                        highlight={(code) => highlight(code, languages.javascript, 'javascript')}
                                        padding={16}
                                        style={editorStyle}
                                        textareaClassName="code-injection-textarea"
                                        placeholder={DEFAULT_TEMPLATES.JS}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Info Box */}
                    {!isOverride && (
                        <div style={{
                            padding: '12px 16px',
                            background: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            color: '#0369a1',
                            lineHeight: 1.5,
                        }}>
                            <strong>💡 Comment fonctionne l'injection de code :</strong><br/>
                            • <strong>HTML</strong> — Injecté avant/après le contenu par défaut de la section<br/>
                            • <strong>CSS</strong> — Styles limités appliqués uniquement à cette section<br/>
                            • <strong>JS</strong> — Script exécuté lors du chargement de la section sur la page<br/>
                            • <strong>Remplacement complet</strong> — Remplace complètement la section par votre propre code
                        </div>
                    )}

                    {/* Save Button */}
                    <button
                        className="btn-pro btn-pro-primary section-save-btn"
                        style={{
                            padding: '14px',
                            width: '100%',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            borderRadius: '10px',
                            opacity: hasCodeChanges ? 1 : 0.5,
                        }}
                        onClick={handleSaveCode}
                        disabled={!hasCodeChanges}
                    >
                        💾 Enregistrer les modifications du code (Ctrl+S)
                    </button>
                </div>
            )}

            <style>{`
                .code-injection-textarea:focus { outline: none !important; }
                .code-injection-textarea::placeholder { color: #4a5568 !important; }
            `}</style>
        </div>
    );
};
