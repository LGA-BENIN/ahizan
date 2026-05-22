import React, { useState } from 'react';
import { useEditor } from '../hooks/EditorContext';

export const LivePreview = () => {
    const [viewPort, setViewPort] = useState<'desktop' | 'mobile'>('desktop');
    const { activeHabillage, previewVersion } = useEditor();

    // Only show preview when a habillage is active
    const previewUrl = activeHabillage 
        ? `http://localhost:3001/preview?presetId=${activeHabillage.id}&v=${previewVersion}`
        : '';

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
            <div style={{ 
                padding: '0.75rem 1.5rem', 
                background: 'white', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                    {activeHabillage ? `APERÇU — ${activeHabillage.name}` : 'APERÇU — Aucun habillage'}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                    <button 
                        onClick={() => setViewPort('desktop')}
                        style={{
                            padding: '4px 12px',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: viewPort === 'desktop' ? 'white' : 'transparent',
                            color: viewPort === 'desktop' ? '#0f172a' : '#94a3b8',
                            boxShadow: viewPort === 'desktop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        🖥️ Ordinateur
                    </button>
                    <button 
                        onClick={() => setViewPort('mobile')}
                        style={{
                            padding: '4px 12px',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: viewPort === 'mobile' ? 'white' : 'transparent',
                            color: viewPort === 'mobile' ? '#0f172a' : '#94a3b8',
                            boxShadow: viewPort === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        📱 Mobile
                    </button>
                </div>

                {activeHabillage && (
                    <a 
                        href={previewUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ fontSize: '0.7rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}
                    >
                        Ouvrir dans un nouvel onglet ↗
                    </a>
                )}
            </div>

            <div style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                padding: viewPort === 'mobile' ? '2rem' : '0',
                overflow: 'auto',
                transition: 'all 0.3s ease'
            }}>
                {!activeHabillage ? (
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: '#94a3b8',
                        gap: '1rem'
                    }}>
                        <div style={{ fontSize: '3rem', opacity: 0.3 }}>🎨</div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Sélectionnez un habillage pour voir l&apos;aperçu</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Créez ou ouvrez un habillage dans la barre latérale</div>
                    </div>
                ) : (
                    <iframe 
                        key={previewVersion}
                        src={previewUrl}
                        style={{
                            width: viewPort === 'desktop' ? '100%' : '375px',
                            height: viewPort === 'desktop' ? '100%' : '667px',
                            border: viewPort === 'mobile' ? '12px solid #0f172a' : 'none',
                            borderRadius: viewPort === 'mobile' ? '32px' : '0',
                            background: 'white',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            transition: 'all 0.3s ease'
                        }}
                        title="Ahizan Live Preview"
                    />
                )}
            </div>
        </div>
    );
};
