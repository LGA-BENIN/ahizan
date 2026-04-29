import { defineDashboardExtension } from '@vendure/dashboard';
import React from 'react';
import { CollectionFacetMapPage } from './CollectionFacetMapPage';

export default defineDashboardExtension({
    routes: [
        {
            path: 'collection-facets',
            component: CollectionFacetMapPage,
            navMenuItem: {
                id: 'collection-facet-map',
                sectionId: 'catalog-section',
                url: '/collection-facets',
            },
        },
    ],
    navSections: [
        {
            id: 'catalog-section',
            title: 'Catalogue',
        },
    ],
});
