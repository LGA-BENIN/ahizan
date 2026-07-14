"use client";

import React, { useState, useEffect } from 'react';
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { VendorProductCard } from '@/components/commerce/vendor-product-card';
import { Sparkles, MapPin, Store } from 'lucide-react';

interface LocalPersonalizedProductsProps {
    config?: {
        title?: string;
        icon?: string;
        subtitle?: string;
        badgeText?: string;
        limit?: number;
        take?: number;
        layout?: string;
        requireConfirmedLocation?: boolean;
        marketId?: string;
        locationId?: string;
        marketName?: string;
        locationName?: string;

        // Advanced controls
        textAlign?: string;
        titleColor?: string;
        subtitleColor?: string;
        badgeBgColor?: string;
        badgeTextColor?: string;
        cardTheme?: string;
        topLeftBadge?: string;
        topRightBadge?: string;
        bottomLeftBadge?: string;
        bottomRightBadge?: string;
        mixCollectionId?: string;
        mixMode?: string;
        interleaveSchema?: string;
        headerStyle?: string;
    };
}

export function LocalPersonalizedProducts({ config }: LocalPersonalizedProductsProps = {}) {
    const [products, setProducts] = useState<any[]>([]);
    const [locationName, setLocationName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [isCmsPreview, setIsCmsPreview] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const preview = window.location.search.includes('presetId') || window.location.search.includes('v=') || window.parent !== window;
            setIsCmsPreview(preview);
        }
    }, []);

    const displayTitle = config?.title || "Produits à Proximité";
    const displayIcon = config?.icon || '🛍️';
    const displaySubtitle = config?.subtitle || "Découvrez les articles disponibles à l'achat immédiat auprès des marchands de votre secteur.";
    const displayBadgeText = config?.badgeText || "Recommandation Locale";
    const limit = (config?.limit || config?.take) ? Number(config?.limit || config?.take) : 8;
    const layout = config?.layout || 'grid-4';
    const requireConfirmedLocation = config?.requireConfirmedLocation !== false; // true par défaut

    // Advanced configs
    const textAlign = config?.textAlign || 'left';
    const titleColor = config?.titleColor || '';
    const subtitleColor = config?.subtitleColor || '';
    const badgeBgColor = config?.badgeBgColor || '#e31837';
    const badgeTextColor = config?.badgeTextColor || '#ffffff';

    const marketIdFromConfig = config?.marketId;
    const locationIdFromConfig = config?.locationId;
    const isOverride = !!(marketIdFromConfig || locationIdFromConfig);

    const fetchLocalProducts = async () => {
        let variables: any = {};
        let displayName = '';
        let hasLocation = false;

        if (isOverride) {
            hasLocation = true;
            if (marketIdFromConfig) {
                variables = { marketId: marketIdFromConfig };
                displayName = config?.marketName || '';
            } else {
                variables = { locationId: locationIdFromConfig };
                displayName = config?.locationName || '';
            }
        } else {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('ahizan_client_location') : null;
            if (saved) {
                try {
                    const loc = JSON.parse(saved);
                    displayName = loc.name;
                    variables = loc.type === 'MARKET' ? { marketId: loc.id } : { locationId: loc.id };
                    hasLocation = true;
                } catch (e) {
                    console.error("Error parsing client location:", e);
                }
            }
        }

        setLoading(true);
        try {
            setLocationName(displayName);

            const shopApiUrl = getShopApiUrl();
            let localProductsList: any[] = [];

            if (hasLocation || !requireConfirmedLocation) {
                const localQuery = `
                    query GetLocalProducts($marketId: ID, $locationId: ID) {
                        vendors(
                            marketId: $marketId, 
                            locationId: $locationId, 
                            options: { filter: { status: { eq: "APPROVED" } } }
                        ) {
                            items {
                                id
                                name
                                physicalMarket { id name }
                                location { id name }
                                products {
                                    id
                                    name
                                    slug
                                    featuredAsset { preview }
                                    collections { id }
                                    variants {
                                        id
                                        priceWithTax
                                        customFields {
                                            compareAtPrice
                                            onPromotion
                                            promotionalPrice
                                        }
                                    }
                                }
                            }
                        }
                    }
                `;

                const resLocal = await fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: localQuery, variables })
                });
                const resultLocal = await resLocal.json();
                const vendorsList = resultLocal.data?.vendors?.items || [];
                
                localProductsList = vendorsList.flatMap((v: any) => (v.products || []).map((p: any) => ({
                    ...p,
                    vendorName: v.name,
                    vendorId: v.id,
                    marketName: v.physicalMarket?.name,
                    marketId: v.physicalMarket?.id,
                    locationName: v.location?.name,
                    locationId: v.location?.id,
                })));
            }

            // 2. Fetch Collection Products if mixing is requested
            let collectionProductsList: any[] = [];
            const mixCollectionId = config?.mixCollectionId;
            const mixMode = config?.mixMode || 'none';

            if (mixCollectionId && mixMode !== 'none') {
                const collectionQuery = `
                    query GetProductsForMix {
                        products(options: { take: 100 }) {
                            items {
                                id
                                name
                                slug
                                featuredAsset { preview }
                                collections { id }
                                variants {
                                    id
                                    priceWithTax
                                    customFields {
                                        compareAtPrice
                                        onPromotion
                                        promotionalPrice
                                    }
                                }
                                customFields {
                                    vendor {
                                        id
                                        name
                                        physicalMarket { id name }
                                        location { id name }
                                    }
                                }
                            }
                        }
                    }
                `;
                const resCol = await fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: collectionQuery })
                });
                const resultCol = await resCol.json();
                const allProducts = resultCol.data?.products?.items || [];
                
                // Filter products that belong to the collection
                collectionProductsList = allProducts.filter((p: any) => 
                    (p.collections || []).some((c: any) => String(c.id) === String(mixCollectionId))
                ).map((p: any) => ({
                    ...p,
                    vendorName: p.customFields?.vendor?.name,
                    vendorId: p.customFields?.vendor?.id,
                    marketName: p.customFields?.vendor?.physicalMarket?.name,
                    marketId: p.customFields?.vendor?.physicalMarket?.id,
                    locationName: p.customFields?.vendor?.location?.name,
                    locationId: p.customFields?.vendor?.location?.id,
                }));
            }

            // 3. Process according to mixMode
            let finalProducts = [];
            if (mixCollectionId && mixMode !== 'none') {
                if (mixMode === 'local-only-in-collection') {
                    // Only keep local products that are in the collection
                    finalProducts = localProductsList.filter((lp: any) => 
                        (lp.collections || []).some((c: any) => String(c.id) === String(mixCollectionId))
                    );
                } else if (mixMode === 'fallback') {
                    // Fallback to collection products if no local products found
                    finalProducts = localProductsList.length > 0 ? localProductsList : collectionProductsList;
                } else if (mixMode === 'hybrid') {
                    // Show local products first, then fill rest with collection products
                    const localIds = new Set(localProductsList.map((p: any) => p.id));
                    const filled = [...localProductsList];
                    for (const cp of collectionProductsList) {
                        if (filled.length >= limit) break;
                        if (!localIds.has(cp.id)) {
                            filled.push(cp);
                        }
                    }
                    finalProducts = filled;
                } else if (mixMode === 'mix-interleaved') {
                    // Interweave them (e.g. 2:1 -> 2 local, 1 collection)
                    const schema = config?.interleaveSchema || "2:1";
                    const [localCount, collectionCount] = schema.split(':').map(Number);
                    const localL = isNaN(localCount) ? 2 : localCount;
                    const colL = isNaN(collectionCount) ? 1 : collectionCount;

                    let localIdx = 0;
                    let collectionIdx = 0;
                    const weaved = [];

                    while (weaved.length < limit && (localIdx < localProductsList.length || collectionIdx < collectionProductsList.length)) {
                        // Add local products
                        for (let i = 0; i < localL && localIdx < localProductsList.length && weaved.length < limit; i++) {
                            weaved.push(localProductsList[localIdx++]);
                        }
                        // Add collection products
                        for (let i = 0; i < colL && collectionIdx < collectionProductsList.length && weaved.length < limit; i++) {
                            const cp = collectionProductsList[collectionIdx++];
                            if (!weaved.some(p => p.id === cp.id)) {
                                weaved.push(cp);
                            } else {
                                i--; // skip duplicate and search next
                            }
                        }
                    }
                    finalProducts = weaved;
                }
            } else {
                // Local only
                finalProducts = localProductsList;
            }

            setProducts(finalProducts.slice(0, limit));
        } catch (err) {
            console.error('Error fetching personalized local products:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocalProducts();

        if (typeof window !== 'undefined') {
            window.addEventListener('ahizan_location_changed', fetchLocalProducts);
            return () => {
                window.removeEventListener('ahizan_location_changed', fetchLocalProducts);
            };
        }
    }, [marketIdFromConfig, locationIdFromConfig, limit, config?.mixCollectionId, config?.mixMode, config?.interleaveSchema]);

    // Show even without location if we have a collection fallback/mix configured
    const hasCollectionFallback = !!(config?.mixCollectionId && config?.mixMode && config?.mixMode !== 'none');

    // Condition principale requise par le client : s'afficher SI ET SEULEMENT SI la position est confirmée
    // Sauf en mode prévisualisation CMS où on montre un aperçu à l'administrateur pour qu'il puisse configurer l'endroit et le style
    if (!locationName && !isOverride && !hasCollectionFallback) {
        if (isCmsPreview) {
            return (
                <section className="py-10 max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 font-sans animate-in fade-in duration-500">
                    <div className="p-8 rounded-[2rem] border-2 border-dashed border-primary/60 bg-primary/5 text-center transition-all">
                        <div className="flex items-center justify-center gap-2 text-primary font-black uppercase text-xs tracking-wider mb-2">
                            <Sparkles className="w-4 h-4" />
                            <span>{displayBadgeText}</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">
                            🛍️ {displayTitle} (Mode Prévisualisation CMS)
                        </h2>
                        <p className="text-muted-foreground font-medium text-sm mt-2 max-w-xl mx-auto">
                            {displaySubtitle}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold text-foreground shadow-sm">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>Disposition : <strong className="text-primary uppercase">{layout}</strong> ({limit} produits max)</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 py-2 px-4 rounded-lg inline-block border border-amber-500/20">
                                🔒 Remarque : Sur le site public, cette section est masquée par défaut et apparaîtra UNIQUEMENT lorsque le client aura confirmé sa position géographique.
                            </p>
                        </div>
                    </div>
                </section>
            );
        }
        if (requireConfirmedLocation) {
            return null;
        }
    }

    const renderProductsLayout = () => {
        let gridClass = "grid gap-6";
        if (layout === 'grid-3') {
            gridClass = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6";
        } else if (layout === 'grid-4') {
            gridClass = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6";
        } else if (layout === 'compact') {
            gridClass = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3";
        } else if (layout === 'list-split') {
            gridClass = "grid grid-cols-1 md:grid-cols-2 gap-4";
        }

        if (layout === 'carousel') {
            return (
                <div className="flex overflow-x-auto pb-6 gap-4 md:gap-6 custom-scrollbar snap-x snap-mandatory">
                    {products.map(product => (
                        <div key={product.id} className="w-[240px] sm:w-[260px] md:w-[280px] shrink-0 snap-start">
                            <VendorProductCard product={product} config={config} />
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className={gridClass}>
                {products.map(product => (
                    <VendorProductCard key={product.id} product={product} config={config} />
                ))}
            </div>
        );
    };

    const alignClass = textAlign === 'center' ? 'text-center items-center justify-center' : textAlign === 'right' ? 'text-right items-end' : 'text-left items-start';
    const headerStyle = config?.headerStyle || 'smart_cart';

    return (
        <section className="py-10 max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 font-sans animate-in fade-in duration-500">
            {headerStyle === 'standard' && (
                <div className={`flex flex-col ${alignClass} mb-8 gap-1`}>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2" style={{ color: titleColor || undefined }}>
                        <span>{displayIcon}</span> {displayTitle}
                    </h2>
                    {displaySubtitle && (
                        <p className="font-medium text-sm text-muted-foreground mt-1 max-w-2xl" style={{ color: subtitleColor || undefined }}>
                            {displaySubtitle}
                        </p>
                    )}
                </div>
            )}
            {headerStyle === 'bordered' && (
                <div className="mb-8 p-5 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-primary/10 text-primary">{displayBadgeText}</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2" style={{ color: titleColor || undefined }}>
                            <span>{displayIcon}</span> {displayTitle}
                        </h2>
                        {displaySubtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5" style={{ color: subtitleColor || undefined }}>{displaySubtitle}</p>}
                    </div>
                </div>
            )}
            {(headerStyle === 'smart_cart' || !['standard', 'bordered'].includes(headerStyle)) && (
                <div className={`flex flex-col ${alignClass} mb-8 gap-1`}>
                    <div 
                        className="flex items-center gap-1.5 font-extrabold uppercase text-[10px] tracking-wider px-3 py-1 rounded-full shadow-sm"
                        style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{displayBadgeText}</span>
                    </div>
                    <h2 
                        className="text-xl md:text-2xl font-black tracking-tight uppercase leading-tight mt-3 flex items-center gap-2"
                        style={{ color: titleColor || undefined }}
                    >
                        <span>{displayIcon}</span> {displayTitle}
                    </h2>
                    <p 
                        className="font-medium text-xs sm:text-sm mt-1 max-w-2xl"
                        style={{ color: subtitleColor || undefined }}
                    >
                        {displaySubtitle}
                    </p>
                    <div className="h-1 w-16 bg-primary mt-3 rounded-full" style={{ backgroundColor: badgeBgColor }} />
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-[3/4] rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-[2rem] border border-dashed border-border bg-muted/20 text-center max-w-xl mx-auto">
                    <Store className="w-10 h-10 text-muted-foreground/60 mb-3" />
                    <h3 className="text-sm font-bold text-foreground">Aucun article disponible dans cette zone</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
                        Les marchands de ce secteur (<strong>{locationName}</strong>) n'ont pas encore publié d'articles pour le moment.
                    </p>
                </div>
            ) : (
                renderProductsLayout()
            )}
        </section>
    );
}
