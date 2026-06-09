import React, { useState, useEffect } from 'react';
import { useEditor } from '../hooks/EditorContext';
import { fetchGraphQL } from '../../lib/utils';

const FETCH_COLLECTIONS = `query { cmsCollectionsTree { id name slug children { id name slug } } }`;
const FETCH_PRODUCTS = `query { products(options: { take: 20 }) { items { productId: id productName: name slug } } }`;

export const LivePreview = () => {
    const [viewPort, setViewPort] = useState<'desktop' | 'mobile'>('desktop');
    const { activeHabillage, previewVersion, activePageSlug } = useEditor();

    // For collection/product preview selection
    const [collections, setCollections] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedPreviewSlug, setSelectedPreviewSlug] = useState<string>('');

    // Load collections/products when page type changes
    useEffect(() => {
        setSelectedPreviewSlug('');
        if (activePageSlug === 'category') {
            fetchGraphQL(FETCH_COLLECTIONS).then(data => {
                const tree = data?.cmsCollectionsTree || [];
                const flat: any[] = [];
                tree.forEach((c: any) => {
                    flat.push(c);
                    (c.children || []).forEach((ch: any) => flat.push(ch));
                });
                setCollections(flat);
                if (flat.length > 0) {
                    setSelectedPreviewSlug(flat[0].slug);
                }
            }).catch(() => {});
        } else if (activePageSlug === 'product') {
            const apiUrl = window.location.origin.replace(/:(5173|5174|5175|4200)/, ':3000') + '/shop-api';
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: FETCH_PRODUCTS })
            })
            .then(res => res.json())
            .then(result => {
                const items = result.data?.products?.items || [];
                setProducts(items);
                if (items.length > 0) {
                    setSelectedPreviewSlug(items[0].slug);
                }
            })
            .catch(() => {});
        }
    }, [activePageSlug]);

    // Use the storefront URL injected at build time from STOREFRONT_URL env var
    const getStorefrontOrigin = (): string => {
        const envUrl = (import.meta as any).env?.VITE_STOREFRONT_URL;
        if (envUrl) return envUrl;

        if (typeof window !== 'undefined') {
            const host = window.location.hostname;
            const parts = host.split('.');
            if (parts.length >= 2 && (parts[0] === 'administrator' || parts[0] === 'api')) {
                return `${window.location.protocol}//${parts.slice(1).join('.')}`;
            }
            if (host === 'localhost' || host === '127.0.0.1') {
                return `http://${host}:3001`;
            }
        }
        return 'https://ahizan.com';
    };

    const storefrontOrigin = getStorefrontOrigin();

    // Build preview URL based on active page type
    const getPreviewUrl = (): string => {
        if (activePageSlug === 'category') {
            if (selectedPreviewSlug) return `${storefrontOrigin}/collection/${selectedPreviewSlug}${activeHabillage ? `?presetId=${activeHabillage.id}&v=${previewVersion}` : ''}`;
            return ''; // Do not fall back to home page if no category selected
        }
        if (activePageSlug === 'product') {
            if (selectedPreviewSlug) return `${storefrontOrigin}/product/${selectedPreviewSlug}${activeHabillage ? `?presetId=${activeHabillage.id}&v=${previewVersion}` : ''}`;
            return ''; // Do not fall back to home page if no product selected
        }
        // Home page: use habillage preview
        if (activeHabillage) {
            return `${storefrontOrigin}/preview?presetId=${activeHabillage.id}&v=${previewVersion}`;
        }
        return '';
    };

    const previewUrl = getPreviewUrl();

    const getPageLabel = () => {
        switch (activePageSlug) {
            case 'category': return 'CATÉGORIE';
            case 'product': return 'PRODUIT';
            default: return 'ACCUEIL';
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
            <div style={{ 
                padding: '0.75rem 1.5rem', 
                background: 'white', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                        fontSize: '0.6rem', 
                        fontWeight: 700, 
                        color: '#fff', 
                        background: activePageSlug === 'home' ? '#3b82f6' : activePageSlug === 'category' ? '#8b5cf6' : '#f59e0b',
                        padding: '2px 8px', 
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                    }}>
                        {getPageLabel()}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                        {activePageSlug === 'home' && activeHabillage ? `APERÇU — ${activeHabillage.name}` : 'APERÇU EN DIRECT'}
                    </span>
                </div>
                
                {/* Collection/Product selector */}
                {activePageSlug === 'category' && collections.length > 0 && (
                    <select 
                        value={selectedPreviewSlug} 
                        onChange={(e) => setSelectedPreviewSlug(e.target.value)}
                        style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontWeight: 600, color: '#334155' }}
                    >
                        {collections.map(c => (
                            <option key={c.id} value={c.slug}>{c.name}</option>
                        ))}
                    </select>
                )}
                {activePageSlug === 'product' && products.length > 0 && (
                    <select 
                        value={selectedPreviewSlug} 
                        onChange={(e) => setSelectedPreviewSlug(e.target.value)}
                        style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', border: '1px solid #d1d5db', fontWeight: 600, color: '#334155' }}
                    >
                        {products.map((p: any) => (
                            <option key={p.productId} value={p.slug}>{p.productName}</option>
                        ))}
                    </select>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                    <button 
                        onClick={() => setViewPort('desktop')}
                        style={{
                            padding: '4px 12px',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: viewPort === 'desktop' ? 'white' : 'transparent',
                            color: viewPort === 'desktop' ? '#0f172a' : '#94a3b8',
                            boxShadow: viewPort === 'desktop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        🖥️ Ordinateur
                    </button>
                    <button 
                        onClick={() => setViewPort('mobile')}
                        style={{
                            padding: '4px 12px',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            background: viewPort === 'mobile' ? 'white' : 'transparent',
                            color: viewPort === 'mobile' ? '#0f172a' : '#94a3b8',
                            boxShadow: viewPort === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                    >
                        📱 Mobile
                    </button>
                </div>

                {previewUrl && (
                    <a 
                        href={previewUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ fontSize: '0.7rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}
                    >
                        Ouvrir dans un nouvel onglet ↗
                    </a>
                )}
            </div>

            <div style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                padding: viewPort === 'mobile' ? '2rem' : '0',
                overflow: 'auto',
                transition: 'all 0.3s ease',
                height: '100%'
            }}>
                {!previewUrl ? (
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        color: '#94a3b8',
                        gap: '1rem'
                    }}>
                        <div style={{ fontSize: '3rem', opacity: 0.3 }}>
                            {activePageSlug === 'category' ? '📂' : activePageSlug === 'product' ? '🛍️' : '🎨'}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                            {activePageSlug === 'home' 
                                ? "Sélectionnez un habillage pour voir l'aperçu"
                                : `Aucun ${activePageSlug === 'category' ? 'collection' : 'produit'} disponible pour la prévisualisation`
                            }
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                            {activePageSlug === 'home' 
                                ? "Créez ou ouvrez un habillage dans la barre latérale"
                                : "Ajoutez des données dans votre catalogue Vendure"
                            }
                        </div>
                    </div>
                ) : (
                    <iframe 
                        key={`${activePageSlug}-${selectedPreviewSlug}-${previewVersion}`}
                        src={previewUrl}
                        scrolling="yes"
                        style={{
                            width: viewPort === 'desktop' ? '100%' : '375px',
                            height: viewPort === 'desktop' ? '100%' : '667px',
                            border: viewPort === 'mobile' ? '12px solid #0f172a' : 'none',
                            borderRadius: viewPort === 'mobile' ? '32px' : '0',
                            background: 'white',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            transition: 'all 0.3s ease'
                        }}
                        title="Ahizan Live Preview"
                    />
                )}
            </div>
        </div>
    );
};
