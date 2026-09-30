import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { FileUploadField } from './FileUploadField';
import { fetchGraphQL } from '../../../lib/utils';

interface LocalNeighborhoodsSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

const FETCH_GEOZONES_QUERY = `
  query GetGeoZonesForSettings {
    geoZones {
      id
      name
      slug
      code
      type
      status
      parent {
        id
        name
      }
    }
  }
`;

export const LocalNeighborhoodsSettings = ({ data, onSave }: LocalNeighborhoodsSettingsProps) => {
    const [config, setConfig] = useState(data);
    const [zonesList, setZonesList] = useState<any[]>([]);
    const [searchFilter, setSearchFilter] = useState('');
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            title: 'Quartiers & Villages du Bénin',
            subtitle: 'Découvrez les offres et boutiques situées directement dans votre quartier ou rue voisine.',
            badgeText: 'Quartiers Proches',
            filterType: 'NEIGHBORHOODS', // 'NEIGHBORHOODS' | 'ALL' | 'CITIES'
            filterCommune: 'ALL', // 'ALL' | 'Cotonou' | 'Porto-Novo' | 'Abomey-Calavi'
            selectionMode: 'ALL', // 'ALL' | 'CUSTOM'
            selectedZoneIds: [],
            layout: 'grid',
            columns: 4,
            take: 12,
            backgroundColor: '#ffffff',
            titleColor: '#0f172a',
            subtitleColor: '#475569',
            badgeColor: '#2563eb',
            badgeBgColor: '#eff6ff',
            cardBgColor: '#ffffff',
            cardBorderColor: '#e2e8f0',
            cardTextColor: '#0f172a',
            showAllLink: true,
            viewAllText: 'Toutes les zones',
            bgImage: '',
            bgImageOverlayOpacity: 40,
            gradientBackground: '',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    useEffect(() => {
        fetchGraphQL(FETCH_GEOZONES_QUERY)
            .then((res: any) => {
                if (res?.geoZones) {
                    setZonesList(res.geoZones);
                }
            })
            .catch(() => {});
    }, []);

    const handleChange = (field: string, value: any) => setConfig((prev: any) => ({ ...prev, [field]: value }));

    const insertToken = (field: string, token: string) => {
        const currentVal = config[field] || '';
        handleChange(field, `${currentVal} ${token}`.trim());
    };

    const toggleZoneSelection = (zoneId: string) => {
        const current = Array.isArray(config.selectedZoneIds) ? [...config.selectedZoneIds] : [];
        const index = current.indexOf(zoneId);
        if (index >= 0) {
            current.splice(index, 1);
        } else {
            current.push(zoneId);
        }
        handleChange('selectedZoneIds', current);
    };

    const selectAllZones = () => {
        const allIds = zonesList.map(z => z.id);
        handleChange('selectedZoneIds', allIds);
    };

    const clearAllZones = () => {
        handleChange('selectedZoneIds', []);
    };

    const filteredZones = zonesList.filter(z => {
        if (z.status === 'ARCHIVED') return false;

        const parentName = z.parent?.name || '';
        const matchesSearch = (z.name || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
            parentName.toLowerCase().includes(searchFilter.toLowerCase());
        
        if (config.filterCommune && config.filterCommune !== 'ALL') {
            const comm = (parentName || z.commune || z.name || '').toLowerCase();
            if (!comm.includes(config.filterCommune.toLowerCase())) return false;
        }

        const upperType = (z.type || '').toUpperCase();
        const isNeigh = upperType === 'NEIGHBORHOOD' || upperType === 'QUARTIER' || upperType === 'VILLAGE' || upperType === 'ARRONDISSEMENT' || (!['COMMUNE', 'CITY', 'DEPARTMENT', 'COUNTRY'].includes(upperType));
        const isCity = upperType === 'COMMUNE' || upperType === 'CITY';

        if (config.filterType === 'NEIGHBORHOODS') {
            return matchesSearch && isNeigh;
        }
        if (config.filterType === 'CITIES') {
            return matchesSearch && isCity;
        }
        return matchesSearch;
    });

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto", paddingBottom: "2rem" }}>
            
            {/* Dynamic Tokens Guide */}
            <div className="settings-card" style={{ borderLeft: '4px solid #2563eb', background: '#eff6ff' }}>
                <div className="settings-card-header" style={{ color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 Variables Dynamiques de Géolocalisation
                </div>
                <p style={{ fontSize: '12px', color: '#1d4ed8', margin: '4px 0 10px 0' }}>
                    Balises automatiques à insérer dans le titre ou sous-titre :
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button type="button" onClick={() => insertToken('title', '{{position}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #93c5fd', background: '#ffffff', color: '#1d4ed8', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{position}}"} (ex: Cotonou)
                    </button>
                    <button type="button" onClick={() => insertToken('title', '{{ville}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #93c5fd', background: '#ffffff', color: '#1d4ed8', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{ville}}"} (ex: Calavi)
                    </button>
                    <button type="button" onClick={() => insertToken('title', '{{quartier}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #93c5fd', background: '#ffffff', color: '#1d4ed8', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{quartier}}"} (ex: Tokpota)
                    </button>
                </div>
            </div>

            {/* Contenu et Textes */}
            <div className="settings-card">
                <div className="settings-card-header">🏘️ Contenu & Filtrage des Quartiers</div>
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
                        <label className="label-pro">Filtrer par Commune / Ville parente</label>
                        <select className="input-pro" value={config.filterCommune || 'ALL'} onChange={(e) => handleChange('filterCommune', e.target.value)}>
                            <option value="ALL">Toutes les communes du Bénin</option>
                            <option value="Cotonou">Cotonou uniquement (Védoko, Agla, Fidjrossè, Cadjèhoun, Akpakpa...)</option>
                            <option value="Porto-Novo">Porto-Novo uniquement (Ouando, Tokpota, Ahouangbo, Djassin...)</option>
                            <option value="Abomey-Calavi">Abomey-Calavi uniquement (Zogbadjè, Godomey, Cococodji...)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Type de zones à afficher</label>
                        <select className="input-pro" value={config.filterType || 'NEIGHBORHOODS'} onChange={(e) => handleChange('filterType', e.target.value)}>
                            <option value="NEIGHBORHOODS">⭐ Vrais Quartiers uniquement (Recommandé)</option>
                            <option value="ALL">Tout (Villes + Quartiers)</option>
                            <option value="CITIES">Villes / Communes uniquement</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Sélection des Zones */}
            <div className="settings-card">
                <div className="settings-card-header">📍 Sélection des Zones ({zonesList.length} disponibles)</div>
                <div style={{ marginBottom: '1rem' }}>
                    <label className="label-pro">Mode de sélection</label>
                    <select 
                        className="input-pro" 
                        value={config.selectionMode || 'ALL'} 
                        onChange={(e) => handleChange('selectionMode', e.target.value)}
                    >
                        <option value="ALL">Automatique : Toutes les zones configurées</option>
                        <option value="CUSTOM">Sélection manuelle : Choisir les quartiers/villes précis</option>
                    </select>
                </div>

                {config.selectionMode === 'CUSTOM' && (
                    <div style={{ marginTop: '0.75rem', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                            <input 
                                className="input-pro" 
                                placeholder="Rechercher (Tokpota, Zogbadjè, Cotonou...)" 
                                value={searchFilter} 
                                onChange={(e) => setSearchFilter(e.target.value)} 
                                style={{ flex: 1 }}
                            />
                            <button type="button" onClick={selectAllZones} style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>
                                Tout cocher
                            </button>
                            <button type="button" onClick={clearAllZones} style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}>
                                Vider
                            </button>
                        </div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {filteredZones.map((z: any) => {
                                const isChecked = (config.selectedZoneIds || []).includes(z.id);
                                return (
                                    <label key={z.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', background: isChecked ? '#eff6ff' : 'transparent' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isChecked} 
                                            onChange={() => toggleZoneSelection(z.id)} 
                                        />
                                        <span style={{ fontWeight: isChecked ? 600 : 400 }}>{z.name}</span>
                                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto' }}>
                                            {z.type === 'COMMUNE' || z.type === 'CITY' ? 'Ville' : 'Quartier'}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Disposition & Affichage */}
            <div className="settings-card">
                <div className="settings-card-header">📐 Disposition & Grille</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Type d'affichage</label>
                        <select className="input-pro" value={config.layout || 'grid'} onChange={(e) => handleChange('layout', e.target.value)}>
                            <option value="grid">Grille (Cards)</option>
                            <option value="carousel">Carrousel horizontal défilant</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Colonnes (sur grand écran)</label>
                        <select className="input-pro" value={config.columns || 4} onChange={(e) => handleChange('columns', parseInt(e.target.value))}>
                            <option value={2}>2 Colonnes</option>
                            <option value={3}>3 Colonnes</option>
                            <option value={4}>4 Colonnes</option>
                            <option value={5}>5 Colonnes</option>
                            <option value={6}>6 Colonnes</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Nombre max</label>
                        <input className="input-pro" type="number" min={2} max={50} value={config.take || 12} onChange={(e) => handleChange('take', parseInt(e.target.value))} />
                    </div>
                </div>
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

            {/* Design & Personnalisation Visuelle */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Couleurs & Habillage Visuel</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Couleur Titre</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.titleColor || '#0f172a'} onChange={(e) => handleChange('titleColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.titleColor || '#0f172a'} onChange={(e) => handleChange('titleColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur Sous-titre</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.subtitleColor || '#475569'} onChange={(e) => handleChange('subtitleColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.subtitleColor || '#475569'} onChange={(e) => handleChange('subtitleColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur Badge</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.badgeColor || '#2563eb'} onChange={(e) => handleChange('badgeColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.badgeColor || '#2563eb'} onChange={(e) => handleChange('badgeColor', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Couleur de Fond de la Section</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.backgroundColor || '#ffffff'} onChange={(e) => handleChange('backgroundColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.backgroundColor || '#ffffff'} onChange={(e) => handleChange('backgroundColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Dégradé CSS (Optionnel)</label>
                        <input className="input-pro" placeholder="linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" value={config.gradientBackground || ''} onChange={(e) => handleChange('gradientBackground', e.target.value)} />
                    </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <FileUploadField
                        label="Image de Fond de la Section"
                        value={config.bgImage || ''}
                        onChange={(url) => handleChange('bgImage', url)}
                        placeholder="Uploader une image de fond..."
                    />
                </div>

                {config.bgImage && (
                    <div style={{ marginTop: '1rem' }}>
                        <label className="label-pro">Opacité du Voile / Overlay ({config.bgImageOverlayOpacity || 40}%)</label>
                        <input 
                            type="range" 
                            min={0} 
                            max={100} 
                            value={config.bgImageOverlayOpacity !== undefined ? config.bgImageOverlayOpacity : 40} 
                            onChange={(e) => handleChange('bgImageOverlayOpacity', parseInt(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                )}
            </div>

        </div>
    );
};
