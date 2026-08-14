"use client";

import React from 'react';
import { TabbedProductGrid } from '@/components/cms/tabbed-product-grid';
import { FlashSaleSection } from '@/components/ahizan/FlashSaleSection';
import { LocalPersonalizedProducts } from '@/components/cms/LocalPersonalizedProducts';

export interface UniversalProductCollectionProps {
    experienceStrategy?: 'LOCAL_DISCOVERY' | 'FLASH_SALE' | 'HOME_FEED' | 'CATALOG' | string;
    title?: string;
    subtitle?: string;
    layout?: 'carousel' | 'grid' | string;
    columns?: number;
    cardStyle?: 'standard' | 'elevated' | 'minimal' | string;
    showCountdown?: boolean;
    endTime?: string;
    manualProductIds?: string[];
    collectionSlug?: string;
    tabs?: any[];
    [key: string]: any;
}

/**
 * Composant Rendu Visuel Unifié (UniversalProductCollection).
 * Remplaçant unique pour les grilles de produits et ventes flash.
 * Le composant reçoit les props visual & strategy et effectue le rendu réactif.
 */
export function UniversalProductCollection(props: UniversalProductCollectionProps) {
    const { experienceStrategy, title, subtitle, layout = 'carousel', columns = 4, cardStyle = 'standard' } = props;
    const cardTheme = props.cardTheme || props.cardStyle || 'default';

    // Ventes Flash (Compte à rebours + campagne flash)
    if (experienceStrategy === 'FLASH_SALE' || props.showCountdown) {
        return <FlashSaleSection config={{ ...props, cardTheme }} />;
    }

    // Recommandations géolocalisées dynamiques (GeoEngine) / Home Feed / Trending
    if (experienceStrategy === 'LOCAL_DISCOVERY' || experienceStrategy === 'HOME_FEED' || experienceStrategy === 'TRENDING') {
        return <LocalPersonalizedProducts config={{ ...props, cardTheme }} />;
    }

    // Grille de produits universelle (avec ou sans onglets)
    const tabsConfig = props.tabs && props.tabs.length > 0 ? props.tabs : [{
        id: 'universal-tab',
        label: title || 'Produits',
        filterType: props.filterType || 'LATEST',
        collectionSlug: props.collectionSlug,
        collectionIds: props.mixCollectionId ? [props.mixCollectionId] : (props.collectionIds || []),
        manualProductIds: props.manualProductIds,
        selectionMode: props.selectionMode || 'COLLECTIONS',
        facetValueIds: props.facetValueIds,
        take: props.take || props.limit || 8
    }];

    return (
        <TabbedProductGrid
            title={title}
            subtitle={subtitle}
            badgeText={props.badgeText}
            badgeBgColor={props.badgeBgColor}
            badgeTextColor={props.badgeTextColor}
            headerStyle={props.headerStyle}
            layout={layout}
            columns={columns}
            cardStyle={cardTheme}
            tabs={tabsConfig}
            enableTabs={props.enableTabs}
        />
    );
}
