"use client";

import React from 'react';
import { CategoryGrid } from '@/components/cms/category-grid';

export interface CategoryCollectionProps {
    title?: string;
    subtitle?: string;
    description?: string;
    layout?: 'carousel' | 'grid' | string;
    columnsDesktop?: number;
    columnsMobile?: number;
    limit?: number;
    categories?: any[];
    [key: string]: any;
}

/**
 * Composant Rendu Visuel Unifié des Catégories (CategoryCollection).
 * Remplaçant unique pour les grilles et carrousels de catégories.
 */
export function CategoryCollection(props: CategoryCollectionProps) {
    const { title, subtitle, description, layout = 'carousel', categories, limit = 12 } = props;

    const validLayout = (layout === 'grid' || layout === 'list' || layout === 'carousel') ? layout : 'carousel';

    return (
        <CategoryGrid
            title={title}
            description={subtitle || description}
            layout={validLayout}
            categories={categories}
            take={limit}
        />
    );
}
