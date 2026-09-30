import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { FileUploadField } from './FileUploadField';
import { fetchGraphQL } from '../../../lib/utils';

interface LocalMarketsSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

const FETCH_MARKETS_QUERY = `
  query GetMarketsForSettings {
    markets {
      id
      name
      slug
      description
      image
      icon
      centerLatitude
      centerLongitude
      geoZone {
        id
        name
      }
    }
  }
`;

export const LocalMarketsSettings = ({ data, onSave }: LocalMarketsSettingsProps) => {
    const [config, setConfig] = useState(data);
    const [marketsList, setMarketsList] = useState<any[]>([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [activeMarketEditId, setActiveMarketEditId] = useState<string>('');
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            title: 'Marchés Populaires & Traditionnels',
            subtitle: 'Explorez les grands pôles commerciaux du Bénin et achetez directement auprès de leurs commerçants.',
            badgeText: 'Pôles Commerciaux',
            cardStyle: 'navy-modern', // 'navy-modern' | 'white-card' | 'round-circle' | 'horizontal-split'
            layout: 'grid', // 'grid' | 'carousel'
            columns: 4,
            take: 12,
            selectionMode: 'ALL', // 'ALL' | 'CUSTOM'
            selectedMarketIds: [],
            marketOverrides: {}, // { [marketId]: { image: '', description: '', name: '' } }
            backgroundColor: '#ffffff',
            titleColor: '#0B1E3B',
            subtitleColor: '#475569',
            badgeColor: '#0B1E3B',
            badgeBgColor: 'rgba(11, 30, 59, 0.08)',
            cardBgColor: '#0B1E3B',
            cardBorderColor: '#1e293b',
            cardTextColor: '#ffffff',
            showDistance: true,
            showProductsCount: true,
            showAllLink: true,
            viewAllText: 'Tous les marchés',
            bgImage: '',
            bgImageOverlayOpacity: 40,
            gradientBackground: '',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    useEffect(() => {
        fetchGraphQL(FETCH_MARKETS_QUERY)
            .then((res: any) => {
                if (res?.markets) {
                    setMarketsList(res.markets);
                    if (res.markets.length > 0 && !activeMarketEditId) {
                        setActiveMarketEditId(res.markets[0].id);
                    }
                }
            })
            .catch(() => {});
    }, []);

    const handleChange = (field: string, value: any) => setConfig((prev: any) => ({ ...prev, [field]: value }));

    const handleMarketOverrideChange = (marketId: string, prop: string, value: string) => {
        const currentOverrides = { ...(config.marketOverrides || {}) };
        currentOverrides[marketId] = {
            ...(currentOverrides[marketId] || {}),
            [prop]: value,
        };
        handleChange('marketOverrides', currentOverrides);
    };

    const insertToken = (field: string, token: string) => {
        const currentVal = config[field] || '';
        handleChange(field, `${currentVal} ${token}`.trim());
    };

    const toggleMarketSelection = (marketId: string) => {
        const current = Array.isArray(config.selectedMarketIds) ? [...config.selectedMarketIds] : [];
        const index = current.indexOf(marketId);
        if (index >= 0) {
            current.splice(index, 1);
        } else {
            current.push(marketId);
        }
        handleChange('selectedMarketIds', current);
    };

    const selectAllMarkets = () => {
        const allIds = marketsList.map(m => m.id);
        handleChange('selectedMarketIds', allIds);
    };

    const clearAllMarkets = () => {
        handleChange('selectedMarketIds', []);
    };

    const filteredMarkets = marketsList.filter(m => 
        (m.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
        (m.geoZone?.name || '').toLowerCase().includes(searchFilter.toLowerCase())
    );

    const activeMarket = marketsList.find(m => String(m.id) === String(activeMarketEditId)) || marketsList[0];
    const activeOverride = (config.marketOverrides && activeMarket) ? (config.marketOverrides[activeMarket.id] || {}) : {};

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto", paddingBottom: "2rem" }}>
            
            {/* Dynamic Tokens Guide */}
            <div className="settings-card" style={{ borderLeft: '4px solid #0B1E3B', background: '#f0f7ff' }}>
                <div className="settings-card-header" style={{ color: '#0B1E3B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 Variables Dynamiques de Géolocalisation
                </div>
                <p style={{ fontSize: '12px', color: '#1e3a8a', margin: '4px 0 10px 0' }}>
                    Adaptez automatiquement les textes selon la localisation du client :
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button type="button" onClick={() => insertToken('title', '{{position}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#ffffff', color: '#0B1E3B', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{position}}"} (ex: Cotonou)
                    </button>
                    <button type="button" onClick={() => insertToken('title', '{{quartier}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#ffffff', color: '#0B1E3B', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{quartier}}"} (ex: Cadjèhoun)
                    </button>
                    <button type="button" onClick={() => insertToken('subtitle', '{{distance}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#ffffff', color: '#0B1E3B', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{distance}}"} (ex: à 1.5 km)
                    </button>
                </div>
            </div>

            {/* Style de Carte & Layout */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Style des Cartes & Disposition</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Style Visuel des Cartes Marchés</label>
                        <select 
                            className="input-pro" 
                            value={config.cardStyle || 'navy-modern'} 
                            onChange={(e) => handleChange('cardStyle', e.target.value)}
                        >
                            <option value="navy-modern">⭐ Style Capture (Image Haut + Corps Bleu Nuit + Pin Rouge + Bouton Blanc)</option>
                            <option value="white-card">🤍 Carte Blanche Épurée (Image Haut + Corps Blanc + Bouton Gris)</option>
                            <option value="round-circle">⭕ Cartes Circulaires (Avatar Marché Rond + Nom Centré)</option>
                            <option value="horizontal-split">📐 Rectangle Horizontal (Image Gauche + Texte Droite)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Format d'affichage</label>
                        <select 
                            className="input-pro" 
                            value={config.layout || 'grid'} 
                            onChange={(e) => handleChange('layout', e.target.value)}
                        >
                            <option value="grid">Grille Responsive (Multi-colonnes)</option>
                            <option value="carousel">Carrousel Défilant Horizontal avec Flèches</option>
                        </select>
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Nombre de colonnes (Grille)</label>
                        <select 
                            className="input-pro" 
                            value={config.columns || 4} 
                            onChange={(e) => handleChange('columns', parseInt(e.target.value))}
                        >
                            <option value={2}>2 Colonnes</option>
                            <option value={3}>3 Colonnes</option>
                            <option value={4}>4 Colonnes</option>
                            <option value={5}>5 Colonnes</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Nombre maximum de marchés à afficher</label>
                        <input 
                            className="input-pro" 
                            type="number" 
                            min={2} 
                            max={50} 
                            value={config.take || 12} 
                            onChange={(e) => handleChange('take', parseInt(e.target.value))} 
                        />
                    </div>
                </div>
            </div>

            {/* Personnalisation directe des Images & Descriptions des Marchés */}
            <div className="settings-card" style={{ borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
                <div className="settings-card-header" style={{ color: '#92400e' }}>
                    🖼️ Gestion des Images & Descriptions des Marchés
                </div>
                <p style={{ fontSize: '12px', color: '#b45309', margin: '4px 0 10px 0' }}>
                    Sélectionnez un marché pour remplacer son image ou sa description affichée sur le Storefront :
                </p>

                {marketsList.length > 0 && (
                    <div className="stack" style={{ marginTop: '10px' }}>
                        <div>
                            <label className="label-pro">Marché à personnaliser :</label>
                            <select 
                                className="input-pro" 
                                value={activeMarketEditId} 
                                onChange={(e) => setActiveMarketEditId(e.target.value)}
                            >
                                {marketsList.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.geoZone?.name || 'Bénin'})</option>
                                ))}
                            </select>
                        </div>

                        {activeMarket && (
                            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#0f172a', marginBottom: '8px' }}>
                                    Modifier les données de : {activeMarket.name}
                                </div>
                                <FileUploadField
                                    label="Image du Marché (Façade / Ambiance)"
                                    value={activeOverride.image || activeMarket.image || ''}
                                    onChange={(url) => handleMarketOverrideChange(activeMarket.id, 'image', url)}
                                    placeholder="https://... ou uploader une image"
                                />
                                <div style={{ marginTop: '10px' }}>
                                    <label className="label-pro">Description courte du marché :</label>
                                    <input 
                                        className="input-pro" 
                                        value={activeOverride.description !== undefined ? activeOverride.description : (activeMarket.description || '')} 
                                        onChange={(e) => handleMarketOverrideChange(activeMarket.id, 'description', e.target.value)}
                                        placeholder="Ex: Le plus grand marché de Cotonou..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Contenu et Textes de la section */}
            <div className="settings-card">
                <div className="settings-card-header">✍️ Textes & Titres de la Section</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Titre de la section</label>
                        <input className="input-pro" value={config.title || ''} onChange={(e) => handleChange('title', e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Sous-titre / Description</label>
                        <input className="input-pro" value={config.subtitle || ''} onChange={(e) => handleChange('subtitle', e.target.value)} />
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Badge supérieur</label>
                        <input className="input-pro" value={config.badgeText || ''} onChange={(e) => handleChange('badgeText', e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Texte du bouton "Voir tous les marchés"</label>
                        <input className="input-pro" value={config.viewAllText || ''} onChange={(e) => handleChange('viewAllText', e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Sélection des Marchés */}
            <div className="settings-card">
                <div className="settings-card-header">📍 Sélection des Marchés ({marketsList.length} disponibles)</div>
                <div style={{ marginBottom: '1rem' }}>
                    <label className="label-pro">Mode de sélection</label>
                    <select 
                        className="input-pro" 
                        value={config.selectionMode || 'ALL'} 
                        onChange={(e) => handleChange('selectionMode', e.target.value)}
                    >
                        <option value="ALL">Automatique : Tous les marchés (Triés par proximité GPS du client)</option>
                        <option value="CUSTOM">Sélection manuelle : Choisir les marchés précis à afficher</option>
                    </select>
                </div>

                {config.selectionMode === 'CUSTOM' && (
                    <div style={{ marginTop: '0.75rem', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                            <input 
                                className="input-pro" 
                                placeholder="Rechercher un marché..." 
                                value={searchFilter} 
                                onChange={(e) => setSearchFilter(e.target.value)} 
                                style={{ flex: 1 }}
                            />
                            <button type="button" onClick={selectAllMarkets} style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>
                                Tout cocher
                            </button>
                            <button type="button" onClick={clearAllMarkets} style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>
                                Vider
                            </button>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {filteredMarkets.map((m: any) => {
                                const isChecked = (config.selectedMarketIds || []).includes(m.id);
                                return (
                                    <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', background: isChecked ? '#eff6ff' : 'transparent' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked} 
                                            onChange={() => toggleMarketSelection(m.id)} 
                                        />
                                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>{m.name}</span>
                                        {m.geoZone?.name && (
                                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>
                                                ({m.geoZone.name})
                                            </span>
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 🎬 Animations & Défilement */}
            <div className="settings-card">
                <div className="settings-card-header">🎬 Animations & Défilement Dynamique</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Animation d'apparition</label>
                        <select className="input-pro" value={config.animationType || 'fade-in'} onChange={(e) => handleChange('animationType', e.target.value)}>
                            <option value="none">Aucune</option>
                            <option value="fade-in">Fondu (Fade In)</option>
                            <option value="slide-up">Glissement vers le haut (Slide Up)</option>
                            <option value="zoom-in">Zoom In progressif</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Effet au survol (Hover)</label>
                        <select className="input-pro" value={config.hoverEffect || 'lift'} onChange={(e) => handleChange('hoverEffect', e.target.value)}>
                            <option value="none">Aucun</option>
                            <option value="lift">Élévation & Ombre (Lift)</option>
                            <option value="zoom">Zoom doux (Scale)</option>
                            <option value="glow">Lueur / Glow</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Défilement auto (Carrousel)</label>
                        <select className="input-pro" value={config.autoplaySpeed || '0'} onChange={(e) => handleChange('autoplaySpeed', e.target.value)}>
                            <option value="0">Désactivé (Manuel)</option>
                            <option value="3000">Rapide (3 secondes)</option>
                            <option value="5000">Normal (5 secondes)</option>
                            <option value="8000">Lent (8 secondes)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Design & Couleurs */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Couleurs & Habillage Visuel</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Couleur Titre</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.titleColor || '#0B1E3B'} onChange={(e) => handleChange('titleColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.titleColor || '#0B1E3B'} onChange={(e) => handleChange('titleColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur Fond de Carte</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.cardBgColor || '#0B1E3B'} onChange={(e) => handleChange('cardBgColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.cardBgColor || '#0B1E3B'} onChange={(e) => handleChange('cardBgColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur Fond Section</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.backgroundColor || '#ffffff'} onChange={(e) => handleChange('backgroundColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.backgroundColor || '#ffffff'} onChange={(e) => handleChange('backgroundColor', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

