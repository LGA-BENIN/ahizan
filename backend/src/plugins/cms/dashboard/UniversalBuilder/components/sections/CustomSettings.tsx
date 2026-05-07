import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';

interface CustomSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const CustomSettings = ({ data, onSave }: CustomSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            htmlContent: '<div class="custom-section">\n  <h2>Mon Titre Personnalisé</h2>\n  <p>Ce contenu est généré via le code personnalisé.</p>\n</div>',
            customCss: '.custom-section {\n  padding: 40px;\n  text-align: center;\n  background: #f8fafc;\n}',
            customJs: 'console.log("Custom section loaded");',
            fullWidth: true,
            padding: '48px 0'
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (f: string, v: any) => setConfig({ ...config, [f]: v });

    return (
        <div className="stack-lg" style={{ width: '100%', maxWidth: '900px' }}>
            <div className="settings-card">
                <div className="settings-card-header">🛠️ Bloc Code/HTML Personnalisé</div>
                <div className="grid-2" style={{ marginBottom: '1rem' }}>
                    <div className="toggle-row">
                        <label><input type="checkbox" checked={config.fullWidth} onChange={(e) => handleChange('fullWidth', e.target.checked)} /> Section pleine largeur</label>
                    </div>
                    <div>
                        <label className="label-pro">Espacement vertical</label>
                        <select className="input-pro" value={config.padding} onChange={(e) => handleChange('padding', e.target.value)}>
                            <option value="0px">Aucun (0px)</option>
                            <option value="24px 0">Petit (24px)</option>
                            <option value="48px 0">Standard (48px)</option>
                            <option value="80px 0">Grand (80px)</option>
                        </select>
                    </div>
                </div>

                <div className="stack">
                    <div>
                        <label className="label-pro">Contenu HTML</label>
                        <textarea 
                            className="input-pro" 
                            style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '13px', background: '#1e1e1e', color: '#d4d4d4', padding: '16px' }}
                            value={config.htmlContent} 
                            onChange={(e) => handleChange('htmlContent', e.target.value)} 
                            placeholder="<div>Your HTML here...</div>"
                        />
                    </div>
                    <div>
                        <label className="label-pro">CSS Personnalisé</label>
                        <textarea 
                            className="input-pro" 
                            style={{ minHeight: '150px', fontFamily: 'monospace', fontSize: '13px', background: '#1e1e1e', color: '#d4d4d4', padding: '16px' }}
                            value={config.customCss} 
                            onChange={(e) => handleChange('customCss', e.target.value)} 
                            placeholder=".my-class { color: red; }"
                        />
                    </div>
                    <div>
                        <label className="label-pro">JavaScript Personnalisé (S'exécute au chargement)</label>
                        <textarea 
                            className="input-pro" 
                            style={{ minHeight: '100px', fontFamily: 'monospace', fontSize: '13px', background: '#1e1e1e', color: '#d4d4d4', padding: '16px' }}
                            value={config.customJs} 
                            onChange={(e) => handleChange('customJs', e.target.value)} 
                            placeholder="console.log('Hello');"
                        />
                    </div>
                </div>
            </div>

            <button className="btn-pro btn-pro-primary section-save-btn" style={{ padding: '12px', width: '100%', justifyContent: 'center', fontSize: '0.85rem' }} onClick={() => onSave(config)}>
                💾 Enregistrer le bloc de code personnalisé
            </button>
        </div>
    );
};
