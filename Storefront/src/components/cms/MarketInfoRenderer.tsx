"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin, Navigation, Info, Store } from 'lucide-react';
import { getShopApiUrl, getAssetUrl } from '@/lib/vendure/api-utils';
import { VendorProductCard } from '@/components/commerce/vendor-product-card';

interface MarketInfoProps {
    config: {
        id: string;
        name: string;
        slug: string;
        description?: string;
        latitude?: number;
        longitude?: number;
        radius?: number;
        image?: string;
        type?: 'MARKET' | 'NEIGHBORHOOD';
        location?: { id: string; name: string; type: string } | null;
        parent?: { id: string; name: string; type: string } | null;
    };
    showProducts?: boolean;
}

const isGif = (url: string | undefined | null) => url?.toLowerCase().endsWith('.gif');

export default function MarketInfoRenderer({ config, showProducts = true }: MarketInfoProps) {
    const { id, name, slug, description, latitude, longitude, radius, image, type = 'MARKET', location, parent } = config;
    
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [leafletReady, setLeafletReady] = useState(false);

    // Fetch resident/local vendors from shop API
    useEffect(() => {
        const fetchVendors = async () => {
            const variables = type === 'MARKET' ? { marketId: id } : { locationId: id };
            const query = `
                query GetLocalVendors($marketId: ID, $locationId: ID) {
                    vendors(
                        marketId: $marketId, 
                        locationId: $locationId, 
                        options: { filter: { status: { eq: "APPROVED" } } }
                    ) {
                        items {
                            id
                            name
                            latitude
                            longitude
                            address
                            rating
                            ratingCount
                            description
                            logo { preview }
                            coverImage { preview }
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

            try {
                const shopApiUrl = getShopApiUrl();
                const res = await fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, variables })
                });
                const result = await res.json();
                setVendors(result.data?.vendors?.items || []);
            } catch (err) {
                console.error('Error fetching vendors for local page:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchVendors();
    }, [id, type]);

    // Load Leaflet dynamically client-side
    useEffect(() => {
        if (typeof window === 'undefined' || !latitude || !longitude) return;

        if ((window as any).L) {
            setLeafletReady(true);
            return;
        }

        // CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            setLeafletReady(true);
        };
        document.body.appendChild(script);
    }, [latitude, longitude]);

    // Initialize map once Leaflet is ready and vendors are loaded
    useEffect(() => {
        if (!leafletReady || !latitude || !longitude || typeof window === 'undefined') return;
        const L = (window as any).L;
        if (!L) return;

        // Clean up previous map instance if any
        const mapContainer = document.getElementById('local-page-map');
        if (!mapContainer) return;
        
        // Remove existing map instance if it was already initialized
        if ((mapContainer as any)._leaflet_id) {
            return;
        }

        const map = L.map('local-page-map').setView([latitude, longitude], 15);

        setTimeout(() => {
            map.invalidateSize();
        }, 150);
        setTimeout(() => {
            map.invalidateSize();
        }, 450);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // Add circle representing the market/neighborhood area
        L.circle([latitude, longitude], {
            color: '#e31837',
            fillColor: '#e31837',
            fillOpacity: 0.1,
            radius: radius || 400
        }).addTo(map);

        // Primary marker at center
        const centerIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        L.marker([latitude, longitude], { icon: centerIcon }).addTo(map)
            .bindPopup(`<b>${name}</b><br/>${type === 'MARKET' ? 'Centre du Marché' : 'Quartier'}`)
            .openPopup();

        // Client / User position marker
        const clientIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const savedLocation = typeof window !== 'undefined' ? localStorage.getItem('ahizan_client_location') : null;
        if (savedLocation) {
            try {
                const loc = JSON.parse(savedLocation);
                if (loc.latitude && loc.longitude) {
                    L.marker([loc.latitude, loc.longitude], { icon: clientIcon }).addTo(map)
                        .bindPopup(`<b>Votre position</b><br/>${loc.name}`);
                }
            } catch (e) {
                console.error("Error parsing client location in market page map:", e);
            }
        }

        // Vendor markers
        const shopIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        vendors.forEach(v => {
            if (v.latitude && v.longitude) {
                L.marker([v.latitude, v.longitude], { icon: shopIcon }).addTo(map)
                    .bindPopup(`
                        <div class="p-1">
                            <b class="text-sm font-bold text-slate-900">${v.name}</b>
                            <p class="text-xs text-slate-600 my-1">${v.address || ''}</p>
                            <a href="/vendor/${v.id}" class="inline-block text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline mt-1">Visiter la boutique →</a>
                        </div>
                    `);
            }
        });
    }, [leafletReady, latitude, longitude, vendors, radius, name, type]);

    const parentLocationName = location?.name || parent?.name || '';
    const parentLocationType = location?.type || parent?.type || '';

    // Merge all products from all local vendors
    const allProducts = vendors.flatMap(v => (v.products || []).map((p: any) => ({
        ...p,
        vendorName: v.name,
        vendorId: v.id,
    })));

    return (
        <section className="py-10 max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Details Column */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            {type === 'MARKET' ? <Store className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
                        </div>
                        <div>
                            <span className="text-xs uppercase font-extrabold tracking-wider text-primary">
                                {type === 'MARKET' ? 'Marché Officiel' : 'Quartier / Zone'}
                            </span>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-tight mt-0.5">
                                {name}
                            </h1>
                        </div>
                    </div>

                    {description && (
                        <div className="flex flex-col gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Info className="w-4 h-4 text-slate-400" /> Description
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                {description}
                            </p>
                        </div>
                    )}

                    {parentLocationName && (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                            <span className="text-xs font-bold text-slate-400 uppercase">Localisation</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {parentLocationName} <span className="text-xs font-medium text-slate-400">({parentLocationType.toLowerCase()})</span>
                            </span>
                        </div>
                    )}

                    {latitude && longitude && (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                            <span className="text-xs font-bold text-slate-400 uppercase">Coordonnées GPS</span>
                            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                <Navigation className="w-3.5 h-3.5 text-slate-400" />
                                {latitude.toFixed(5)}, {longitude.toFixed(5)}
                            </span>
                        </div>
                    )}

                    {/* Resident Vendors Section */}
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h2 id="boutiques" className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Boutiques Résidentes
                            </h2>
                            <span className="px-2.5 py-1 text-xs font-extrabold rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                                {loading ? '...' : `${vendors.length} active(s)`}
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex flex-col gap-3">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
                                ))}
                            </div>
                        ) : vendors.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-slate-800/80 rounded-2xl">
                                <p className="text-xs text-slate-400 font-medium">Aucun vendeur enregistré dans cette zone pour le moment.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 font-sans">
                                {vendors.map(v => {
                                    const logoPreview = getAssetUrl(v.logo?.preview) || null;
                                    const isLogoGif = isGif(logoPreview);
                                    return (
                                        <Link key={v.id} href={`/vendor/${v.id}`} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800/50 transition-all no-underline text-inherit group">
                                            <div className="w-11 h-11 relative rounded-xl overflow-hidden bg-white border border-slate-200/65 flex-shrink-0 flex items-center justify-center">
                                                {logoPreview ? (
                                                    isLogoGif ? (
                                                        <img src={logoPreview} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    ) : (
                                                        <Image src={logoPreview} alt={v.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                                                    )
                                                ) : (
                                                    <span className="font-black text-lg text-primary/30 uppercase">{v.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors leading-tight">
                                                    {v.name}
                                                </h4>
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate block mt-0.5">
                                                    {v.address || 'Adresse non renseignée'}
                                                </span>
                                            </div>
                                            {v.rating != null && v.rating > 0 && (
                                                <div className="flex items-center gap-1 font-bold text-xs text-slate-700 dark:text-slate-300">
                                                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                                    {v.rating.toFixed(1)}
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Map Column */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {latitude && longitude ? (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm h-[500px] relative overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center mb-3 px-2">
                                <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    🗺️ Carte Interactive du Secteur
                                </h3>
                                <span className="text-xs font-semibold text-slate-400">
                                    Défilez et zoomez pour explorer les commerces
                                </span>
                            </div>
                            <div id="local-page-map" className="flex-1 rounded-2xl overflow-hidden shadow-inner border border-slate-100 z-10" />
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm h-[400px] flex items-center justify-center">
                            <p className="text-sm text-slate-400 font-medium">Carte non disponible (coordonnées GPS manquantes).</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Products Grid Section */}
            {showProducts && (
                <div className="mt-12 border-t border-slate-200/60 dark:border-slate-800/80 pt-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                        <div>
                            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase leading-none text-slate-950 dark:text-white">
                                Articles Disponibles à Proximité
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-2">
                                Achetez en direct avec paiement à la livraison depuis les boutiques de {name}.
                            </p>
                            <div className="h-1 w-16 bg-primary mt-3 rounded-full" />
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="aspect-[3/4] rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : allProducts.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <p className="text-sm text-slate-400 font-semibold">Aucun article disponible pour le moment dans ce secteur.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                            {allProducts.map(product => (
                                <VendorProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
