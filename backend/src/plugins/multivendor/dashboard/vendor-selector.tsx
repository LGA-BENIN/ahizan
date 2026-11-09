import React, { useState, useEffect, useRef } from 'react';

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
        vendors(options: { take: 500 }) {
            items {
                id
                name
                status
                zone
                logo {
                    preview
                }
            }
        }
    }
`;

let cachedVendors: any[] | null = null;
let fetchPromise: Promise<any> | null = null;

export function VendorSelector({ value, onChange, readonly = false }: { value: any; onChange: (val: any) => void; readonly?: boolean }) {
    // Le customField de type relation renvoie soit un objet avec un ID, soit l'ID directement
    const selectedId = value?.id || value || '';
    const [vendors, setVendors] = useState<any[]>(cachedVendors || []);
    const [isLoading, setIsLoading] = useState(!cachedVendors);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (cachedVendors) {
            setVendors(cachedVendors);
            setIsLoading(false);
            return;
        }
        if (!fetchPromise) {
            fetchPromise = fetchGraphQL(GET_VENDORS_SELECT)
                .then(data => {
                    cachedVendors = data?.vendors?.items || [];
                    return cachedVendors;
                })
                .catch(err => {
                    console.error('Error fetching vendors for selector:', err);
                    fetchPromise = null;
                    return [];
                });
        }
        fetchPromise.then(items => {
            setVendors(items);
            setIsLoading(false);
        });
    }, []);

    // Fermeture lors d'un clic extérieur
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedVendor = vendors.find((v: any) => String(v.id) === String(selectedId));

    if (readonly) {
        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                {selectedVendor?.logo?.preview ? (
                    <img
                        src={selectedVendor.logo.preview}
                        alt=""
                        style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                    />
                ) : (
                    <span style={{ fontSize: '15px' }}>🏪</span>
                )}
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                    {isLoading ? 'Chargement...' : selectedVendor ? `${selectedVendor.name} (#${selectedVendor.id})` : (selectedId ? `Boutique (ID: ${selectedId})` : 'Aucun')}
                </span>
            </div>
        );
    }

    const filteredVendors = vendors.filter((v: any) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            v.name?.toLowerCase().includes(term) ||
            String(v.id).includes(term) ||
            v.zone?.toLowerCase().includes(term)
        );
    });

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: '220px' }}>
            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(prev => !prev)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: isOpen ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#1f2937',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease',
                    minHeight: '38px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    {selectedVendor ? (
                        <>
                            {selectedVendor.logo?.preview ? (
                                <img
                                    src={selectedVendor.logo.preview}
                                    alt=""
                                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                />
                            ) : (
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>
                                    {selectedVendor.name?.charAt(0).toUpperCase() || 'B'}
                                </div>
                            )}
                            <span style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {selectedVendor.name}
                            </span>
                            <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                #{selectedVendor.id}
                            </span>
                        </>
                    ) : (
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>
                            {isLoading ? 'Chargement des boutiques...' : '-- Sélectionner un vendeur --'}
                        </span>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {selectedVendor && (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(null);
                            }}
                            title="Effacer la sélection"
                            style={{
                                color: '#94a3b8',
                                fontSize: '13px',
                                padding: '2px 5px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
                        >
                            ✕
                        </span>
                    )}
                    <span style={{ fontSize: '10px', color: '#64748b', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
                        ▼
                    </span>
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: '#ffffff',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                        zIndex: 99999,
                        padding: '8px',
                        maxHeight: '320px',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* Search Field */}
                    <div style={{ marginBottom: '8px', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Rechercher une boutique..."
                            value={searchTerm}
                            autoFocus
                            onChange={e => setSearchTerm(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '100%',
                                padding: '8px 10px 8px 30px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '12px',
                                outline: 'none',
                                background: '#f8fafc',
                                boxSizing: 'border-box',
                            }}
                        />
                        <span style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8', pointerEvents: 'none' }}>
                            🔍
                        </span>
                        {searchTerm && (
                            <span
                                onClick={() => setSearchTerm('')}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                ✕
                            </span>
                        )}
                    </div>

                    {/* Vendors List */}
                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '240px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {/* Option: Aucun vendeur */}
                        <div
                            onClick={() => {
                                onChange(null);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '7px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                color: !selectedId ? '#2563eb' : '#64748b',
                                background: !selectedId ? '#eff6ff' : 'transparent',
                                fontWeight: !selectedId ? 700 : 500,
                            }}
                            onMouseEnter={e => {
                                if (selectedId) e.currentTarget.style.background = '#f8fafc';
                            }}
                            onMouseLeave={e => {
                                if (selectedId) e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            -- Aucun vendeur / Non assigné --
                        </div>

                        {filteredVendors.length === 0 ? (
                            <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                                Aucune boutique trouvée
                            </div>
                        ) : (
                            filteredVendors.map((v: any) => {
                                const isSelected = String(v.id) === String(selectedId);
                                return (
                                    <div
                                        key={v.id}
                                        onClick={() => {
                                            onChange({ id: v.id });
                                            setIsOpen(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 10px',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            background: isSelected ? '#eff6ff' : 'transparent',
                                            color: isSelected ? '#1e40af' : '#1f2937',
                                            fontWeight: isSelected ? 700 : 500,
                                            transition: 'background 0.1s',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isSelected) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                            {v.logo?.preview ? (
                                                <img
                                                    src={v.logo.preview}
                                                    alt=""
                                                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                                />
                                            ) : (
                                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e2e8f0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>
                                                    {v.name?.charAt(0).toUpperCase() || 'V'}
                                                </div>
                                            )}
                                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {v.name}
                                            </span>
                                            {v.zone && (
                                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400 }}>
                                                    • {v.zone}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                                ID: {v.id}
                                            </span>
                                            {isSelected && <span style={{ color: '#2563eb', fontWeight: 800 }}>✓</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
