import { defineDashboardExtension } from '@vendure/dashboard';
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GeoZoneManager } from './views/GeoZoneManager';
import { MarketManager } from './views/MarketManager';
import { DeliveryZoneManager } from './views/DeliveryZoneManager';
import { ImportManager } from './views/ImportManager';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const GeoEngineControlPanel = () => {
    const [activeTab, setActiveTab] = useState<'HIERARCHY' | 'MARKETS' | 'DELIVERY' | 'IMPORTS'>('HIERARCHY');

    const tabs = [
        { id: 'HIERARCHY', label: '🌍 Hiérarchie administrative', icon: '🗺️' },
        { id: 'MARKETS', label: '🏪 Marchés commerciaux', icon: '🛍️' },
        { id: 'DELIVERY', label: '🚚 Zones de livraison', icon: '📦' },
        { id: 'IMPORTS', label: '📥 Moteurs d\'importation', icon: '💾' }
    ] as const;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                <div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📡 Geo Engine Control Center
                    </h1>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0 0' }}>Gestion cartographique, administrative et logistique d'Ahizan</p>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', gap: '8px' }}>
                {tabs.map(tab => {
                    const isSelected = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: '14px 16px',
                                border: 'none',
                                background: 'none',
                                borderBottom: isSelected ? '2px solid #4f46e5' : '2px solid transparent',
                                color: isSelected ? '#4f46e5' : '#64748b',
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                outline: 'none'
                            }}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {activeTab === 'HIERARCHY' && <GeoZoneManager />}
                {activeTab === 'MARKETS' && <MarketManager />}
                {activeTab === 'DELIVERY' && <DeliveryZoneManager />}
                {activeTab === 'IMPORTS' && <ImportManager />}
            </div>
        </div>
    );
};

const WrappedGeoEngine = () => (
    <QueryClientProvider client={queryClient}>
        <GeoEngineControlPanel />
    </QueryClientProvider>
);

export default defineDashboardExtension({
    routes: [
        {
            path: 'geo-engine',
            component: WrappedGeoEngine,
            navMenuItem: {
                id: 'geo-engine-menu',
                sectionId: 'geo-engine-section',
                url: '/geo-engine',
            },
        },
    ],
    navSections: [
        {
            id: 'geo-engine-section',
            title: 'Geo Engine',
        },
    ],
});
