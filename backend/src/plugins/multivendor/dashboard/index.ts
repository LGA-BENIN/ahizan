import { defineDashboardExtension } from '@vendure/dashboard';
import { VendorListComponent } from './vendors-list';
import { VendorDetailComponent } from './vendor-detail';
import { ProductListComponent } from './products-list';

export default defineDashboardExtension({
    id: 'multivendor',
    routes: [
        {
            path: 'vendors',
            component: VendorListComponent,
            navMenuItem: {
                id: 'vendors',
                title: 'Vendors',
                sectionId: 'marketplace',
                routerLink: ['/extensions', 'multivendor', 'vendors'],
            },
        },
        {
            path: 'vendors/:id',
            component: VendorDetailComponent,
        },
    ],
    navSections: [
        {
            id: 'marketplace',
            title: 'Marketplace',
        },
    ],
});
