import React, { useState, useEffect } from 'react';
import { fetchGraphQL } from '../../lib/utils';

interface RuleConditionEditorProps {
    rulesJson: string | null | undefined;
    onChange: (newRulesJson: string) => void;
}

interface GeoZoneItem {
    id: string;
    name: string;
    code: string;
    type?: string;
}

const FETCH_REAL_GEO_ENGINE_ZONES = `
  query GetRealGeoEngineZones {
    geoZones {
      id
      name
      slug
      type
    }
    markets {
      id
      name
      slug
    }
  }
`;

export const RuleConditionEditor = ({ rulesJson, onChange }: RuleConditionEditorProps) => {
    const [rules, setRules] = useState<any>({
        geoZones: [],
        timeRange: { start: '', end: '' },
        userSegment: 'ALL'
    });
    const [dbZones, setDbZones] = useState<GeoZoneItem[]>([]);
    const [loadingZones, setLoadingZones] = useState<boolean>(true);
    const [selectedDropdownZone, setSelectedDropdownZone] = useState<string>('');

    useEffect(() => {
        if (rulesJson) {
            try {
                const parsed = JSON.parse(rulesJson);
                setRules({
                    geoZones: parsed.geoZones || [],
                    timeRange: parsed.timeRange || { start: '', end: '' },
                    userSegment: parsed.userSegment || 'ALL'
                });
            } catch (e) {
                console.error('Error parsing rulesJson:', e);
            }
        }
    }, [rulesJson]);

    // Charge STRICTEMENT les GeoZones & Marchés réels depuis la base de données PostGIS / GeoEngine
    useEffect(() => {
        let isMounted = true;
        setLoadingZones(true);
        fetchGraphQL(FETCH_REAL_GEO_ENGINE_ZONES)
            .then((data: any) => {
                if (!isMounted) return;
                const fetchedList: GeoZoneItem[] = [];

                if (data?.geoZones && Array.isArray(data.geoZones)) {
                    data.geoZones.forEach((loc: any) => {
                        const code = (loc.slug || loc.name || String(loc.id)).toUpperCase().replace(/[^A-Z0-9]/g, '_');
                        fetchedList.push({ id: String(loc.id), name: `${loc.name} (${loc.type || 'ZONE'})`, code, type: loc.type || 'ZONE' });
                    });
                }

                if (data?.markets && Array.isArray(data.markets)) {
                    data.markets.forEach((m: any) => {
                        const code = (m.slug || m.name).toUpperCase().replace(/[^A-Z0-9]/g, '_');
                        if (!fetchedList.some(z => z.code === code)) {
                            fetchedList.push({ id: String(m.id), name: `Marché : ${m.name}`, code, type: 'MARKET' });
                        }
                    });
                }

                if (isMounted) {
                    setDbZones(fetchedList);
                    setLoadingZones(false);
                }
            })
            .catch(err => {
                console.error('[RuleConditionEditor] Failed to fetch dynamic GeoZones:', err);
                if (isMounted) setLoadingZones(false);
            });

        return () => { isMounted = false; };
    }, []);

    const updateRules = (updated: any) => {
        setRules(updated);
        onChange(JSON.stringify(updated));
    };

    const addZoneByCode = (code: string) => {
        if (!code) return;
        if (!rules.geoZones.includes(code)) {
            const updatedGeoZones = [...rules.geoZones, code];
            updateRules({ ...rules, geoZones: updatedGeoZones });
        }
        setSelectedDropdownZone('');
    };

    const removeZoneByCode = (code: string) => {
        const updatedGeoZones = rules.geoZones.filter((z: string) => z !== code);
        updateRules({ ...rules, geoZones: updatedGeoZones });
    };

    const getZoneLabel = (code: string) => {
        const found = dbZones.find(z => z.code === code);
        return found ? `${found.name} [${found.code}]` : code;
    };

    return (
        <div className="p-3 border rounded bg-slate-50 space-y-3 text-xs">
            <h4 className="font-bold text-slate-700 flex items-center gap-1.5 border-b pb-2">
                <span>🎯</span> Éditeur de Règles Conditionnelles EMS (GeoEngine Strict)
            </h4>

            {/* Condition 1: GeoZones Dynamiques de la BDD PostGIS */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold">Restreindre aux GeoZones (Base de données PostGIS / GeoEngine)</label>
                    {loadingZones && <span className="text-[10px] text-blue-600 animate-pulse">Chargement des données réelles de la BDD...</span>}
                </div>

                {/* Liste des GeoZones sélectionnées avec bouton de suppression ✕ */}
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[36px] p-2 bg-white rounded border">
                    {rules.geoZones.length === 0 ? (
                        <span className="text-slate-400 italic text-[11px]">Aucune GeoZone sélectionnée (Visible sur toutes les zones par défaut).</span>
                    ) : (
                        rules.geoZones.map((code: string) => (
                            <span
                                key={code}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600 text-white font-semibold text-xs shadow-sm"
                            >
                                <span>✓ {getZoneLabel(code)}</span>
                                <button
                                    type="button"
                                    onClick={() => removeZoneByCode(code)}
                                    className="w-4 h-4 rounded-full bg-blue-800 hover:bg-red-600 text-white flex items-center justify-center font-bold text-[10px] transition-colors ml-1"
                                    title="Supprimer cette zone"
                                >
                                    ✕
                                </button>
                            </span>
                        ))
                    )}
                </div>

                {/* Sélecteur Déroulant Stricte (Marchés, Quartiers et Communes réels de la BDD) */}
                <div>
                    <label className="block font-semibold text-slate-600 mb-1 text-[11px]">Ajouter une GeoZone ou un Marché réel de votre base de données ({dbZones.length} disponible(s)) :</label>
                    <select
                        value={selectedDropdownZone}
                        onChange={(e) => addZoneByCode(e.target.value)}
                        className="w-full p-2 border rounded text-xs bg-white font-medium text-slate-800"
                        disabled={loadingZones}
                    >
                        <option value="">-- Choisir une zone ou un marché réels dans le GeoEngine ({dbZones.length}) --</option>
                        {dbZones.map(zone => {
                            const isAlreadySelected = rules.geoZones.includes(zone.code);
                            return (
                                <option key={zone.id || zone.code} value={zone.code} disabled={isAlreadySelected}>
                                    {isAlreadySelected ? '✓ ' : ''}{zone.name} [{zone.code}]
                                </option>
                            );
                        })}
                    </select>
                </div>
            </div>

            {/* Condition 2: Plage Horaire */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div>
                    <label className="block font-semibold mb-1">Heure de début</label>
                    <input
                        type="time"
                        value={rules.timeRange?.start || ''}
                        onChange={(e) => updateRules({ ...rules, timeRange: { ...rules.timeRange, start: e.target.value } })}
                        className="w-full p-1.5 border rounded bg-white"
                    />
                </div>
                <div>
                    <label className="block font-semibold mb-1">Heure de fin</label>
                    <input
                        type="time"
                        value={rules.timeRange?.end || ''}
                        onChange={(e) => updateRules({ ...rules, timeRange: { ...rules.timeRange, end: e.target.value } })}
                        className="w-full p-1.5 border rounded bg-white"
                    />
                </div>
            </div>

            {/* Condition 3: Segment Client */}
            <div className="pt-2 border-t">
                <label className="block font-semibold mb-1">Segment Client Cible</label>
                <select
                    value={rules.userSegment || 'ALL'}
                    onChange={(e) => updateRules({ ...rules, userSegment: e.target.value })}
                    className="w-full p-1.5 border rounded bg-white"
                >
                    <option value="ALL">Tous les utilisateurs</option>
                    <option value="NEW_USER">Nouveaux visiteurs (Cold Start)</option>
                    <option value="RETURNING_BUYER">Clients récurrents</option>
                    <option value="VENDOR">Vendeurs certifiés</option>
                </select>
            </div>
        </div>
    );
};
