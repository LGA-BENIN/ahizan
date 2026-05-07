import React from 'react';

export const Canvas = () => {
  return (
    <div className="canvas-frame">
      {/* This is where Craft.js Frame will go */}
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <h1 style={{ color: '#0f172a', fontWeight: 900, fontSize: '3rem', marginBottom: '1rem' }}>
          Experience the No-Code Power.
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.25rem' }}>
          Drag components from the sidebar to start building your professional storefront.
        </p>
        
        <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <div style={{ width: '200px', height: '150px', background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            Drop Zone
          </div>
        </div>
      </div>
    </div>
  );
};
