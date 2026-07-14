import React, { useEffect, useState } from 'react';
import { fetchGraphQL, getAssetUrl } from '../lib/utils';
import { FileUploadField } from '../UniversalBuilder/components/sections/FileUploadField';

const FETCH_NEIGHBORHOODS = `
  query GetNeighborhoods {
    geographicLocations(type: "NEIGHBORHOOD") {
      id
      name
      image
      icon
      centerLatitude
      centerLongitude
      radiusMeters
    }
  }
`;

const UPDATE_NEIGHBORHOOD = `
  mutation UpdateNeighborhood($input: UpdateGeographicLocationInput!) {
    updateGeographicLocation(input: $input) {
      id
      name
      image
      icon
      centerLatitude
      centerLongitude
      radiusMeters
    }
  }
`;

export function NeighborhoodManager() {
    const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedGeoId, setExpandedGeoId] = useState<string | null>(null);
    const [formStates, setFormStates] = useState<Record<string, any>>({});
    const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});

    const loadNeighborhoods = async () => {
        try {
            setLoading(true);
            const data = await fetchGraphQL(FETCH_NEIGHBORHOODS);
            const list = data?.geographicLocations || [];
            setNeighborhoods(list);
            
            // Initialize form states
            const states: Record<string, any> = {};
            list.forEach((n: any) => {
                states[n.id] = { ...n };
            });
            setFormStates(states);
        } catch (e) {
            console.error('Failed to load neighborhoods:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNeighborhoods();
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedGeoId(expandedGeoId === id ? null : id);
    };

    const handleInputChange = (geoId: string, field: string, value: any) => {
        setFormStates(prev => ({
            ...prev,
            [geoId]: {
                ...prev[geoId],
                [field]: value
            }
        }));
    };

    const handleSave = async (geoId: string) => {
        const input = formStates[geoId];
        try {
            setSaveStatus(prev => ({ ...prev, [geoId]: '⏳ Sauvegarde...' }));
            await fetchGraphQL(UPDATE_NEIGHBORHOOD, {
                input: {
                    id: geoId,
                    name: input.name,
                    image: input.image,
                    icon: input.icon,
                    centerLatitude: input.centerLatitude ? parseFloat(input.centerLatitude) : null,
                    centerLongitude: input.centerLongitude ? parseFloat(input.centerLongitude) : null,
                    radiusMeters: input.radiusMeters ? parseInt(input.radiusMeters, 10) : null,
                }
            });
            setSaveStatus(prev => ({ ...prev, [geoId]: '✅ Enregistré avec succès !' }));
            loadNeighborhoods();
            setTimeout(() => {
                setSaveStatus(prev => ({ ...prev, [geoId]: '' }));
            }, 3000);
        } catch (e: any) {
            setSaveStatus(prev => ({ ...prev, [geoId]: `❌ Erreur : ${e.message}` }));
        }
    };

    if (loading) {
        return <div style={{ padding: '20px', color: '#64748b' }}>Chargement des quartiers...</div>;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>📍 Gestion des Quartiers</h2>
                <button onClick={loadNeighborhoods} className="btn-pro" style={{ padding: '6px 14px', cursor: 'pointer' }}>🔄 Rafraîchir</button>
            </div>

            {neighborhoods.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                    Aucun quartier trouvé dans la base de données.
                </div>
            ) : (
                neighborhoods.map(n => {
                    const isExpanded = expandedGeoId === n.id;
                    const input = formStates[n.id] || {};
                    const status = saveStatus[n.id] || '';

                    return (
                        <div 
                            key={n.id} 
                            style={{ 
                                background: '#fff', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '12px', 
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {/* Neighborhood Row Header */}
                            <div 
                                onClick={() => toggleExpand(n.id)}
                                style={{ 
                                    padding: '16px 20px', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    cursor: 'pointer',
                                    background: isExpanded ? '#f8fafc' : '#fff',
                                    borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {n.icon ? (
                                        <img src={getAssetUrl(n.icon)} alt="" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '1.2rem' }}>📍</span>
                                    )}
                                    <div>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{n.name}</h3>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{isExpanded ? '▲' : '▼'}</span>
                            </div>

                            {/* Expanded Editor Form */}
                            {isExpanded && (
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label className="label-pro">Nom du Quartier</label>
                                        <input 
                                            type="text" 
                                            className="input-pro" 
                                            value={input.name || ''} 
                                            onChange={e => handleInputChange(n.id, 'name', e.target.value)} 
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="label-pro">Latitude</label>
                                            <input 
                                                type="number" 
                                                step="any" 
                                                className="input-pro" 
                                                value={input.centerLatitude ?? ''} 
                                                onChange={e => handleInputChange(n.id, 'centerLatitude', e.target.value)} 
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="label-pro">Longitude</label>
                                            <input 
                                                type="number" 
                                                step="any" 
                                                className="input-pro" 
                                                value={input.centerLongitude ?? ''} 
                                                onChange={e => handleInputChange(n.id, 'centerLongitude', e.target.value)} 
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="label-pro">Rayon (Mètres)</label>
                                            <input 
                                                type="number" 
                                                className="input-pro" 
                                                value={input.radiusMeters ?? ''} 
                                                onChange={e => handleInputChange(n.id, 'radiusMeters', e.target.value)} 
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <FileUploadField 
                                            label="Image de Couverture"
                                            value={input.image || ''}
                                            onChange={url => handleInputChange(n.id, 'image', url)}
                                        />
                                        <FileUploadField 
                                            label="Icône Graphique"
                                            value={input.icon || ''}
                                            onChange={url => handleInputChange(n.id, 'icon', url)}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: status.startsWith('❌') ? '#ef4444' : '#10b981' }}>
                                            {status}
                                        </span>
                                        <button 
                                            onClick={() => handleSave(n.id)} 
                                            className="btn-pro btn-pro-primary"
                                            style={{ padding: '8px 24px', cursor: 'pointer', background: 'var(--builder-primary)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
                                        >
                                            Enregistrer les modifications
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}
