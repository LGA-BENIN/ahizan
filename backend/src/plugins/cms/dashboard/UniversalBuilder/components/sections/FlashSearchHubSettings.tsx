import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';

interface FlashSearchHubSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const FlashSearchHubSettings = ({ data, onSave }: FlashSearchHubSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            showSearch: true,
            showDiscountFilters: true,
            showPriceFilter: true,
            showSort: true,
            enableCatalogFallback: true,
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">🔍 Barre de recherche et Filtres des Ventes Flash</div>
                <div className="grid-2">
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showSearch !== false} 
                                onChange={(e) => handleChange('showSearch', e.target.checked)} 
                            /> 
                            Barre de recherche dynamique
                        </label>
                    </div>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showDiscountFilters !== false} 
                                onChange={(e) => handleChange('showDiscountFilters', e.target.checked)} 
                            /> 
                            Filtres de remises (-20%, -30%, -50%)
                        </label>
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showPriceFilter !== false} 
                                onChange={(e) => handleChange('showPriceFilter', e.target.checked)} 
                            /> 
                            Filtre de budget maximum
                        </label>
                    </div>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showSort !== false} 
                                onChange={(e) => handleChange('showSort', e.target.checked)} 
                            /> 
                            Menu de tri (Remise, Prix croissant/décroissant)
                        </label>
                    </div>
                </div>
                <div className="toggle-row" style={{ marginTop: '1rem', padding: '10px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <label style={{ fontWeight: 'bold', color: '#1e40af' }}>
                        <input 
                            type="checkbox" 
                            checked={config.enableCatalogFallback !== false} 
                            onChange={(e) => handleChange('enableCatalogFallback', e.target.checked)} 
                        /> 
                        Recherche intelligente avec Fallback catalogue général (si aucun résultat en vente flash)
                    </label>
                </div>
            </div>
        </div>
    );
};
