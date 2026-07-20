import React, { useState } from 'react';

interface OSMSelectorProps {
    onSelect: (result: {
        name: string;
        lat: number;
        lng: number;
        boundary?: any;
    }) => void;
    placeholder?: string;
}

export function OSMSelector({ onSelect, placeholder }: OSMSelectorProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedName, setSelectedName] = useState('');

    const handleSearch = async () => {
        if (!query.trim()) return;
        try {
            setSearching(true);
            setResults([]);
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=5`;
            const response = await fetch(url);
            const data = await response.json();
            setResults(data || []);
            if (data.length === 0) {
                alert('Aucun résultat trouvé sur OpenStreetMap.');
            }
        } catch (e) {
            console.error('OSM Search failed:', e);
            alert('Erreur lors de la recherche OpenStreetMap.');
        } finally {
            setSearching(false);
        }
    };

    const handleSelect = (item: any) => {
        const boundary = item.geojson && (item.geojson.type === 'Polygon' || item.geojson.type === 'MultiPolygon')
            ? item.geojson
            : null;

        onSelect({
            name: item.name || item.display_name.split(',')[0],
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            boundary: boundary
        });
        setSelectedName(item.display_name);
        setResults([]);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', background: '#f8fafc' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>🔍 Recherche interactive OpenStreetMap (OSM)</span>
            <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                    type="text" 
                    className="input-pro"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', margin: 0 }}
                    placeholder={placeholder || "ex: Dantokpa, Cotonou"} 
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                />
                <button 
                    type="button"
                    onClick={handleSearch}
                    disabled={searching}
                    style={{ padding: '6px 12px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    {searching ? '...' : 'Rechercher'}
                </button>
            </div>

            {selectedName && (
                <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span>✅ Sélectionné : <b>{selectedName.length > 45 ? selectedName.substring(0, 45) + '...' : selectedName}</b></span>
                </div>
            )}

            {results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', zIndex: 10, maxHeight: '180px', overflowY: 'auto' }}>
                    {results.map((item, idx) => (
                        <div 
                            key={idx}
                            onClick={() => handleSelect(item)}
                            style={{ padding: '8px 12px', fontSize: '0.75rem', color: '#1e293b', borderBottom: idx < results.length - 1 ? '1px solid #f1f5f9' : 'none', cursor: 'pointer', background: '#fff', transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                            <span style={{ fontWeight: 700 }}>{item.display_name.split(',')[0]}</span>
                            <span style={{ color: '#64748b', fontSize: '0.7rem' }}> ({item.type || item.class})</span>
                            <div style={{ color: '#64748b', fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.display_name}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
