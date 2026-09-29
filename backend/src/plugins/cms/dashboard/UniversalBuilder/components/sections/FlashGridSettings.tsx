import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';

interface FlashGridSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const FlashGridSettings = ({ data, onSave }: FlashGridSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            title: '',
            columns: 4,
            take: 24,
            cardStyle: 'standard',
            showVendor: true,
            showMarket: true,
            emptyMessage: 'Aucune offre flash disponible pour le moment.',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">📦 Grille des Produits Ventes Flash</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Nombre de colonnes (Desktop)</label>
                        <select className="input-pro" value={config.columns || 4} onChange={(e) => handleChange('columns', parseInt(e.target.value))}>
                            <option value={2}>2 Colonnes</option>
                            <option value={3}>3 Colonnes</option>
                            <option value={4}>4 Colonnes</option>
                            <option value={5}>5 Colonnes</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Nombre maximum d'articles</label>
                        <input className="input-pro" type="number" min={4} max={100} value={config.take || 24} onChange={(e) => handleChange('take', parseInt(e.target.value))} />
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showVendor !== false} 
                                onChange={(e) => handleChange('showVendor', e.target.checked)} 
                            /> 
                            Afficher le nom de la boutique vendeuse
                        </label>
                    </div>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showMarket !== false} 
                                onChange={(e) => handleChange('showMarket', e.target.checked)} 
                            /> 
                            Afficher le marché physique (ex: Dantokpa)
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
