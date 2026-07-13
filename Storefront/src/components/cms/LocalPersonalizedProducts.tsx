"use client";

import React, { useState, useEffect } from 'react';
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { VendorProductCard } from '@/components/commerce/vendor-product-card';
import { Sparkles, MapPin, Store } from 'lucide-react';

interface LocalPersonalizedProductsProps {
    config?: {
        title?: string;
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
    const displaySubtitle = config?.subtitle || "Découvrez les articles disponibles à l'achat immédiat auprès des marchands de votre secteur.";
    const displayBadgeText = config?.badgeText || "Recommandation Locale";
    const limit = (config?.limit || config?.take) ? Number(config?.limit || config?.take) : 8;
    const layout = config?.layout || 'grid-4';
    const requireConfirmedLocation = config?.requireConfirmedLocation !== false; // true par défaut

    const marketIdFromConfig = config?.marketId;
    const locationIdFromConfig = config?.locationId;
    const isOverride = !!(marketIdFromConfig || locationIdFromConfig);

    const fetchLocalProducts = async () => {
        let variables: any = {};
        let displayName = '';

        if (isOverride) {
            if (marketIdFromConfig) {
                variables = { marketId: marketIdFromConfig };
                displayName = config?.marketName || '';
            } else {
                variables = { locationId: locationIdFromConfig };
                displayName = config?.locationName || '';
            }
        } else {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('ahizan_client_location') : null;
            if (!saved) {
                setProducts([]);
                setLocationName('');
                return;
            }
            try {
                const loc = JSON.parse(saved);
                displayName = loc.name;
                variables = loc.type === 'MARKET' ? { marketId: loc.id } : { locationId: loc.id };
            } catch (e) {
                console.error("Error parsing client location:", e);
                return;
            }
        }

        setLoading(true);
        try {
            setLocationName(displayName);

            const query = `
                query GetLocalProducts($marketId: ID, $locationId: ID) {
                    vendors(
                        marketId: $marketId, 
                        locationId: $locationId, 
                        options: { filter: { status: { eq: "APPROVED" } } }
                    ) {
                        items {
                            id
                            name
                            products {
                                id
                                name
                                slug
                                featuredAsset { preview }
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

            const shopApiUrl = getShopApiUrl();
            const res = await fetch(shopApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables })
            });
            const result = await res.json();
            const vendorsList = result.data?.vendors?.items || [];
            
            // Merge all products from local vendors
            const merged = vendorsList.flatMap((v: any) => (v.products || []).map((p: any) => ({
                ...p,
                vendorName: v.name,
                vendorId: v.id,
            })));
            
            setProducts(merged.slice(0, limit));
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
    }, [marketIdFromConfig, locationIdFromConfig, limit]);

    // Condition principale requise par le client : s'afficher SI ET SEULEMENT SI la position est confirmée
    // Sauf en mode prévisualisation CMS où on montre un aperçu à l'administrateur pour qu'il puisse configurer l'endroit et le style
    if (!locationName && !isOverride) {
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
        if (layout === 'carousel') {
            return (
                <div className="flex overflow-x-auto pb-6 gap-4 md:gap-6 custom-scrollbar snap-x snap-mandatory">
                    {products.map(product => (
                        <div key={product.id} className="w-[240px] sm:w-[260px] md:w-[280px] shrink-0 snap-start">
                            <VendorProductCard product={product} />
                        </div>
                    ))}
                </div>
            );
        }
        if (layout === 'grid-3') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {products.map(product => (
                        <VendorProductCard key={product.id} product={product} />
                    ))}
                </div>
            );
        }
        if (layout === 'compact') {
            return (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {products.map(product => (
                        <VendorProductCard key={product.id} product={product} />
                    ))}
                </div>
            );
        }
        // grid-4 par défaut
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {products.map(product => (
                    <VendorProductCard key={product.id} product={product} />
                ))}
            </div>
        );
    };

    return (
        <section className="py-10 max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 font-sans animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>{displayBadgeText}</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase leading-none text-slate-950 dark:text-white mt-1 flex items-center gap-2">
                        🛍️ {displayTitle} {locationName ? `(${locationName})` : ''}
                    </h2>
                    <p className="text-slate-550 dark:text-slate-400 font-medium text-sm mt-2">
                        {displaySubtitle}
                    </p>
                    <div className="h-1 w-16 bg-primary mt-3 rounded-full" />
                </div>
            </div>

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
