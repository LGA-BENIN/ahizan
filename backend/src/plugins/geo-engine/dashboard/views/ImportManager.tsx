import React, { useState } from 'react';
import { fetchGraphQL } from '../../../cms/dashboard/lib/utils';

const IMPORT_OSM = `
  mutation ImportOSM($zoneId: ID!, $query: String!) {
    importBoundaryFromOSM(zoneId: $zoneId, query: $query) {
      id
      name
    }
  }
`;

const IMPORT_MASSIVE = `
  mutation ImportMassive($base64: String!, $format: String!, $type: String!) {
    importMassiveData(base64Content: $base64, format: $format, type: $type)
  }
`;

export function ImportManager() {
    // OSM States
    const [osmQuery, setOsmQuery] = useState('');
    const [osmTargetId, setOsmTargetId] = useState('');
    const [osmStatus, setOsmStatus] = useState('');

    // Massive States
    const [importType, setImportType] = useState('GEOZONE');
    const [importFormat, setImportFormat] = useState('csv');
    const [importStatus, setImportStatus] = useState('');

    const downloadCSVTemplate = (type: string) => {
        let headers = '';
        let example = '';
        let filename = '';

        if (type === 'GEOZONE') {
            headers = 'name,slug,type,code,parentSlug,centerLatitude,centerLongitude,radiusMeters';
            example = 'Littoral,littoral,DEPARTMENT,,benin,6.3654,2.4183,\nCotonou,cotonou,COMMUNE,00229,littoral,6.3654,2.4183,';
            filename = 'modele_subdivisions.csv';
        } else if (type === 'MARKET') {
            headers = 'name,slug,description,centerLatitude,centerLongitude,radiusMeters,geoZoneSlug';
            example = 'Marché Dantokpa,marche-dantokpa,Le plus grand marché à ciel ouvert de l\'Afrique de l\'Ouest,6.3636,2.4364,500,cotonou\nMarché Gbégamey,marche-gbegamey,Marché de quartier à Gbégamey,6.3582,2.4012,300,cotonou';
            filename = 'modele_marches.csv';
        } else if (type === 'DELIVERYZONE') {
            headers = 'ownerId,price,geoZoneSlug,isActive';
            example = '1,1000,cotonou,true\n1,1500,abomey-calavi,true';
            filename = 'modele_zones_livraison.csv';
        }

        const csvContent = `${headers}\n${example}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOSMImport = async () => {
        if (!osmQuery || !osmTargetId) {
            alert('Veuillez remplir la recherche et l\'ID de la zone cible.');
            return;
        }
        try {
            setOsmStatus('⏳ Importation en cours...');
            await fetchGraphQL(IMPORT_OSM, { zoneId: osmTargetId, query: osmQuery });
            setOsmStatus('✅ Frontière importée et simplifiée avec succès !');
        } catch (e: any) {
            setOsmStatus(`❌ Erreur : ${e.message}`);
        }
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setImportStatus('❌ Erreur: Le fichier dépasse la limite de 10 Mo.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                setImportStatus('⏳ Importation en cours...');
                const base64 = (reader.result as string).split(',')[1] || (reader.result as string);
                const res = await fetchGraphQL(IMPORT_MASSIVE, { base64, format: importFormat, type: importType });
                const count = res?.importMassiveData?.count ?? 0;
                setImportStatus(`✅ Import réussi : ${count} éléments importés !`);
            } catch (err: any) {
                setImportStatus(`❌ Erreur : ${err.message}`);
            }
        };
        reader.onerror = () => {
            setImportStatus('❌ Erreur de lecture du fichier.');
        };
        reader.readAsDataURL(file);
    };

    return (
        <div style={{ display: 'flex', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* OSM card */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🌍 Importateur de frontières OSM (Nominatim)
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Interrogez la base de données cartographique libre d'OpenStreetMap pour extraire et lier automatiquement les limites géométriques (polygones PostGIS) d'une subdivision.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    <div>
                        <label className="label-pro" style={{ fontSize: '0.75rem' }}>Nom de la ville / subdivision (ex: Cotonou, Benin)</label>
                        <input 
                            type="text" 
                            className="input-pro" 
                            placeholder="Cotonou, Benin"
                            value={osmQuery}
                            onChange={e => setOsmQuery(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="label-pro" style={{ fontSize: '0.75rem' }}>ID de la subdivision cible (GeoZone)</label>
                        <input 
                            type="number" 
                            className="input-pro" 
                            placeholder="ex: 1"
                            value={osmTargetId}
                            onChange={e => setOsmTargetId(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: osmStatus.startsWith('❌') ? '#ef4444' : '#10b981' }}>{osmStatus}</span>
                    <button 
                        onClick={handleOSMImport} 
                        className="btn-pro btn-pro-primary"
                        style={{ padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        Démarrer l'import
                    </button>
                </div>
            </div>

            {/* Massive Upload card */}
            <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📥 Moteur d'importation massive (CSV / Excel / GeoJSON)
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Importez massivement toutes les subdivisions d'un pays ou les marchés à l'aide de fichiers structurés. La taille du fichier est limitée à 10 Mo par mesure de sécurité.
                </p>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <div style={{ flex: 1 }}>
                        <label className="label-pro" style={{ fontSize: '0.75rem' }}>Type de données</label>
                        <select 
                            className="input-pro" 
                            style={{ height: 'auto', padding: '8px 10px', fontSize: '0.8rem' }}
                            value={importType}
                            onChange={e => setImportType(e.target.value)}
                        >
                            <option value="GEOZONE">Subdivisions Administratives</option>
                            <option value="MARKET">Marchés Commerciaux</option>
                            <option value="DELIVERYZONE">Zones de Livraison</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label className="label-pro" style={{ fontSize: '0.75rem' }}>Format</label>
                        <select 
                            className="input-pro" 
                            style={{ height: 'auto', padding: '8px 10px', fontSize: '0.8rem' }}
                            value={importFormat}
                            onChange={e => setImportFormat(e.target.value)}
                        >
                            <option value="csv">CSV (.csv)</option>
                            <option value="xlsx">Excel (.xlsx)</option>
                            <option value="xls">Excel (.xls)</option>
                            <option value="geojson">GeoJSON (.geojson)</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px', background: '#f8fafc', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center' }}>📂 Modèles :</span>
                    <button 
                        onClick={() => downloadCSVTemplate('GEOZONE')}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                        Subdivisions.csv
                    </button>
                    <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>|</span>
                    <button 
                        onClick={() => downloadCSVTemplate('MARKET')}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                        Marchés.csv
                    </button>
                    <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>|</span>
                    <button 
                        onClick={() => downloadCSVTemplate('DELIVERYZONE')}
                        style={{ background: 'none', border: 'none', color: '#4f46e5', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                        ZonesLivraison.csv
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <label className="label-pro" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Sélectionner le fichier à importer</label>
                    <input 
                        type="file" 
                        accept={importFormat === 'geojson' ? '.geojson' : importFormat === 'csv' ? '.csv' : '.xlsx,.xls'}
                        onChange={handleFileImport}
                        style={{ fontSize: '0.8rem', marginTop: '4px' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', marginTop: '12px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: importStatus.startsWith('❌') ? '#ef4444' : '#10b981' }}>{importStatus}</span>
                </div>
            </div>
        </div>
    );
}
