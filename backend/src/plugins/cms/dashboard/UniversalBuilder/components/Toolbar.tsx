import React from 'react';
import { useEditor, EditorMode } from '../hooks/EditorContext';

export const Toolbar = () => {
  const { mode, setMode, isSaving, isFullscreen, setIsFullscreen } = useEditor();

  return (
    <header className="builder-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="builder-logo">
          AHIZAN <span style={{ color: 'var(--builder-primary)', fontSize: '0.7rem', fontWeight: 500, marginLeft: '4px' }}>BUILDER</span>
        </div>
        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          style={{
            background: isFullscreen ? '#fef2f2' : '#f0fdf4',
            border: `1px solid ${isFullscreen ? '#fecaca' : '#bbf7d0'}`,
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            color: isFullscreen ? '#991b1b' : '#166534',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title={isFullscreen ? "Réduire" : "Plein écran"}
        >
          {isFullscreen ? '↙️ Quitter Plein écran' : '↗️ Étendre l\'éditeur'}
        </button>
      </div>

      <div className="mode-switcher">
        <button className={`mode-btn ${mode === 'LIVE' ? 'active' : ''}`} onClick={() => setMode('LIVE')}>
          🖥️ Live
        </button>
        <button className={`mode-btn ${mode === 'PAR_VISUEL' ? 'active' : ''}`} onClick={() => setMode('PAR_VISUEL')}>
          🎛️ Par-visuel
        </button>
        <button className={`mode-btn ${mode === 'CODE' ? 'active' : ''}`} onClick={() => setMode('CODE')}>
          ⌨️ Code
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--builder-text-muted)', fontWeight: 500 }}>
          {isSaving ? 'Sauvegarde...' : 'Prêt'}
        </div>
        <div style={{ 
          width: '7px', height: '7px', borderRadius: '50%', 
          background: isSaving ? '#f59e0b' : '#10b981'
        }} />
      </div>
    </header>
  );
};
