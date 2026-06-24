import React from 'react';
import { useQuery } from '@tanstack/react-query';

// Helper local pour exécuter des requêtes GraphQL dans le dashboard
async function fetchGraphQL(query: string, variables?: any) {
    const res = await fetch('/admin-api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

const GET_VENDORS_SELECT = `
    query GetVendorsSelect {
        vendors(options: { take: 100 }) {
            items {
                id
                name
            }
        }
    }
`;

export function VendorSelector({ value, onChange, readonly = false }: { value: any; onChange: (val: any) => void; readonly?: boolean }) {
    // Le customField de type relation renvoie soit un objet avec un ID, soit l'ID directement
    const selectedId = value?.id || value || '';

    const { data, isLoading } = useQuery({
        queryKey: ['vendors-select-list'],
        queryFn: () => fetchGraphQL(GET_VENDORS_SELECT),
    });

    const vendors = data?.vendors?.items || [];

    if (readonly) {
        const selectedVendor = vendors.find((v: any) => String(v.id) === String(selectedId));
        return (
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                {isLoading ? 'Chargement...' : selectedVendor ? selectedVendor.name : (selectedId ? `Vendeur (ID: ${selectedId})` : 'Aucun')}
            </span>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <select
                value={selectedId}
                onChange={(e) => {
                    const id = e.target.value;
                    onChange(id ? { id } : null);
                }}
                style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    color: '#1f2937',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
            >
                <option value="">-- Sélectionner un vendeur --</option>
                {vendors.map((v: any) => (
                    <option key={v.id} value={v.id}>
                        {v.name} (ID: {v.id})
                    </option>
                ))}
            </select>
            {isLoading && (
                <span style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#9ca3af' }}>
                    Chargement...
                </span>
            )}
        </div>
    );
}
