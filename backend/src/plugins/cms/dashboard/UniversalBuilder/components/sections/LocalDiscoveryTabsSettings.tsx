import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';

interface LocalDiscoveryTabsSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const LocalDiscoveryTabsSettings = ({ data, onSave }: LocalDiscoveryTabsSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            defaultTab: 'products',
            showProductsTab: true,
            showMarketsTab: true,
            showNeighborhoodsTab: true,
            showVendorsTab: true,
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">📑 Barre des 4 Onglets de Découverte Locale</div>
                <div>
                    <label className="label-pro">Onglet actif par défaut</label>
                    <select className="input-pro" value={config.defaultTab || 'products'} onChange={(e) => handleChange('defaultTab', e.target.value)}>
                        <option value="products">🛍️ Produits à Proximité</option>
                        <option value="markets">🏪 Marchés Populaires</option>
                        <option value="neighborhoods">🏘️ Quartiers & Villes</option>
                        <option value="vendors">🏬 Boutiques Certifiées</option>
                    </select>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showProductsTab !== false} 
                                onChange={(e) => handleChange('showProductsTab', e.target.checked)} 
                            /> 
                            Activer l'onglet Produits
                        </label>
                    </div>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showMarketsTab !== false} 
                                onChange={(e) => handleChange('showMarketsTab', e.target.checked)} 
                            /> 
                            Activer l'onglet Marchés
                        </label>
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '0.75rem' }}>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showNeighborhoodsTab !== false} 
                                onChange={(e) => handleChange('showNeighborhoodsTab', e.target.checked)} 
                            /> 
                            Activer l'onglet Quartiers
                        </label>
                    </div>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showVendorsTab !== false} 
                                onChange={(e) => handleChange('showVendorsTab', e.target.checked)} 
                            /> 
                            Activer l'onglet Boutiques
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
