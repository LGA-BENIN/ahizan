import React from 'react';

export function VendorListComponent() {
    return (
        <div style={{ padding: '24px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                Marketplace Vendors
            </h1>

            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '16px'
            }}>
                <p style={{ color: '#6b7280' }}>
                    Liste des vendeurs marketplace - En cours de développement
                </p>

                <p style={{ marginTop: '12px', fontSize: '14px', color: '#9ca3af' }}>
                    Cette page affichera bientôt la liste complète des vendeurs avec leurs informations.
                </p>
            </div>
        </div>
    );
}
