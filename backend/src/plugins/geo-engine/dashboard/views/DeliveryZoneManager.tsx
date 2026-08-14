import React, { useEffect, useState } from 'react';
import { fetchGraphQL } from '../../../cms/dashboard/lib/utils';

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
    otherZones?: any[];
    onChange: (lat: number, lng: number) => void;
}

function MapPicker({ lat, lng, radius, boundary, otherZones, onChange }: MapPickerProps) {
    const isLoaded = useLeaflet();
    const mapRef = React.useRef<any>(null);
    const markerRef = React.useRef<any>(null);
    const circleRef = React.useRef<any>(null);
    const boundaryLayerRef = React.useRef<any>(null);
    const otherZonesLayerRef = React.useRef<any>(null);
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
                const parsedBoundary = typeof boundary === 'string' ? JSON.parse(boundary) : boundary;
                const geoJsonLayer = L.geoJSON(parsedBoundary, {
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

    useEffect(() => {
        if (!isLoaded || !mapRef.current) return;
        const L = (window as any).L;
        if (!L) return;

        if (otherZonesLayerRef.current) {
            mapRef.current.removeLayer(otherZonesLayerRef.current);
            otherZonesLayerRef.current = null;
        }

        if (otherZones && otherZones.length > 0) {
            const layerGroup = L.layerGroup();
            otherZones.forEach(z => {
                let zBoundary = z.polygonGeometry || z.geoZone?.boundary;
                if (typeof zBoundary === 'string') {
                    try { zBoundary = JSON.parse(zBoundary); } catch (e) {}
                }
                const zRadius = z.radiusMeters || z.geoZone?.radiusMeters;
                const zLat = z.centerLatitude || z.geoZone?.centerLatitude;
                const zLng = z.centerLongitude || z.geoZone?.centerLongitude;
                
                if (zBoundary) {
                    try {
                        L.geoJSON(zBoundary, {
                            style: { color: '#94a3b8', weight: 2, opacity: 0.5, fillColor: '#94a3b8', fillOpacity: 0.1 }
                        }).addTo(layerGroup);
                    } catch (e) {}
                } else if (zLat && zLng && zRadius) {
                    L.circle([zLat, zLng], {
                        radius: zRadius,
                        color: '#94a3b8',
                        weight: 2,
                        fillColor: '#94a3b8',
                        fillOpacity: 0.1
                    }).addTo(layerGroup);
                }
            });
            layerGroup.addTo(mapRef.current);
            otherZonesLayerRef.current = layerGroup;
        }
    }, [isLoaded, otherZones]);

    return (
        <div style={{ position: 'relative', height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            {!isLoaded && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f1f5f9', color: '#64748b' }}>Chargement de la carte...</div>}
            <div id={containerId} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}

const FETCH_DELIVERY_ZONES = `
  query GetDeliveryZones {
    deliveryZones {
      id
      price
      maxPrice
      isActive
      ownerId
      centerLatitude
      centerLongitude
      radiusMeters
      geoZone {
        id
        name
        type
        centerLatitude
        centerLongitude
        radiusMeters
        boundary
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
      centerLatitude
      centerLongitude
      radiusMeters
      boundary
    }
  }
`;

const UPDATE_DELIVERY_ZONE = `
  mutation UpdateDeliveryZone($id: ID!, $input: UpdateDeliveryZoneInput!) {
    updateDeliveryZone(id: $id, input: $input) {
      id
      price
      maxPrice
    }
  }
`;

const CREATE_DELIVERY_ZONE = `
  mutation CreateDeliveryZone($input: CreateDeliveryZoneInput!) {
    createDeliveryZone(input: $input) {
      id
      price
      maxPrice
    }
  }
`;

const DELETE_DELIVERY_ZONE = `
  mutation DeleteDeliveryZone($id: ID!) {
    deleteDeliveryZone(id: $id) {
      result
      message
    }
  }
`;

export function DeliveryZoneManager() {
    const [zones, setZones] = useState<any[]>([]);
    const [geoZones, setGeoZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingZone, setEditingZone] = useState<any | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saveStatus, setSaveStatus] = useState('');

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<any>({
        ownerId: '',
        price: 1000,
        maxPrice: 3000,
        isActive: true,
        geoZoneId: '',
        centerLatitude: 6.3654,
        centerLongitude: 2.4183,
        radiusMeters: 5000
    });
    const [createStatus, setCreateStatus] = useState('');

    const loadZones = async () => {
        try {
            setLoading(true);
            const data = await fetchGraphQL(FETCH_DELIVERY_ZONES);
            setZones(data?.deliveryZones || []);

            const zonesData = await fetchGraphQL(FETCH_GEO_ZONES_SIMPLE);
            setGeoZones(zonesData?.geoZones || []);
        } catch (e) {
            console.error('Failed to load delivery zones:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadZones();
    }, []);

    const handleEditInputChange = (field: string, value: any) => {
        setEditForm((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            setSaveStatus('⏳ Sauvegarde...');
            await fetchGraphQL(UPDATE_DELIVERY_ZONE, {
                id: editForm.id,
                input: {
                    price: editForm.price ? parseInt(editForm.price, 10) : 0,
                    maxPrice: editForm.maxPrice ? parseInt(editForm.maxPrice, 10) : null,
                    isActive: editForm.isActive === true || editForm.isActive === 'true',
                    geoZoneId: editForm.geoZoneId ? String(editForm.geoZoneId) : null,
                    ownerId: editForm.ownerId ? String(editForm.ownerId) : null,
                    centerLatitude: editForm.centerLatitude ? parseFloat(editForm.centerLatitude) : null,
                    centerLongitude: editForm.centerLongitude ? parseFloat(editForm.centerLongitude) : null,
                    radiusMeters: editForm.radiusMeters ? parseFloat(editForm.radiusMeters) : null,
                }
            });
            setSaveStatus('✅ Enregistré avec succès !');
            loadZones();
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (e: any) {
            setSaveStatus(`❌ Erreur : ${e.message}`);
        }
    };

    const handleCreate = async () => {
        try {
            setCreateStatus('⏳ Création...');
            await fetchGraphQL(CREATE_DELIVERY_ZONE, {
                input: {
                    ownerId: createForm.ownerId ? String(createForm.ownerId) : null,
                    price: createForm.price ? parseInt(createForm.price, 10) : 0,
                    maxPrice: createForm.maxPrice ? parseInt(createForm.maxPrice, 10) : null,
                    isActive: createForm.isActive === true || createForm.isActive === 'true',
                    geoZoneId: createForm.geoZoneId ? String(createForm.geoZoneId) : null,
                    centerLatitude: createForm.centerLatitude ? parseFloat(createForm.centerLatitude) : null,
                    centerLongitude: createForm.centerLongitude ? parseFloat(createForm.centerLongitude) : null,
                    radiusMeters: createForm.radiusMeters ? parseFloat(createForm.radiusMeters) : null,
                }
            });
            setCreateStatus('✅ Zone créée avec succès !');
            setCreateForm({
                ownerId: '',
                price: 1000,
                maxPrice: 3000,
                isActive: true,
                geoZoneId: '',
                centerLatitude: 6.3654,
                centerLongitude: 2.4183,
                radiusMeters: 5000
            });
            setShowCreate(false);
            loadZones();
            setTimeout(() => setCreateStatus(''), 3000);
        } catch (e: any) {
            setCreateStatus(`❌ Erreur : ${e.message}`);
        }
    };

    const handleDelete = async (zoneId: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette zone de livraison ?')) {
            return;
        }
        try {
            await fetchGraphQL(DELETE_DELIVERY_ZONE, { id: zoneId });
            if (editingZone?.id === zoneId) {
                setEditingZone(null);
            }
            loadZones();
        } catch (e: any) {
            alert(`Erreur de suppression : ${e.message}`);
        }
    };

    const selectedCreateZone = geoZones.find(z => String(z.id) === String(createForm.geoZoneId));
    const selectedEditZone = geoZones.find(z => String(z.id) === String(editForm.geoZoneId));

    return (
        <div style={{ display: 'flex', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Left Panel: Zones List */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        Zones de Livraison ({zones.length})
                    </h3>
                    <button 
                        onClick={() => setShowCreate(!showCreate)} 
                        style={{ padding: '6px 12px', background: showCreate ? '#64748b' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {showCreate ? 'Annuler' : '＋ Ajouter une Zone'}
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Chargement...</div>
                ) : zones.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>
                        Aucune zone de livraison définie. Cliquez sur "Ajouter" pour en créer une.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '500px' }}>
                        {zones.map(z => (
                            <div 
                                key={z.id}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', transition: 'all 0.15s' }}
                            >
                                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => { setEditingZone(z); setEditForm({ ...z, geoZoneId: z.geoZone?.id || '' }); }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                                        {z.geoZone ? `Livraison ${z.geoZone.name} (${z.geoZone.type})` : `Zone ID: ${z.id}`}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <span>Frais : <b>{z.price} FCFA</b></span>
                                        {z.maxPrice != null && <span style={{ color: '#4f46e5', fontWeight: 800 }}>Prix Max Région : {z.maxPrice} FCFA</span>}
                                        <span>Vendeur ID: {z.ownerId || 'Globale (Admin)'}</span>
                                        {(z.radiusMeters || z.geoZone?.radiusMeters) && <span>Rayon: {((z.radiusMeters || z.geoZone?.radiusMeters) / 1000).toFixed(1)} km</span>}
                                        <span style={{ color: z.isActive ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{z.isActive ? 'Actif' : 'Inactif'}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={() => { setEditingZone(z); setEditForm({ ...z, geoZoneId: z.geoZone?.id || '' }); }} 
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
            <div style={{ width: '420px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                {showCreate ? (
                    // Create Form
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            🚚 Nouvelle Zone de Livraison
                        </h3>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Rattaché à la Zone administrative</label>
                            <select 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                value={createForm.geoZoneId || ''} 
                                onChange={e => setCreateForm((prev: any) => ({ ...prev, geoZoneId: e.target.value }))}
                            >
                                <option value="">Sélectionner une zone</option>
                                {geoZones.map(z => (
                                    <option key={z.id} value={z.id}>{z.name} ({z.type})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5' }}>Prix Max Région / Plafond (FCFA)</label>
                            <input 
                                type="number" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '2px solid #6366f1', fontWeight: 800 }}
                                value={createForm.maxPrice ?? ''} 
                                onChange={e => setCreateForm((prev: any) => ({ ...prev, maxPrice: e.target.value ? parseFloat(e.target.value) : null }))} 
                                placeholder="ex: 1500"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label className="label-pro" style={{ fontSize: '0.7rem' }}>Latitude Centre</label>
                                <input 
                                    type="number" 
                                    step="0.0001"
                                    className="input-pro" 
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    value={createForm.centerLatitude ?? ''} 
                                    onChange={e => setCreateForm((prev: any) => ({ ...prev, centerLatitude: e.target.value }))} 
                                />
                            </div>
                            <div>
                                <label className="label-pro" style={{ fontSize: '0.7rem' }}>Longitude Centre</label>
                                <input 
                                    type="number" 
                                    step="0.0001"
                                    className="input-pro" 
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    value={createForm.centerLongitude ?? ''} 
                                    onChange={e => setCreateForm((prev: any) => ({ ...prev, centerLongitude: e.target.value }))} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.7rem' }}>Rayon personnalisé (Mètres)</label>
                            <input 
                                type="number" 
                                className="input-pro" 
                                style={{ padding: '4px 8px', fontSize: '0.75rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                value={createForm.radiusMeters ?? ''} 
                                onChange={e => setCreateForm((prev: any) => ({ ...prev, radiusMeters: e.target.value }))} 
                                placeholder="ex: 5000"
                            />
                        </div>
                        <MapPicker 
                            lat={Number(createForm.centerLatitude) || selectedCreateZone?.centerLatitude}
                            lng={Number(createForm.centerLongitude) || selectedCreateZone?.centerLongitude}
                            radius={Number(createForm.radiusMeters) || selectedCreateZone?.radiusMeters}
                            boundary={selectedCreateZone?.boundary}
                            otherZones={zones}
                            onChange={(lat, lng) => {
                                setCreateForm((prev: any) => ({ ...prev, centerLatitude: lat, centerLongitude: lng }));
                            }}
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
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            📝 Modifier la Zone de Livraison
                        </h3>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Rattaché à la Zone administrative</label>
                            <select 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                value={editForm.geoZoneId || ''} 
                                onChange={e => handleEditInputChange('geoZoneId', e.target.value)}
                            >
                                <option value="">Sélectionner une zone</option>
                                {geoZones.map(z => (
                                    <option key={z.id} value={z.id}>{z.name} ({z.type})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5' }}>Prix Max Région / Plafond (FCFA)</label>
                            <input 
                                type="number" 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '2px solid #6366f1', fontWeight: 800 }}
                                value={editForm.maxPrice ?? ''} 
                                onChange={e => handleEditInputChange('maxPrice', e.target.value)} 
                                placeholder="ex: 1500"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label className="label-pro" style={{ fontSize: '0.7rem' }}>Latitude Centre</label>
                                <input 
                                    type="number" 
                                    step="0.0001"
                                    className="input-pro" 
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    value={editForm.centerLatitude ?? ''} 
                                    onChange={e => handleEditInputChange('centerLatitude', e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="label-pro" style={{ fontSize: '0.7rem' }}>Longitude Centre</label>
                                <input 
                                    type="number" 
                                    step="0.0001"
                                    className="input-pro" 
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    value={editForm.centerLongitude ?? ''} 
                                    onChange={e => handleEditInputChange('centerLongitude', e.target.value)} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.7rem' }}>Rayon personnalisé (Mètres)</label>
                            <input 
                                type="number" 
                                className="input-pro" 
                                style={{ padding: '4px 8px', fontSize: '0.75rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                value={editForm.radiusMeters ?? ''} 
                                onChange={e => handleEditInputChange('radiusMeters', e.target.value)} 
                                placeholder="ex: 5000"
                            />
                        </div>
                        <div>
                            <label className="label-pro" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Status</label>
                            <select 
                                className="input-pro" 
                                style={{ padding: '6px 10px', fontSize: '0.8rem', width: '100%', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                value={editForm.isActive === true || editForm.isActive === 'true' ? 'true' : 'false'} 
                                onChange={e => handleEditInputChange('isActive', e.target.value === 'true')}
                            >
                                <option value="true">Actif</option>
                                <option value="false">Inactif</option>
                            </select>
                        </div>
                        <MapPicker 
                            lat={Number(editForm.centerLatitude) || selectedEditZone?.centerLatitude}
                            lng={Number(editForm.centerLongitude) || selectedEditZone?.centerLongitude}
                            radius={Number(editForm.radiusMeters) || selectedEditZone?.radiusMeters}
                            boundary={selectedEditZone?.boundary || editForm.geoZone?.boundary}
                            otherZones={zones.filter(z => z.id !== editForm.id)}
                            onChange={(lat, lng) => {
                                handleEditInputChange('centerLatitude', lat);
                                handleEditInputChange('centerLongitude', lng);
                            }}
                        />
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
                        <span style={{ fontSize: '2rem', marginBottom: '12px' }}>🚚</span>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Sélectionnez une zone de livraison dans la liste ou créez-en une nouvelle.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
