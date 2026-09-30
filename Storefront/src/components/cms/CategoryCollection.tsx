"use client";

import React from 'react';
import { CategoryGrid } from '@/components/cms/category-grid';

export interface CategoryCollectionProps {
    title?: string;
    subtitle?: string;
    description?: string;
    layout?: 'carousel' | 'grid' | 'list' | string;
    columnsDesktop?: number;
    columnsMobile?: number;
    limit?: number;
    take?: number;
    categories?: any[];
    autoplaySpeed?: number | string;
    cardStyle?: string;
    [key: string]: any;
}

/**
 * Composant Rendu Visuel Unifié des Catégories (CategoryCollection).
 * Remplaçant unique pour les grilles et carrousels de catégories.
 */
export function CategoryCollection(props: CategoryCollectionProps) {
    const { 
        title, 
        subtitle, 
        description, 
        layout = 'carousel', 
        categories, 
        limit = 12,
        take,
        autoplaySpeed = 0,
        cardStyle = 'standard',
        columnsDesktop = 6,
    } = props;

    const validLayout = (layout === 'grid' || layout === 'list' || layout === 'carousel') ? layout : 'carousel';

    return (
        <CategoryGrid
            title={title}
            description={subtitle || description}
            layout={validLayout as any}
            categories={categories}
            take={take || limit}
            autoplaySpeed={autoplaySpeed}
            cardStyle={cardStyle}
            columnsDesktop={columnsDesktop}
        />
    );
}

export default CategoryCollection;
