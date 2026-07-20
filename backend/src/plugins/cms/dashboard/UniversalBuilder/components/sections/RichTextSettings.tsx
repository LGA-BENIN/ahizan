import React, { useEffect, useState } from 'react';
import { RichTextEditor } from '../ui/RichTextEditor';

interface RichTextSettingsProps {
    data: any;
    onSave: (data: any) => void;
}

export function RichTextSettings({ data, onSave }: RichTextSettingsProps) {
    const [config, setConfig] = useState({
        htmlContent: '',
        bgColor: '#ffffff',
        textColor: '#333333',
        padding: '2rem 1rem',
        maxWidth: '800px',
        ...data
    });
    const [isSourceMode, setIsSourceMode] = useState(false);

    useEffect(() => {
        // Only update local state if data changes significantly from outside
        setConfig(prev => ({ ...prev, ...data }));
    }, [data]);

    const handleChange = (fields: Partial<typeof config>) => {
        const newConfig = { ...config, ...fields };
        setConfig(newConfig);
        onSave(newConfig);
    };

    return (
        <div style={{ display: 'flex', gap: '1.5rem', width: '100%', height: '100%', maxHeight: 'calc(100vh - 200px)' }}>
            <div className="stack-lg" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                <div className="settings-card">
                    <div className="settings-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>✍️ Éditeur de Texte Riche</span>
                        <button 
                            onClick={() => setIsSourceMode(!isSourceMode)}
                            className="btn-pro"
                            style={{ 
                                fontSize: '0.7rem', padding: '4px 8px', 
                                background: isSourceMode ? 'var(--builder-primary)' : 'var(--builder-bg-subtle)',
                                color: isSourceMode ? '#fff' : 'var(--builder-text)'
                            }}
                        >
                            {isSourceMode ? 'Passer en mode Visuel' : 'Mode Source (HTML)'}
                        </button>
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        {isSourceMode ? (
                            <textarea 
                                className="input-pro"
                                style={{ width: '100%', minHeight: '300px', fontFamily: 'monospace', fontSize: '13px' }}
                                value={config.htmlContent}
                                onChange={(e) => handleChange({ htmlContent: e.target.value })}
                                placeholder="<h1>Titre</h1><p>Mon texte HTML pur...</p>"
                            />
                        ) : (
                            <RichTextEditor 
                                value={config.htmlContent} 
                                onChange={(html) => handleChange({ htmlContent: html })} 
                                onToggleSourceMode={() => setIsSourceMode(true)}
                            />
                        )}
                        {isSourceMode && (
                            <div style={{ fontSize: '0.75rem', color: '#e31837', marginTop: '8px' }}>
                                ⚠️ <b>Attention :</b> Le code JavaScript (`&lt;script&gt;`) ne sera pas exécuté ici pour des raisons de sécurité de React. Utilisez le bloc "Code HTML personnalisé" pour les scripts complexes.
                            </div>
                        )}
                    </div>
                </div>

                <div className="settings-card mt-6">
                    <div className="settings-card-header">🎨 Apparence et Style</div>
                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Couleur de fond</label>
                            <div className="color-row">
                                <input type="color" className="color-swatch" value={config.bgColor || '#ffffff'} onChange={(e) => handleChange({ bgColor: e.target.value })} />
                                <input className="input-pro" value={config.bgColor || ''} onChange={(e) => handleChange({ bgColor: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="label-pro">Couleur du texte par défaut</label>
                            <div className="color-row">
                                <input type="color" className="color-swatch" value={config.textColor || '#333333'} onChange={(e) => handleChange({ textColor: e.target.value })} />
                                <input className="input-pro" value={config.textColor || ''} onChange={(e) => handleChange({ textColor: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <label className="label-pro">Espacement (Padding)</label>
                            <input className="input-pro" placeholder="ex: 2rem 1rem" value={config.padding || ''} onChange={(e) => handleChange({ padding: e.target.value })} />
                        </div>
                        <div>
                            <label className="label-pro">Largeur max du contenu</label>
                            <select className="input-pro" value={config.maxWidth || '800px'} onChange={(e) => handleChange({ maxWidth: e.target.value })}>
                                <option value="600px">Étroit (600px)</option>
                                <option value="800px">Moyen (800px) - Recommandé pour la lecture</option>
                                <option value="1200px">Large (1200px)</option>
                                <option value="100%">Pleine largeur (100%)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
