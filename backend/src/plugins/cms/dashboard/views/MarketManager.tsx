import React, { useEffect, useState } from 'react';
import { fetchGraphQL, getAssetUrl } from '../lib/utils';
import { FileUploadField } from '../UniversalBuilder/components/sections/FileUploadField';

const FETCH_MARKETS = `
  query GetMarkets {
    markets {
      id
      name
      slug
      description
      image
      icon
      centerLatitude
      centerLongitude
      radiusMeters
    }
  }
`;

const UPDATE_MARKET = `
  mutation UpdateMarket($input: UpdateMarketInput!) {
    updateMarket(input: $input) {
      id
      name
      slug
      description
      image
      icon
      centerLatitude
      centerLongitude
      radiusMeters
    }
  }
`;

export function MarketManager() {
    const [markets, setMarkets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedMarketId, setExpandedMarketId] = useState<string | null>(null);
    const [formStates, setFormStates] = useState<Record<string, any>>({});
    const [saveStatus, setSaveStatus] = useState<Record<string, string>>({});

    const loadMarkets = async () => {
        try {
            setLoading(true);
            const data = await fetchGraphQL(FETCH_MARKETS);
            const list = data?.markets || [];
            setMarkets(list);
            
            // Initialize form states
            const states: Record<string, any> = {};
            list.forEach((m: any) => {
                states[m.id] = { ...m };
            });
            setFormStates(states);
        } catch (e) {
            console.error('Failed to load markets:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMarkets();
    }, []);

    const toggleExpand = (id: string) => {
        setExpandedMarketId(expandedMarketId === id ? null : id);
    };

    const handleInputChange = (marketId: string, field: string, value: any) => {
        setFormStates(prev => ({
            ...prev,
            [marketId]: {
                ...prev[marketId],
                [field]: value
            }
        }));
    };

    const handleSave = async (marketId: string) => {
        const input = formStates[marketId];
        try {
            setSaveStatus(prev => ({ ...prev, [marketId]: '⏳ Sauvegarde...' }));
            await fetchGraphQL(UPDATE_MARKET, {
                input: {
                    id: marketId,
                    name: input.name,
                    slug: input.slug,
                    description: input.description,
                    image: input.image,
                    icon: input.icon,
                    centerLatitude: input.centerLatitude ? parseFloat(input.centerLatitude) : null,
                    centerLongitude: input.centerLongitude ? parseFloat(input.centerLongitude) : null,
                    radiusMeters: input.radiusMeters ? parseInt(input.radiusMeters, 10) : null,
                }
            });
            setSaveStatus(prev => ({ ...prev, [marketId]: '✅ Enregistré avec succès !' }));
            loadMarkets();
            setTimeout(() => {
                setSaveStatus(prev => ({ ...prev, [marketId]: '' }));
            }, 3000);
        } catch (e: any) {
            setSaveStatus(prev => ({ ...prev, [marketId]: `❌ Erreur : ${e.message}` }));
        }
    };

    if (loading) {
        return <div style={{ padding: '20px', color: '#64748b' }}>Chargement des marchés...</div>;
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>🏪 Gestion des Marchés</h2>
                <button onClick={loadMarkets} className="btn-pro" style={{ padding: '6px 14px', cursor: 'pointer' }}>🔄 Rafraîchir</button>
            </div>

            {markets.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#94a3b8' }}>
                    Aucun marché trouvé dans la base de données.
                </div>
            ) : (
                markets.map(m => {
                    const isExpanded = expandedMarketId === m.id;
                    const input = formStates[m.id] || {};
                    const status = saveStatus[m.id] || '';

                    return (
                        <div 
                            key={m.id} 
                            style={{ 
                                background: '#fff', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '12px', 
                                overflow: 'hidden',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {/* Market Row Header */}
                            <div 
                                onClick={() => toggleExpand(m.id)}
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
                                    {m.icon ? (
                                        <img src={getAssetUrl(m.icon)} alt="" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '1.2rem' }}>🏪</span>
                                    )}
                                    <div>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{m.name}</h3>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/{m.slug}</span>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{isExpanded ? '▲' : '▼'}</span>
                            </div>

                            {/* Expanded Editor Form */}
                            {isExpanded && (
                                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label className="label-pro">Nom du Marché</label>
                                            <input 
                                                type="text" 
                                                className="input-pro" 
                                                value={input.name || ''} 
                                                onChange={e => handleInputChange(m.id, 'name', e.target.value)} 
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="label-pro">Slug (Lien URL)</label>
                                            <input 
                                                type="text" 
                                                className="input-pro" 
                                                value={input.slug || ''} 
                                                onChange={e => handleInputChange(m.id, 'slug', e.target.value)} 
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="label-pro">Description</label>
                                        <textarea 
                                            className="input-pro" 
                                            value={input.description || ''} 
                                            onChange={e => handleInputChange(m.id, 'description', e.target.value)}
                                            rows={3}
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
                                                onChange={e => handleInputChange(m.id, 'centerLatitude', e.target.value)} 
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="label-pro">Longitude</label>
                                            <input 
                                                type="number" 
                                                step="any" 
                                                className="input-pro" 
                                                value={input.centerLongitude ?? ''} 
                                                onChange={e => handleInputChange(m.id, 'centerLongitude', e.target.value)} 
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label className="label-pro">Rayon (Mètres)</label>
                                            <input 
                                                type="number" 
                                                className="input-pro" 
                                                value={input.radiusMeters ?? ''} 
                                                onChange={e => handleInputChange(m.id, 'radiusMeters', e.target.value)} 
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <FileUploadField 
                                            label="Image de Couverture"
                                            value={input.image || ''}
                                            onChange={url => handleInputChange(m.id, 'image', url)}
                                        />
                                        <FileUploadField 
                                            label="Icône Graphique"
                                            value={input.icon || ''}
                                            onChange={url => handleInputChange(m.id, 'icon', url)}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: status.startsWith('❌') ? '#ef4444' : '#10b981' }}>
                                            {status}
                                        </span>
                                        <button 
                                            onClick={() => handleSave(m.id)} 
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
