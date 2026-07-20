import { defineDashboardExtension } from '@vendure/dashboard';
import React from 'react';
import { BulkImportPage } from './BulkImportPage';

export default defineDashboardExtension({
  routes: [
    {
      path: 'bulk-import',
      component: BulkImportPage,
      navMenuItem: {
        id: 'bulk-import',
        title: 'Import/Export en masse',
        sectionId: 'catalog-section',
        url: '/bulk-import',
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
