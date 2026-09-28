'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MasterProductCard } from './master-product-card';
import { Pagination } from '@/components/shared/pagination';
import { SortDropdown } from './sort-dropdown';
import { LottieSearchEmpty } from '@/components/shared/animations/LottieSearchEmpty';
import { processAndResolveDisplayItems, DisplayEngineContext } from '@/lib/vendure/display-engine';
import { useLocation } from '@/contexts/location-context';

interface ReactiveProductGridProps {
    initialItems: any[];
    currentPage: number;
    take: number;
    columns?: number;
    config?: any;
    minPrice?: number;
    maxPrice?: number;
    initialLocation?: any;
}

export function ReactiveProductGrid({
    initialItems,
    currentPage,
    take,
    columns = 3,
    config,
    minPrice,
    maxPrice,
    initialLocation,
}: ReactiveProductGridProps) {
    const { selectedLocation } = useLocation();
    const [activeLocation, setActiveLocation] = useState<any>(selectedLocation || initialLocation);

    useEffect(() => {
        if (selectedLocation) {
            setActiveLocation(selectedLocation);
        }
    }, [selectedLocation]);

    useEffect(() => {
        const handleLocationChange = () => {
            try {
                const stored = localStorage.getItem('ahizan_client_location');
                if (stored) {
                    setActiveLocation(JSON.parse(stored));
                } else {
                    setActiveLocation(null);
                }
            } catch {}
        };
        window.addEventListener('ahizan_location_changed', handleLocationChange);
        return () => window.removeEventListener('ahizan_location_changed', handleLocationChange);
    }, []);

    // Live re-score items whenever selectedLocation changes on client
    const items = useMemo(() => {
        const displayContext: DisplayEngineContext = {
            pageType: 'COLLECTION',
            userLocation: activeLocation,
            userLat: activeLocation?.latitude ? Number(activeLocation.latitude) : undefined,
            userLon: activeLocation?.longitude ? Number(activeLocation.longitude) : undefined,
            marketId: activeLocation?.marketId ? String(activeLocation.marketId) : undefined,
            locationId: activeLocation?.geoZoneId || activeLocation?.id ? String(activeLocation.geoZoneId || activeLocation.id) : undefined,
            communeName: activeLocation?.commune || activeLocation?.name,
            maxVariantsPerCentralProduct: config?.maxVariantsPerCentralProduct || 2,
            maxItemsPerVendor: config?.maxItemsPerVendor || 4,
            boostCertifiedVendors: true,
        };

        let resolved = processAndResolveDisplayItems(initialItems, displayContext);

        if (minPrice !== undefined || maxPrice !== undefined) {
            resolved = resolved.filter((p: any) => {
                const price = p.price || 0;
                if (minPrice !== undefined && price < minPrice) return false;
                if (maxPrice !== undefined && price > maxPrice) return false;
                return true;
            });
        }

        return resolved;
    }, [initialItems, activeLocation, config, minPrice, maxPrice]);

    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / take);

    if (!items.length) {
        return (
            <div className="text-center py-12 flex flex-col items-center">
                <div className="w-48 h-48 mb-2 flex items-center justify-center">
                    <LottieSearchEmpty />
                </div>
                <p className="text-muted-foreground text-sm font-medium">Aucun produit trouvé</p>
            </div>
        );
    }

    const gridCols = {
        2: 'lg:grid-cols-2',
        3: 'lg:grid-cols-3',
        4: 'lg:grid-cols-4',
        5: 'lg:grid-cols-5',
    }[columns as 2 | 3 | 4 | 5] || 'lg:grid-cols-3';

    const pagedItems = useMemo(() => {
        const start = (currentPage - 1) * take;
        return items.slice(start, start + take);
    }, [items, currentPage, take]);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {totalItems} {totalItems === 1 ? 'produit' : 'produits'}
                    {activeLocation?.name ? ` • Triés pour ${activeLocation.name}` : ''}
                </p>
                <SortDropdown />
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-3 ${gridCols} gap-3 sm:gap-4 transition-all duration-300`}>
                {pagedItems.map((product, i) => (
                    <MasterProductCard
                        key={product.id || `${product.productId}-${product.productVariantId || i}`}
                        item={product}
                        config={config}
                    />
                ))}
            </div>

            {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} />
            )}
        </div>
    );
}
