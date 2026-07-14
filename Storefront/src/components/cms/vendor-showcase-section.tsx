'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Loader2 } from 'lucide-react';
import { getShopApiUrl, getAssetUrl } from '@/lib/vendure/api-utils';

interface VendorItem {
    id: string;
    name: string;
    logoUrl?: string;
    zone?: string;
    rating?: number;
    ratingCount?: number;
}

interface VendorShowcaseProps {
    title?: string;
    description?: string;
    layout?: 'grid' | 'carousel';
    take?: number;
}

const isGif = (url: string | undefined | null) => url?.toLowerCase().endsWith('.gif');

export function VendorShowcaseSection({
    title = "Nos Vendeurs",
    description,
    layout = 'grid',
    take = 8,
}: VendorShowcaseProps) {
    const [vendors, setVendors] = useState<VendorItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchVendorsList = async () => {
        try {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('ahizan_client_location') : null;
            const variables: any = {
                options: {
                    take,
                    filter: { status: { eq: 'APPROVED' } },
                }
            };

            if (saved) {
                try {
                    const loc = JSON.parse(saved);
                    if (loc.type === 'MARKET') {
                        variables.marketId = loc.id;
                    } else if (loc.type === 'NEIGHBORHOOD') {
                        variables.locationId = loc.id;
                    }
                    if (loc.latitude && loc.longitude) {
                        variables.latitude = loc.latitude;
                        variables.longitude = loc.longitude;
                    }
                } catch (e) {
                    console.error('Error parsing geolocation data', e);
                }
            }

            const query = `
                query GetVendorsList($options: VendorListOptions, $latitude: Float, $longitude: Float, $marketId: ID, $locationId: ID) {
                    vendors(options: $options, latitude: $latitude, longitude: $longitude, marketId: $marketId, locationId: $locationId) {
                        items {
                            id
                            name
                            zone
                            rating
                            ratingCount
                            logo { preview }
                        }
                    }
                }
            `;

            const shopApiUrl = getShopApiUrl();
            const res = await fetch(shopApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables }),
            });
            const data = await res.json();
            const items = (data.data?.vendors?.items || []).map((v: any) => ({
                id: v.id,
                name: v.name,
                zone: v.zone,
                rating: v.rating,
                ratingCount: v.ratingCount,
                logoUrl: getAssetUrl(v.logo?.preview) || null,
            }));
            setVendors(items);
        } catch (e) {
            console.error('[VENDOR_SHOWCASE] Failed to fetch vendors', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendorsList();
        
        // Listen to location changes to update showcase
        if (typeof window !== 'undefined') {
            window.addEventListener('ahizan_location_changed', fetchVendorsList);
            return () => {
                window.removeEventListener('ahizan_location_changed', fetchVendorsList);
            };
        }
    }, [take]);

    if (loading) {
        return (
            <section className="py-14 container mx-auto px-4">
                <div className="flex justify-between items-end mb-10">
                    <div className="h-10 w-48 bg-slate-100 rounded animate-pulse" />
                </div>
                <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
                    ))}
                </div>
            </section>
        );
    }

    if (!vendors || vendors.length === 0) return null;

    return (
        <section className="py-14 container mx-auto px-4 font-sans">
            <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                <div>
                    {title && <h2 className="text-xl md:text-2xl font-black tracking-tight mb-2 uppercase leading-none text-slate-950 dark:text-white">{title}</h2>}
                    {description && <p className="text-muted-foreground font-medium text-sm max-w-xl">{description}</p>}
                    <div className="h-1 w-16 bg-primary mt-4 rounded-full" />
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-full px-6 font-bold hover:bg-primary hover:text-white transition-all">
                    <Link href="/vendors">Voir tous →</Link>
                </Button>
            </div>

            <div className={`grid gap-4 md:gap-6 ${layout === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
                {vendors.map((vendor) => {
                    const isLogoGif = isGif(vendor.logoUrl);
                    return (
                        <Link key={vendor.id} href={`/vendor/${vendor.id}`}
                            className="flex flex-col items-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 transition-all group no-underline text-inherit">
                            <div className="w-20 h-20 relative mb-4 bg-muted rounded-full overflow-hidden border-4 border-muted group-hover:border-primary/10 transition-colors">
                                {vendor.logoUrl ? (
                                    isLogoGif ? (
                                        <img src={vendor.logoUrl} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <Image src={vendor.logoUrl} alt={vendor.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                    )
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl font-black text-primary/30 bg-primary/5 uppercase">
                                        {vendor.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-center group-hover:text-primary transition-colors text-sm leading-tight mb-1">{vendor.name}</h3>
                            {vendor.zone && (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
                                    <MapPin className="w-3 h-3" />{vendor.zone}
                                </span>
                            )}
                            {vendor.rating != null && vendor.rating > 0 && (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    {vendor.rating.toFixed(1)}
                                    {vendor.ratingCount != null && <span>({vendor.ratingCount})</span>}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
