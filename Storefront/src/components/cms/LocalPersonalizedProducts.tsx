"use client";

import React, { useState, useEffect } from 'react';
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { VendorProductCard } from '@/components/commerce/vendor-product-card';
import { Sparkles, MapPin, Store } from 'lucide-react';

interface LocalPersonalizedProductsProps {
    config?: {
        title?: string;
        subtitle?: string;
        limit?: number;
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

    const displayTitle = config?.title || "Produits à Proximité";
    const displaySubtitle = config?.subtitle || "Découvrez les articles disponibles à l'achat immédiat auprès des marchands de votre secteur.";
    const limit = config?.limit ? Number(config.limit) : 8;

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
    }, [marketIdFromConfig, locationIdFromConfig]);

    if (!locationName && !isOverride) {
        return null;
    }

    return (
        <section className="py-10 max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 font-sans animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Recommandation Locale</span>
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map(product => (
                        <VendorProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </section>
    );
}
