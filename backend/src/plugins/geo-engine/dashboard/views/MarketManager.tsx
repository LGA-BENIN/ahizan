import React, { useEffect, useState } from 'react';
import { fetchGraphQL, getAssetUrl } from '../../../cms/dashboard/lib/utils';
import { FileUploadField } from '../../../cms/dashboard/UniversalBuilder/components/sections/FileUploadField';
import { OSMSelector } from '../components/OSMSelector';

function useLeaflet() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if ((window as any).L) {
            setLoaded(true);
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => setLoaded(true);
        document.head.appendChild(script);
    }, []);

    return loaded;
}

interface MapPickerProps {
    lat?: number;
    lng?: number;
    radius?: number;
    onChange: (lat: number, lng: number) => void;
}

function MapPicker({ lat, lng, radius, onChange }: MapPickerProps) {
    const isLoaded = useLeaflet();
    const mapRef = React.useRef<any>(null);
    const markerRef = React.useRef<any>(null);
    const circleRef = React.useRef<any>(null);
    const containerId = React.useMemo(() => `map-${Math.random().toString(36).substr(2, 9)}`, []);

    useEffect(() => {
        if (!isLoaded) return;
        const L = (window as any).L;
        if (!L) return;

        const defaultLat = lat || 6.3654;
        const defaultLng = lng || 2.4183;

        const map = L.map(containerId).setView([defaultLat, defaultLng], 13);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        const marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);
        markerRef.current = marker;

        let circle: any = null;
        if (radius) {
            circle = L.circle([defaultLat, defaultLng], {
                radius: radius,
                color: '#4f46e5',
                fillColor: '#4f46e5',
                fillOpacity: 0.15
            }).addTo(map);
            circleRef.current = circle;
        }

        marker.on('dragend', () => {
            const position = marker.getLatLng();
            onChange(position.lat, position.lng);
            if (circle) {
                circle.setLatLng(position);
            }
        });

        map.on('click', (e: any) => {
            marker.setLatLng(e.latlng);
            onChange(e.latlng.lat, e.latlng.lng);
            if (circle) {
                circle.setLatLng(e.latlng);
            }
        });

        return () => {
            map.remove();
        };
    }, [isLoaded]);

    useEffect(() => {
        if (mapRef.current && markerRef.current && lat && lng) {
            const pos = [lat, lng];
            markerRef.current.setLatLng(pos);
            mapRef.current.setView(pos);
            if (circleRef.current) {
                circleRef.current.setLatLng(pos);
            }
        }
    }, [lat, lng]);

    useEffect(() => {
        if (circleRef.current && radius) {
            circleRef.current.setRadius(radius);
        }
    }, [radius]);

    return (
        <div style={{ position: 'relative', height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            {!isLoaded && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f1f5f9', color: '#64748b' }}>Chargement de la carte...</div>}
            <div id={containerId} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}

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
      geoZone {
        id
        name
      }
    }
  }
`;

const FETCH_GEO_ZONES_SIMPLE = `
  query GetGeoZonesSimple {
    geoZones {
      id
      name
      type
    }
  }
`;

const UPDATE_MARKET = `
  mutation UpdateMarket($id: ID!, $input: UpdateMarketInput!) {
    updateMarket(id: $id, input: $input) {
      id
      name
    }
  }
`;

const CREATE_MARKET = `
  mutation CreateMarket($input: CreateMarketInput!) {
    createMarket(input: $input) {
      id
      name
    }
  }
`;

const DELETE_MARKET = `
  mutation DeleteMarket($id: ID!) {
    deleteMarket(id: $id) {
      result
      message
    }
  }
`;

export function MarketManager() {
    const [markets, setMarkets] = useState<any[]>([]);
    const [geoZones, setGeoZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingMarket, setEditingMarket] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saveStatus, setSaveStatus] = useState('');

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<any>({
        name: '',
        slug: '',
        description: '',
        centerLatitude: 6.3654,
        centerLongitude: 2.4183,
        radiusMeters: 500,
        geoZoneId: '',
        image: '',
        icon: ''
    });
    const [createStatus, setCreateStatus] = useState('');

    const loadData = async () => {
        try {
            setLoading(true);
            const marketsData = await fetchGraphQL(FETCH_MARKETS);
            setMarkets(marketsData?.markets || []);
            
            const zonesData = await fetchGraphQL(FETCH_GEO_ZONES_SIMPLE);
            setGeoZones(zonesData?.geoZones || []);
        } catch (e) {
            console.error('Failed to load markets:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleEditInputChange = (field: string, value: any) => {
        setEditForm((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            setSaveStatus('⏳ Sauvegarde...');
            await fetchGraphQL(UPDATE_MARKET, {
                id: editForm.id,
                input: {
                    name: editForm.name,
                    slug: editForm.slug,
                    description: editForm.description,
                    image: editForm.image,
                    icon: editForm.icon,
                    geoZoneId: editForm.geoZoneId ? String(editForm.geoZoneId) : null,
                    centerLatitude: editForm.centerLatitude ? parseFloat(editForm.centerLatitude) : null,
                    centerLongitude: editForm.centerLongitude ? parseFloat(editForm.centerLongitude) : null,
                    radiusMeters: editForm.radiusMeters ? parseInt(editForm.radiusMeters, 10) : null
                }
            });
            setSaveStatus('✅ Enregistré avec succès !');
            loadData();
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (e: any) {
            setSaveStatus(`❌ Erreur : ${e.message}`);
        }
    };

    const handleCreate = async () => {
        try {
            setCreateStatus('⏳ Création...');
            await fetchGraphQL(CREATE_MARKET, {
                input: {
                    name: createForm.name,
                    slug: createForm.slug,
                    description: createForm.description,
                    image: createForm.image,
                    icon: createForm.icon,
                    geoZoneId: createForm.geoZoneId ? String(createForm.geoZoneId) : null,
                    centerLatitude: createForm.centerLatitude ? parseFloat(createForm.centerLatitude) : null,
                    centerLongitude: createForm.centerLongitude ? parseFloat(createForm.centerLongitude) : null,
                    radiusMeters: createForm.radiusMeters ? parseInt(createForm.radiusMeters, 10) : null
                }
            });
            setCreateStatus('✅ Marché créé avec succès !');
            setCreateForm({
                name: '',
                slug: '',
                description: '',
                centerLatitude: 6.3654,
                centerLongitude: 2.4183,
                radiusMeters: 500,
                geoZoneId: '',
                image: '',
                icon: ''
            });
            setShowCreate(false);
            loadData();
            setTimeout(() => setCreateStatus(''), 3000);
        } catch (e: any) {
            setCreateStatus(`❌ Erreur : ${e.message}`);
        }
    };

    const handleDelete = async (marketId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce marché physique ?')) {
            return;
        }
        try {
            await fetchGraphQL(DELETE_MARKET, { id: marketId });
            if (editingMarket?.id === marketId) {
                setEditingMarket(null);
            }
            loadData();
        } catch (e: any) {
            alert(`Erreur de suppression : ${e.message}`);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Left Panel: Markets List */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Marchés Actifs ({markets.length})
                    </h3>
                    <button 
                        onClick={() => setShowCreate(!showCreate)} 
                        style={{ padding: '6px 12px', background: showCreate ? '#64748b' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {showCreate ? 'Annuler' : '＋ Créer un Marché'}
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Chargement...</div>
                ) : markets.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>
                        Aucun marché créé. Cliquez sur Créer pour commencer.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '500px' }}>
                        {markets.map(m => (
                            <div 
                                key={m.id}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', transition: 'all 0.15s' }}
                            >
                                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setEditingMarket(m); setEditForm({ ...m, geoZoneId: m.geoZone?.id || '' }); }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {m.icon ? (
                                            <img src={getAssetUrl(m.icon)} alt="" style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }} />
                                        ) : (
                                            <span>🏪</span>
                                        )}
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{m.name}</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '10px' }}>
                                        <span>/{m.slug}</span>
                                        {m.geoZone && <span>Zone: {m.geoZone.name}</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={() => { setEditingMarket(m); setEditForm({ ...m, geoZoneId: m.geoZone?.id || '' }); }} 
                                        style={{ padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', color: '#334155' }}
                                    >
                                        Éditer
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(m.id)} 
                                        style={{ padding: '4px 8px', background: '#fef2f2', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', color: '#ef4444' }}
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Right Panel: Creation / Editor Panel */}
            <div style={{ width: '400px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                {showCreate ? (
                    // Create Form
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            🏪 Nouveau Marché Physique
                        </h3>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Nom</label>
                            <input 
                                type="text" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={createForm.name} 
                                onChange={e => setCreateForm((prev: any) => ({ ...prev, name: e.target.value }))} 
                            />
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Slug (Lien URL)</label>
                            <input 
                                type="text" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={createForm.slug} 
                                onChange={e => setCreateForm((prev: any) => ({ ...prev, slug: e.target.value }))} 
                            />
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Description</label>
                            <textarea 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={createForm.description} 
                                onChange={e => setCreateForm((prev: any) => ({ ...prev, description: e.target.value }))} 
                                rows={2}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Rattaché à la Zone</label>
                                <select 
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: 'auto' }}
                                    value={createForm.geoZoneId} 
                                    onChange={e => setCreateForm((prev: any) => ({ ...prev, geoZoneId: e.target.value }))}
                                >
                                    <option value="">Aucune zone</option>
                                    {geoZones.map(z => (
                                        <option key={z.id} value={z.id}>{z.name} ({z.type})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Rayon (Mètres)</label>
                                <input 
                                    type="number" 
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                    value={createForm.radiusMeters} 
                                    onChange={e => setCreateForm((prev: any) => ({ ...prev, radiusMeters: parseInt(e.target.value, 10) }))} 
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Latitude</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                    value={createForm.centerLatitude} 
                                    onChange={e => setCreateForm((prev: any) => ({ ...prev, centerLatitude: parseFloat(e.target.value) }))} 
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Longitude</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                    value={createForm.centerLongitude} 
                                    onChange={e => setCreateForm((prev: any) => ({ ...prev, centerLongitude: parseFloat(e.target.value) }))} 
                                />
                            </div>
                        </div>
                        <OSMSelector 
                            placeholder="Rechercher l'emplacement du marché..."
                            onSelect={(res) => {
                                setCreateForm((prev: any) => ({
                                    ...prev,
                                    name: prev.name || res.name,
                                    slug: prev.slug || res.name.toLowerCase().replace(/\s+/g, '-'),
                                    centerLatitude: res.lat,
                                    centerLongitude: res.lng
                                }));
                            }}
                        />
                        <MapPicker 
                            lat={createForm.centerLatitude}
                            lng={createForm.centerLongitude}
                            radius={createForm.radiusMeters}
                            onChange={(lat, lng) => setCreateForm((prev: any) => ({ ...prev, centerLatitude: lat, centerLongitude: lng }))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: createStatus.startsWith('❌') ? '#ef4444' : '#10b981' }}>{createStatus}</span>
                            <button 
                                onClick={handleCreate} 
                                className="btn-pro btn-pro-primary"
                                style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                ) : editingMarket ? (
                    // Edit Form
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            📝 Modifier: {editingMarket.name}
                        </h3>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Nom du Marché</label>
                            <input 
                                type="text" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={editForm.name || ''} 
                                onChange={e => handleEditInputChange('name', e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Slug</label>
                            <input 
                                type="text" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={editForm.slug || ''} 
                                onChange={e => handleEditInputChange('slug', e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Description</label>
                            <textarea 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={editForm.description || ''} 
                                onChange={e => handleEditInputChange('description', e.target.value)} 
                                rows={2}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Rattaché à la Zone</label>
                                <select 
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: 'auto' }}
                                    value={editForm.geoZoneId || ''} 
                                    onChange={e => handleEditInputChange('geoZoneId', e.target.value)}
                                >
                                    <option value="">Aucune zone</option>
                                    {geoZones.map(z => (
                                        <option key={z.id} value={z.id}>{z.name} ({z.type})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Rayon (Mètres)</label>
                                <input 
                                    type="number" 
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                    value={editForm.radiusMeters ?? ''} 
                                    onChange={e => handleEditInputChange('radiusMeters', e.target.value)} 
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Latitude</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                    value={editForm.centerLatitude ?? ''} 
                                    onChange={e => handleEditInputChange('centerLatitude', e.target.value)} 
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Longitude</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                    value={editForm.centerLongitude ?? ''} 
                                    onChange={e => handleEditInputChange('centerLongitude', e.target.value)} 
                                />
                            </div>
                        </div>
                        <OSMSelector 
                            placeholder="Rechercher l'emplacement du marché..."
                            onSelect={(res) => {
                                handleEditInputChange('centerLatitude', res.lat);
                                handleEditInputChange('centerLongitude', res.lng);
                            }}
                        />
                        <MapPicker 
                            lat={editForm.centerLatitude}
                            lng={editForm.centerLongitude}
                            radius={editForm.radiusMeters}
                            onChange={(lat, lng) => {
                                handleEditInputChange('centerLatitude', lat);
                                handleEditInputChange('centerLongitude', lng);
                            }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                            <FileUploadField 
                                label="Image de Couverture"
                                value={editForm.image || ''}
                                onChange={url => handleEditInputChange('image', url)}
                            />
                            <FileUploadField 
                                label="Icône"
                                value={editForm.icon || ''}
                                onChange={url => handleEditInputChange('icon', url)}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: saveStatus.startsWith('❌') ? '#ef4444' : '#10b981' }}>{saveStatus}</span>
                            <button 
                                onClick={handleSave} 
                                className="btn-pro btn-pro-primary"
                                style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                ) : (
                    // Default view
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '300px', color: '#94a3b8', textAlign: 'center' }}>
                        <span style={{ fontSize: '2rem', marginBottom: '12px' }}>🏪</span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sélectionnez un marché dans la liste à gauche ou créez-en un nouveau.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
