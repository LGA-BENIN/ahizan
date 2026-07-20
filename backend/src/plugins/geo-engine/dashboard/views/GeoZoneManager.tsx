import React, { useEffect, useState } from 'react';
import { fetchGraphQL } from '../../../cms/dashboard/lib/utils';
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
    boundary?: any;
    onChange: (lat: number, lng: number) => void;
}

function MapPicker({ lat, lng, radius, boundary, onChange }: MapPickerProps) {
    const isLoaded = useLeaflet();
    const mapRef = React.useRef<any>(null);
    const markerRef = React.useRef<any>(null);
    const circleRef = React.useRef<any>(null);
    const boundaryLayerRef = React.useRef<any>(null);
    const containerId = React.useMemo(() => `map-${Math.random().toString(36).substr(2, 9)}`, []);

    useEffect(() => {
        if (!isLoaded) return;
        const L = (window as any).L;
        if (!L) return;

        const defaultLat = lat || 6.3654;
        const defaultLng = lng || 2.4183;

        const map = L.map(containerId).setView([defaultLat, defaultLng], 12);
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

    useEffect(() => {
        if (!isLoaded || !mapRef.current) return;
        const L = (window as any).L;
        if (!L) return;

        if (boundaryLayerRef.current) {
            mapRef.current.removeLayer(boundaryLayerRef.current);
            boundaryLayerRef.current = null;
        }

        if (boundary) {
            try {
                const geoJsonLayer = L.geoJSON(boundary, {
                    style: {
                        color: '#ef4444',
                        weight: 3,
                        opacity: 0.8,
                        fillColor: '#ef4444',
                        fillOpacity: 0.15
                    }
                }).addTo(mapRef.current);
                boundaryLayerRef.current = geoJsonLayer;

                const bounds = geoJsonLayer.getBounds();
                if (bounds.isValid()) {
                    mapRef.current.fitBounds(bounds, { padding: [20, 20] });
                }
            } catch (e) {
                console.error('Failed to render boundary GeoJSON on Leaflet map:', e);
            }
        } else if (lat && lng) {
            mapRef.current.setView([lat, lng], 13);
        }
    }, [isLoaded, boundary, lat, lng]);

    return (
        <div style={{ position: 'relative', height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            {!isLoaded && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f1f5f9', color: '#64748b' }}>Chargement de la carte...</div>}
            <div id={containerId} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}

const GET_ZONES = `
  query GetZones($parentId: ID, $topLevelOnly: Boolean) {
    geoZones(parentId: $parentId, topLevelOnly: $topLevelOnly) {
      id
      name
      slug
      code
      type
      status
      centerLatitude
      centerLongitude
      radiusMeters
    }
  }
`;

const GET_ZONE_DETAIL = `
  query GetZoneDetail($id: ID!) {
    geoZone(id: $id) {
      id
      name
      slug
      code
      type
      status
      centerLatitude
      centerLongitude
      radiusMeters
      boundary
      parent {
        id
        name
        type
      }
    }
  }
`;

const UPDATE_ZONE = `
  mutation UpdateGeoZone($id: ID!, $input: UpdateGeoZoneInput!) {
    updateGeoZone(id: $id, input: $input) {
      id
      name
    }
  }
`;

const CREATE_ZONE = `
  mutation CreateGeoZone($input: CreateGeoZoneInput!) {
    createGeoZone(input: $input) {
      id
      name
    }
  }
`;

const DELETE_ZONE = `
  mutation DeleteGeoZone($id: ID!) {
    deleteGeoZone(id: $id) {
      result
      message
    }
  }
`;

const IMPORT_OSM = `
  mutation ImportOSM($zoneId: ID!, $query: String!) {
    importBoundaryFromOSM(zoneId: $zoneId, query: $query) {
      id
      name
    }
  }
`;

export function GeoZoneManager() {
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
    const [currentZoneId, setCurrentZoneId] = useState<string | null>(null);
    const [currentZoneDetail, setCurrentZoneDetail] = useState<any | null>(null);
    
    // Editor Form State
    const [editingZone, setEditingZone] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saveStatus, setSaveStatus] = useState('');

    // Create Form State
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<any>({
        name: '',
        slug: '',
        code: '',
        type: 'QUARTIER',
        status: 'ACTIVE',
        centerLatitude: 6.3654,
        centerLongitude: 2.4183,
        radiusMeters: 1000,
        boundary: null
    });
    const [createStatus, setCreateStatus] = useState('');

    // OSM Search State
    const [osmQuery, setOsmQuery] = useState('');
    const [osmStatus, setOsmStatus] = useState('');

    const loadZones = async (parentId: string | null) => {
        try {
            setLoading(true);
            const variables = parentId ? { parentId } : { topLevelOnly: true };
            const data = await fetchGraphQL(GET_ZONES, variables);
            setZones(data?.geoZones || []);

            if (parentId) {
                const detail = await fetchGraphQL(GET_ZONE_DETAIL, { id: parentId });
                setCurrentZoneDetail(detail?.geoZone);
                setEditingZone(detail?.geoZone);
                setEditForm({ ...detail?.geoZone });
            } else {
                setCurrentZoneDetail(null);
                setEditingZone(null);
                setEditForm({});
            }
        } catch (e) {
            console.error('Failed to load zones:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadZones(currentZoneId);
    }, [currentZoneId]);

    const navigateToZone = async (zone: any) => {
        setBreadcrumbs(prev => {
            if (prev.find(b => b.id === zone.id)) {
                const idx = prev.findIndex(b => b.id === zone.id);
                return prev.slice(0, idx + 1);
            }
            return [...prev, zone];
        });
        setCurrentZoneId(zone.id);
        setShowCreate(false);
    };

    const navigateUpTo = (zoneId: string | null) => {
        if (zoneId === null) {
            setBreadcrumbs([]);
            setCurrentZoneId(null);
        } else {
            const idx = breadcrumbs.findIndex(b => b.id === zoneId);
            setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
            setCurrentZoneId(zoneId);
        }
        setShowCreate(false);
    };

    const handleEditInputChange = (field: string, value: any) => {
        setEditForm((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            setSaveStatus('⏳ Sauvegarde...');
            await fetchGraphQL(UPDATE_ZONE, {
                id: editForm.id,
                input: {
                    name: editForm.name,
                    slug: editForm.slug,
                    code: editForm.code,
                    status: editForm.status,
                    centerLatitude: editForm.centerLatitude ? parseFloat(editForm.centerLatitude) : null,
                    centerLongitude: editForm.centerLongitude ? parseFloat(editForm.centerLongitude) : null,
                    radiusMeters: editForm.radiusMeters ? parseInt(editForm.radiusMeters, 10) : null,
                    boundary: editForm.boundary
                }
            });
            setSaveStatus('✅ Enregistré avec succès !');
            loadZones(currentZoneId);
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (e: any) {
            setSaveStatus(`❌ Erreur : ${e.message}`);
        }
    };

    const handleCreate = async () => {
        try {
            setCreateStatus('⏳ Création...');
            await fetchGraphQL(CREATE_ZONE, {
                input: {
                    name: createForm.name,
                    slug: createForm.slug,
                    code: createForm.code,
                    type: createForm.type,
                    status: createForm.status,
                    parentId: currentZoneId,
                    centerLatitude: createForm.centerLatitude ? parseFloat(createForm.centerLatitude) : null,
                    centerLongitude: createForm.centerLongitude ? parseFloat(createForm.centerLongitude) : null,
                    radiusMeters: createForm.radiusMeters ? parseInt(createForm.radiusMeters, 10) : null,
                    boundary: createForm.boundary
                }
            });
            setCreateStatus('✅ Zone créée avec succès !');
            setCreateForm({
                name: '',
                slug: '',
                code: '',
                type: 'QUARTIER',
                status: 'ACTIVE',
                centerLatitude: 6.3654,
                centerLongitude: 2.4183,
                radiusMeters: 1000,
                boundary: null
            });
            setShowCreate(false);
            loadZones(currentZoneId);
            setTimeout(() => setCreateStatus(''), 3000);
        } catch (e: any) {
            setCreateStatus(`❌ Erreur : ${e.message}`);
        }
    };

    const handleDelete = async (zoneId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette subdivision ? Tous les enfants seront également détachés.')) {
            return;
        }
        try {
            await fetchGraphQL(DELETE_ZONE, { id: zoneId });
            loadZones(currentZoneId);
        } catch (e: any) {
            alert(`Erreur de suppression : ${e.message}`);
        }
    };

    const handleOSMImport = async () => {
        if (!osmQuery || !currentZoneId) return;
        try {
            setOsmStatus('⏳ Import OSM en cours...');
            await fetchGraphQL(IMPORT_OSM, {
                zoneId: currentZoneId,
                query: osmQuery
            });
            setOsmStatus('✅ Frontière OSM importée avec succès !');
            loadZones(currentZoneId);
            setTimeout(() => setOsmStatus(''), 3000);
        } catch (e: any) {
            setOsmStatus(`❌ Erreur : ${e.message}`);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Left Panel: Hierarchy Navigation */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                {/* Breadcrumbs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                    <span style={{ cursor: 'pointer', color: '#4f46e5' }} onClick={() => navigateUpTo(null)}>🌍 Bénin</span>
                    {breadcrumbs.map((b, idx) => (
                        <React.Fragment key={b.id}>
                            <span>/</span>
                            <span 
                                style={{ cursor: 'pointer', color: idx === breadcrumbs.length - 1 ? '#0f172a' : '#4f46e5' }} 
                                onClick={() => navigateUpTo(b.id)}
                            >
                                {b.name}
                            </span>
                        </React.Fragment>
                    ))}
                </div>

                {/* Header & Add Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Subdivisions ({zones.length})
                    </h3>
                    <button 
                        onClick={() => setShowCreate(!showCreate)} 
                        style={{ padding: '6px 12px', background: showCreate ? '#64748b' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {showCreate ? 'Annuler' : '＋ Ajouter'}
                    </button>
                </div>

                {/* Subdivisions List */}
                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Chargement...</div>
                ) : zones.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>
                        Aucune sous-zone ici. Cliquez sur "Ajouter" pour en créer une.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '450px' }}>
                        {zones.map(z => (
                            <div 
                                key={z.id}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', hover: { background: '#f8fafc' }, transition: 'all 0.15s' }}
                            >
                                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => navigateToZone(z)}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{z.name}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                        <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', textTransform: 'lowercase' }}>{z.type}</span>
                                        <span>/{z.slug}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={() => { setEditingZone(z); setEditForm({ ...z }); }} 
                                        style={{ padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', color: '#334155' }}
                                    >
                                        Éditer
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(z.id)} 
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
                            ➕ Nouvelle subdivision
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
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Slug (Optionnel)</label>
                            <input 
                                type="text" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={createForm.slug} 
                                onChange={e => setCreateForm((prev: any) => ({ ...prev, slug: e.target.value }))} 
                            />
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Code (Code postal ou division)</label>
                            <input 
                                type="text" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={createForm.code} 
                                onChange={e => setCreateForm((prev: any) => ({ ...prev, code: e.target.value }))} 
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Type</label>
                                <select 
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: 'auto' }}
                                    value={createForm.type} 
                                    onChange={e => setCreateForm((prev: any) => ({ ...prev, type: e.target.value }))}
                                >
                                    <option value="COUNTRY">Pays</option>
                                    <option value="DEPARTMENT">Département</option>
                                    <option value="COMMUNE">Commune</option>
                                    <option value="ARRONDISSEMENT">Arrondissement</option>
                                    <option value="QUARTIER">Quartier / Village</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Status</label>
                                <select 
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: 'auto' }}
                                    value={createForm.status} 
                                    onChange={e => setCreateForm((prev: any) => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="ACTIVE">Actif</option>
                                    <option value="DRAFT">Brouillon</option>
                                </select>
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
                            placeholder="Rechercher les coordonnées sur OSM..."
                            onSelect={(res) => {
                                setCreateForm((prev: any) => ({
                                    ...prev,
                                    name: prev.name || res.name,
                                    slug: prev.slug || res.name.toLowerCase().replace(/\s+/g, '-'),
                                    centerLatitude: res.lat,
                                    centerLongitude: res.lng,
                                    boundary: res.boundary
                                }));
                            }}
                        />
                        <MapPicker 
                            lat={createForm.centerLatitude}
                            lng={createForm.centerLongitude}
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
                ) : editingZone ? (
                    // Edit Form
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                                📝 Éditeur: {editingZone.name}
                            </h3>
                            <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>ID: {editingZone.id}</span>
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Nom de la division</label>
                            <input 
                                type="text" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={editForm.name || ''} 
                                onChange={e => handleEditInputChange('name', e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Slug (Lien URL)</label>
                            <input 
                                type="text" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={editForm.slug || ''} 
                                onChange={e => handleEditInputChange('slug', e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem' }}>Code postal / division</label>
                            <input 
                                type="text" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                value={editForm.code || ''} 
                                onChange={e => handleEditInputChange('code', e.target.value)} 
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Type</label>
                                <input 
                                    type="text" 
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem', background: '#f1f5f9' }}
                                    value={editForm.type || ''} 
                                    disabled 
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="label-pro" style={{ fontSize: '0.75rem' }}>Status</label>
                                <select 
                                    className="input-pro" 
                                    style={{ padding: '6px 10px', fontSize: '0.8rem', height: 'auto' }}
                                    value={editForm.status || 'ACTIVE'} 
                                    onChange={e => handleEditInputChange('status', e.target.value)}
                                >
                                    <option value="ACTIVE">Actif</option>
                                    <option value="DRAFT">Brouillon</option>
                                </select>
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
                            placeholder="Rechercher les contours sur OSM..."
                            onSelect={(res) => {
                                handleEditInputChange('centerLatitude', res.lat);
                                handleEditInputChange('centerLongitude', res.lng);
                                handleEditInputChange('boundary', res.boundary);
                            }}
                        />
                        <MapPicker 
                            lat={editForm.centerLatitude}
                            lng={editForm.centerLongitude}
                            boundary={editForm.boundary}
                            onChange={(lat, lng) => {
                                handleEditInputChange('centerLatitude', lat);
                                handleEditInputChange('centerLongitude', lng);
                            }}
                        />

                        {/* OSM Boundary Loader inside Editor Panel */}
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
                            <label className="label-pro" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>🌍 Importer le polygone frontière (OSM)</label>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                <input 
                                    type="text" 
                                    className="input-pro" 
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    placeholder="ex: Abomey-Calavi, Benin"
                                    value={osmQuery}
                                    onChange={e => setOsmQuery(e.target.value)}
                                />
                                <button 
                                    onClick={handleOSMImport}
                                    style={{ padding: '4px 10px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Importer
                                </button>
                            </div>
                            {osmStatus && <div style={{ fontSize: '0.65rem', color: osmStatus.startsWith('❌') ? '#ef4444' : '#10b981', marginTop: '6px', fontWeight: 'bold' }}>{osmStatus}</div>}
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
                        <span style={{ fontSize: '2rem', marginBottom: '12px' }}>🗺️</span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sélectionnez une subdivision administrative ou cliquez sur Éditer pour modifier ses coordonnées et frontières.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
